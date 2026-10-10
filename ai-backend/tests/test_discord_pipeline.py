import unittest
import sys
import uuid
import time
import json
from pathlib import Path
from fastapi.testclient import TestClient

# Add src and parent to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app
from src.core.config import settings
from src.core.security import hash_password, create_access_token
from src.core.telemetry import quota_manager
from src.core.dag_engine import validate_pipeline_dag, execute_pipeline_dag
from src.db import execute_commit, query_one, query_all

class TestDiscordPipeline(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

        # 1. Tạo người dùng đã liên kết Discord
        self.user_id = str(uuid.uuid4())
        self.email = f"pipeline_tester_{uuid.uuid4().hex[:6]}@example.com"
        self.discord_id = f"discord_{uuid.uuid4().hex[:10]}"
        self.password = "SecureTestPass123!"
        self.hashed_pw = hash_password(self.password)

        execute_commit(
            """
            INSERT INTO users (id, email, full_name, hashed_password, status, discord_id, discord_username)
            VALUES (?, ?, 'Pipeline Tester', ?, 'ACTIVE', ?, 'PipelineUser#0001')
            """,
            (self.user_id, self.email, self.hashed_pw, self.discord_id)
        )
        self.token = create_access_token(self.user_id, self.email)
        self.cookies = {"access_token": self.token}

        # Khởi tạo Quota
        quota_manager.get_or_create_quota(self.user_id)

        # 2. Tạo mô hình ACTIVE và mô hình DISABLED để kiểm tra BR-037
        self.active_model_id = f"model-active-{uuid.uuid4().hex[:6]}"
        self.inactive_model_id = f"model-inactive-{uuid.uuid4().hex[:6]}"

        execute_commit(
            """
            INSERT INTO models (id, name, provider, status, is_default, context_window, max_tokens, supports_streaming)
            VALUES 
                (?, 'Test Active Model', 'google', 'ACTIVE', 0, 8192, 2048, 1),
                (?, 'Test Inactive Model', 'google', 'INACTIVE', 0, 8192, 2048, 1)
            """,
            (self.active_model_id, self.inactive_model_id)
        )

        # 3. Tạo người dùng CHƯA liên kết Discord
        self.unlinked_user_id = str(uuid.uuid4())
        self.unlinked_email = f"unlinked_pipe_{uuid.uuid4().hex[:6]}@example.com"
        execute_commit(
            """
            INSERT INTO users (id, email, full_name, hashed_password, status, discord_id, discord_username)
            VALUES (?, ?, 'Unlinked Pipeline User', ?, 'ACTIVE', NULL, NULL)
            """,
            (self.unlinked_user_id, self.unlinked_email, self.hashed_pw)
        )
        self.unlinked_token = create_access_token(self.unlinked_user_id, self.unlinked_email)
        self.unlinked_cookies = {"access_token": self.unlinked_token}

    def tearDown(self):
        # Dọn dẹp dữ liệu kiểm thử
        execute_commit(
            "DELETE FROM pipeline_executions WHERE user_id IN (?, ?)",
            (self.user_id, self.unlinked_user_id)
        )
        execute_commit(
            "DELETE FROM pipeline_edges WHERE pipeline_id IN (SELECT id FROM bot_pipelines WHERE user_id IN (?, ?))",
            (self.user_id, self.unlinked_user_id)
        )
        execute_commit(
            "DELETE FROM pipeline_nodes WHERE pipeline_id IN (SELECT id FROM bot_pipelines WHERE user_id IN (?, ?))",
            (self.user_id, self.unlinked_user_id)
        )
        execute_commit(
            "DELETE FROM bot_pipelines WHERE user_id IN (?, ?)",
            (self.user_id, self.unlinked_user_id)
        )
        execute_commit(
            "DELETE FROM models WHERE id IN (?, ?)",
            (self.active_model_id, self.inactive_model_id)
        )
        execute_commit(
            "DELETE FROM api_metric_logs WHERE user_id IN (?, ?)",
            (self.user_id, self.unlinked_user_id)
        )
        execute_commit(
            "DELETE FROM user_quotas WHERE user_id IN (?, ?)",
            (self.user_id, self.unlinked_user_id)
        )
        execute_commit(
            "DELETE FROM users WHERE id IN (?, ?)",
            (self.user_id, self.unlinked_user_id)
        )

    # ==========================================================================
    # TC-043: Thẩm định tính toàn vẹn DAG & Ngăn chặn vòng lặp vô hạn (BR-035, SEC-014, NFR-026)
    # ==========================================================================
    def test_tc043_pipeline_dag_validation_and_cycle_prevention(self):
        # 1. Đồ thị hợp lệ: Ingress -> Model -> Egress
        valid_nodes = [
            {"id": "n1", "node_type": "discord_ingress", "label": "Ingress", "config": {}},
            {"id": "n2", "node_type": "model_binding", "label": "Model", "config": {"model_id": self.active_model_id}},
            {"id": "n3", "node_type": "discord_egress", "label": "Egress", "config": {}}
        ]
        valid_edges = [
            {"id": "e1", "source_node_id": "n1", "target_node_id": "n2"},
            {"id": "e2", "source_node_id": "n2", "target_node_id": "n3"}
        ]

        t0 = time.perf_counter()
        is_valid, cycle_detected, cycle_path, topo_order, errors = validate_pipeline_dag(valid_nodes, valid_edges)
        val_time_ms = (time.perf_counter() - t0) * 1000.0

        self.assertTrue(is_valid)
        self.assertFalse(cycle_detected)
        self.assertEqual(len(errors), 0)
        self.assertEqual(topo_order, ["n1", "n2", "n3"])
        self.assertLess(val_time_ms, 50.0, "Thời gian thẩm định DAG phải <= 50ms theo chuẩn NFR-026")

        # 2. Đồ thị chứa chu trình lặp (Cycle Loop): n1 -> n2 -> n3 -> n2 (Vòng lặp giữa n2 và n3)
        cycle_edges = [
            {"id": "e1", "source_node_id": "n1", "target_node_id": "n2"},
            {"id": "e2", "source_node_id": "n2", "target_node_id": "n3"},
            {"id": "e3", "source_node_id": "n3", "target_node_id": "n2"}  # Cycle edge!
        ]
        is_valid, cycle_detected, cycle_path, topo_order, errors = validate_pipeline_dag(valid_nodes, cycle_edges)
        self.assertFalse(is_valid)
        self.assertTrue(cycle_detected, "Kahn's Algorithm phải phát hiện chu trình lặp theo BR-035/SEC-014")
        self.assertIn("Cycle Loop Detected", errors[0])

        # 3. Kiểm thử endpoint POST /api/v1/bot/discord/pipeline/validate
        res = self.client.post(
            "/api/v1/bot/discord/pipeline/validate",
            json={"nodes": valid_nodes, "edges": cycle_edges},
            cookies=self.cookies
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["is_valid"])
        self.assertTrue(data["cycle_detected"])
        self.assertLess(data["validation_time_ms"], 50.0)

        # 4. Kiểm thử chặn lưu Pipeline chứa chu trình qua PUT endpoint
        save_res = self.client.put(
            "/api/v1/bot/discord/pipeline",
            json={
                "name": "Cycle Pipeline",
                "nodes": valid_nodes,
                "edges": cycle_edges
            },
            cookies=self.cookies
        )
        self.assertEqual(save_res.status_code, 400)

    # ==========================================================================
    # TC-044: Kiểm soát 3 trạng thái vòng đời & Phản ánh diện mạo Discord Presence (FR-050, FR-051, BR-036, BR-038)
    # ==========================================================================
    def test_tc044_three_state_lifecycle_and_presence_reflection(self):
        # 1. Lấy pipeline mặc định -> ban đầu ở trạng thái STOPPED
        get_res = self.client.get("/api/v1/bot/discord/pipeline", cookies=self.cookies)
        self.assertEqual(get_res.status_code, 200)
        pipe_data = get_res.json()
        self.assertEqual(pipe_data["state"], "STOPPED")
        self.assertEqual(pipe_data["presence"]["color"], "grey")
        self.assertEqual(pipe_data["presence"]["status"], "invisible")

        # Cập nhật pipeline trỏ tới active model
        pipe_id = pipe_data["id"]
        update_nodes = [
            {"id": "n_in", "node_type": "discord_ingress", "label": "Ingress", "config": {}},
            {"id": "n_md", "node_type": "model_binding", "label": "Model", "config": {"model_id": self.active_model_id}},
            {"id": "n_eg", "node_type": "discord_egress", "label": "Egress", "config": {}}
        ]
        update_edges = [
            {"id": "e_1", "source_node_id": "n_in", "target_node_id": "n_md"},
            {"id": "e_2", "source_node_id": "n_md", "target_node_id": "n_eg"}
        ]
        self.client.put(
            "/api/v1/bot/discord/pipeline",
            json={"name": "Lifecycle Pipeline", "nodes": update_nodes, "edges": update_edges},
            cookies=self.cookies
        )

        # 2. Chuyển sang RUNNING -> Presence Xanh lá (online)
        res_run = self.client.patch(
            "/api/v1/bot/discord/pipeline/state",
            json={"state": "RUNNING"},
            cookies=self.cookies
        )
        self.assertEqual(res_run.status_code, 200)
        data_run = res_run.json()
        self.assertEqual(data_run["state"], "RUNNING")
        self.assertEqual(data_run["presence"]["color"], "green")
        self.assertEqual(data_run["presence"]["status"], "online")

        # 3. Chuyển sang PAUSED -> Presence Vàng cam (idle)
        res_pause = self.client.patch(
            "/api/v1/bot/discord/pipeline/state",
            json={"state": "PAUSED"},
            cookies=self.cookies
        )
        self.assertEqual(res_pause.status_code, 200)
        data_pause = res_pause.json()
        self.assertEqual(data_pause["state"], "PAUSED")
        self.assertEqual(data_pause["presence"]["color"], "amber")
        self.assertEqual(data_pause["presence"]["status"], "idle")

        # 4. Chuyển về STOPPED -> Presence Xám (invisible)
        res_stop = self.client.patch(
            "/api/v1/bot/discord/pipeline/state",
            json={"state": "STOPPED"},
            cookies=self.cookies
        )
        self.assertEqual(res_stop.status_code, 200)
        data_stop = res_stop.json()
        self.assertEqual(data_stop["state"], "STOPPED")
        self.assertEqual(data_stop["presence"]["color"], "grey")

    # ==========================================================================
    # TC-045: Bất biến liên kết mô hình ACTIVE (BR-037)
    # ==========================================================================
    def test_tc045_bound_model_active_status_invariant(self):
        # 1. Thử lưu pipeline với mô hình DISABLED -> Bị từ chối theo BR-037
        invalid_model_nodes = [
            {"id": "n1", "node_type": "discord_ingress", "label": "Ingress", "config": {}},
            {"id": "n2", "node_type": "model_binding", "label": "Model", "config": {"model_id": self.inactive_model_id}},
            {"id": "n3", "node_type": "discord_egress", "label": "Egress", "config": {}}
        ]
        valid_edges = [
            {"id": "e1", "source_node_id": "n1", "target_node_id": "n2"},
            {"id": "e2", "source_node_id": "n2", "target_node_id": "n3"}
        ]

        save_res = self.client.put(
            "/api/v1/bot/discord/pipeline",
            json={"name": "Disabled Model Pipe", "nodes": invalid_model_nodes, "edges": valid_edges},
            cookies=self.cookies
        )
        self.assertEqual(save_res.status_code, 400)
        self.assertIn("BR-037", str(save_res.json()))

        # 2. Thử lưu pipeline với mô hình không tồn tại
        fake_model_nodes = [
            {"id": "n1", "node_type": "discord_ingress", "label": "Ingress", "config": {}},
            {"id": "n2", "node_type": "model_binding", "label": "Model", "config": {"model_id": "non-existent-model"}},
            {"id": "n3", "node_type": "discord_egress", "label": "Egress", "config": {}}
        ]
        save_fake = self.client.put(
            "/api/v1/bot/discord/pipeline",
            json={"name": "Fake Model Pipe", "nodes": fake_model_nodes, "edges": valid_edges},
            cookies=self.cookies
        )
        self.assertEqual(save_fake.status_code, 400)

    # ==========================================================================
    # TC-046: Thực thi đồ thị đàm thoại End-to-End, Đo lường độ trễ & Quota (FR-052, BR-032, NFR-027)
    # ==========================================================================
    def test_tc046_end_to_end_pipeline_execution_and_simulation(self):
        # 1. Khởi tạo pipeline hợp lệ
        nodes = [
            {"id": "n_in", "node_type": "discord_ingress", "label": "Ingress", "config": {}},
            {"id": "n_tf", "node_type": "transform_filter", "label": "Filter", "config": {"lowercase": True, "strip": True}},
            {"id": "n_md", "node_type": "model_binding", "label": "Model", "config": {"model_id": self.active_model_id, "system_prompt": "You are AI-Chan", "temperature": 0.5, "max_tokens": 500}},
            {"id": "n_eg", "node_type": "discord_egress", "label": "Egress", "config": {"wrap_markdown": True}}
        ]
        edges = [
            {"id": "e_1", "source_node_id": "n_in", "target_node_id": "n_tf"},
            {"id": "e_2", "source_node_id": "n_tf", "target_node_id": "n_md"},
            {"id": "e_3", "source_node_id": "n_md", "target_node_id": "n_eg"}
        ]

        self.client.put(
            "/api/v1/bot/discord/pipeline",
            json={"name": "E2E Pipeline", "nodes": nodes, "edges": edges},
            cookies=self.cookies
        )

        # 2. Chuyển sang trạng thái RUNNING
        self.client.patch(
            "/api/v1/bot/discord/pipeline/state",
            json={"state": "RUNNING"},
            cookies=self.cookies
        )

        # 3. Chạy mô phỏng qua POST /api/v1/bot/discord/pipeline/simulate-run
        sim_res = self.client.post(
            "/api/v1/bot/discord/pipeline/simulate-run",
            json={"input_text": "Xin chào! Bạn là mô hình gì?"},
            cookies=self.cookies
        )
        self.assertEqual(sim_res.status_code, 200)
        sim_data = sim_res.json()

        self.assertEqual(sim_data["status"], "SUCCESS")
        self.assertIn("Test Active Model", sim_data["output_text"])
        self.assertGreater(sim_data["tokens_consumed"], 0)
        self.assertEqual(len(sim_data["step_traces"]), 4)

        # Kiểm tra độ trễ phụ trội NFR-027 <= 30ms
        self.assertLessEqual(sim_data["pipeline_overhead_ms"], 30.0, "Độ trễ phụ trội nội bộ phải <= 30ms theo NFR-027")

        # 4. Kiểm tra trừ Quota nguyên tử (BR-032)
        quota_row = query_one("SELECT daily_tokens_used FROM user_quotas WHERE user_id = ?", (self.user_id,))
        self.assertGreater(quota_row["daily_tokens_used"], 0)

        # 5. Kiểm tra trạng thái PAUSED từ chối xử lý với thông báo tạm dừng (BR-036, BR-038)
        self.client.patch(
            "/api/v1/bot/discord/pipeline/state",
            json={"state": "PAUSED"},
            cookies=self.cookies
        )

        # Chạy execute trực tiếp qua engine (trigger_source="DISCORD")
        pipe_row = query_one("SELECT id FROM bot_pipelines WHERE user_id = ?", (self.user_id,))
        pause_exec = execute_pipeline_dag(
            pipeline_id=pipe_row["id"],
            user_id=self.user_id,
            input_text="Câu hỏi khi pause",
            trigger_source="DISCORD",
            is_simulation=False
        )
        self.assertEqual(pause_exec["status"], "PAUSED_REJECT")
        self.assertIn("tạm dừng", pause_exec["output_text"])

        # 6. Kiểm tra trạng thái STOPPED từ chối xử lý (BR-036)
        self.client.patch(
            "/api/v1/bot/discord/pipeline/state",
            json={"state": "STOPPED"},
            cookies=self.cookies
        )
        stopped_exec = execute_pipeline_dag(
            pipeline_id=pipe_row["id"],
            user_id=self.user_id,
            input_text="Câu hỏi khi stop",
            trigger_source="DISCORD",
            is_simulation=False
        )
        self.assertEqual(stopped_exec["status"], "STOPPED_REJECT")

        # 7. Kiểm tra API GET /executions ghi nhận lịch sử
        hist_res = self.client.get("/api/v1/bot/discord/pipeline/executions", cookies=self.cookies)
        self.assertEqual(hist_res.status_code, 200)
        hist_data = hist_res.json()
        self.assertGreaterEqual(len(hist_data), 3)

if __name__ == "__main__":
    unittest.main()
