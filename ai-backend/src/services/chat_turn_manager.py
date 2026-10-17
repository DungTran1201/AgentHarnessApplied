"""
Project Chat Turn Manager
Handles persistent, detached background generation for Project Chat turns.
Ensures that client unmounts/disconnections do not abort AI generation,
and provides event replay buffers for seamless client re-attachment.
"""

import asyncio
import json
import logging
import time
import uuid
from typing import Dict, Any, Optional, List, Set, AsyncGenerator
from src.db import execute_commit, query_one

logger = logging.getLogger("ai_chan.chat_turn_manager")


class ActiveChatTurn:
    def __init__(
        self,
        turn_id: str,
        project_id: str,
        conversation_id: str,
        user_id: str,
        user_msg_id: str,
        assistant_msg_id: str,
        target_model: str,
    ):
        self.turn_id = turn_id
        self.project_id = project_id
        self.conversation_id = conversation_id
        self.user_id = user_id
        self.user_msg_id = user_msg_id
        self.assistant_msg_id = assistant_msg_id
        self.target_model = target_model
        self.status = "RUNNING"  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED, INTERRUPTED
        self.events: List[Dict[str, Any]] = []
        self.accumulated_chunks: List[str] = []
        self.final_model_used = target_model
        self.error: Optional[str] = None
        self.subscribers: Set[asyncio.Queue] = set()
        self.task: Optional[asyncio.Task] = None
        self.created_at = time.time()
        self.completed_at: Optional[float] = None

    def add_event(self, event_type: str, data: Dict[str, Any]) -> None:
        seq = len(self.events)
        event_record = {
            "seq": seq,
            "event": event_type,
            "data": data,
        }
        self.events.append(event_record)
        # Fan out to all current active subscribers
        payload_str = f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
        for q in list(self.subscribers):
            try:
                q.put_nowait(payload_str)
            except Exception:
                pass


class ProjectChatTurnManager:
    _turns: Dict[str, ActiveChatTurn] = {}  # keyed by conversation_id

    @classmethod
    def get_active_turn(cls, conversation_id: str) -> Optional[ActiveChatTurn]:
        turn = cls._turns.get(conversation_id)
        if turn and turn.status == "RUNNING":
            return turn
        return None

    @classmethod
    def start_turn(
        cls,
        project_id: str,
        conversation_id: str,
        user_id: str,
        user_msg_id: str,
        message_text: str,
        context_msgs: List[Dict[str, Any]],
        target_model_id: str,
        combined_instruction: Optional[str] = None,
        attachment_records: Optional[List[Dict[str, Any]]] = None,
        connected_tool_definitions: Optional[List[Dict[str, Any]]] = None,
        connected_bot_info: Optional[Dict[str, Any]] = None,
        connected_skills_info: Optional[List[Dict[str, Any]]] = None,
        connected_tools_info: Optional[List[Dict[str, Any]]] = None,
        actual_words: int = 0,
    ) -> ActiveChatTurn:
        existing = cls.get_active_turn(conversation_id)
        if existing:
            raise RuntimeError("Một lượt sinh đang được xử lý trong cuộc hội thoại này. Vui lòng chờ hoàn tất.")

        turn_id = f"turn_{uuid.uuid4().hex[:16]}"
        assistant_msg_id = f"msg_{uuid.uuid4().hex}"

        # 1. Insert placeholder assistant message with RUNNING status in DB
        execute_commit(
            """
            INSERT INTO messages (id, conversation_id, role, content, model_used, status, tokens_prompt)
            VALUES (?, ?, 'assistant', '', ?, 'RUNNING', ?)
            """,
            (assistant_msg_id, conversation_id, target_model_id, actual_words)
        )
        execute_commit(
            "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (conversation_id,)
        )

        turn = ActiveChatTurn(
            turn_id=turn_id,
            project_id=project_id,
            conversation_id=conversation_id,
            user_id=user_id,
            user_msg_id=user_msg_id,
            assistant_msg_id=assistant_msg_id,
            target_model=target_model_id,
        )
        cls._turns[conversation_id] = turn

        # 2. Add start event
        start_payload = {
            "turn_id": turn_id,
            "project_id": project_id,
            "conversation_id": conversation_id,
            "message_id": assistant_msg_id,
            "model": target_model_id,
            "bot": connected_bot_info,
            "skills": connected_skills_info,
            "tools": connected_tools_info,
            "status": "RUNNING",
        }
        turn.add_event("start", start_payload)

        # 3. Launch background async task decoupled from HTTP connection
        task = asyncio.create_task(
            cls._execute_generation(
                turn=turn,
                message_text=message_text,
                context_msgs=context_msgs,
                combined_instruction=combined_instruction,
                attachment_records=attachment_records,
                connected_tool_definitions=connected_tool_definitions,
                actual_words=actual_words,
            )
        )
        turn.task = task
        return turn

    @classmethod
    async def _execute_generation(
        cls,
        turn: ActiveChatTurn,
        message_text: str,
        context_msgs: List[Dict[str, Any]],
        combined_instruction: Optional[str],
        attachment_records: Optional[List[Dict[str, Any]]],
        connected_tool_definitions: Optional[List[Dict[str, Any]]],
        actual_words: int,
    ) -> None:
        final_model_used = turn.target_model
        try:
            from llm.agent import chat_agent

            async for event in chat_agent.astream_agent(
                prompt=message_text,
                history=context_msgs,
                model_override=turn.target_model,
                system_instruction=combined_instruction if combined_instruction else None,
                attachments=attachment_records if attachment_records else None,
                tools=connected_tool_definitions if connected_tool_definitions else None,
                project_id=turn.project_id,
                user_id=turn.user_id,
                conversation_id=turn.conversation_id,
            ):
                if turn.status == "CANCELLED":
                    break

                ev_status = event.get("status")
                if ev_status == "streaming":
                    token_str = event.get("token", "")
                    if token_str:
                        turn.accumulated_chunks.append(token_str)
                        chunk_payload = {
                            "token": token_str,
                            "content": token_str,
                            "status": "streaming",
                            "seq": len(turn.events),
                        }
                        turn.add_event("chunk", chunk_payload)
                elif ev_status == "done":
                    final_model_used = event.get("model", final_model_used)
                elif ev_status == "error":
                    err_msg = event.get("message", "Lỗi sinh phản hồi từ mô hình")
                    turn.error = err_msg
                    turn.status = "FAILED"
                    turn.add_event("error", {"status": "error", "message": err_msg})
                    break

            # Handle completion if not cancelled or failed
            if turn.status == "RUNNING":
                full_content = "".join(turn.accumulated_chunks).strip()
                turn.final_model_used = final_model_used
                turn.status = "COMPLETED"
                turn.completed_at = time.time()

                # Update DB message
                execute_commit(
                    """
                    UPDATE messages
                    SET content = ?, model_used = ?, status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (full_content, final_model_used, turn.assistant_msg_id)
                )
                execute_commit(
                    "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (turn.conversation_id,)
                )

                done_payload = {
                    "status": "done",
                    "finish_reason": "stop",
                    "turn_id": turn.turn_id,
                    "message_id": turn.assistant_msg_id,
                    "model": final_model_used,
                    "tokens_prompt": actual_words,
                    "conversation_id": turn.conversation_id,
                }
                turn.add_event("done", done_payload)

            elif turn.status == "FAILED":
                err_text = f"⚠️ **Lỗi:** {turn.error or 'Không thể sinh phản hồi từ mô hình.'}"
                execute_commit(
                    """
                    UPDATE messages
                    SET content = ?, model_used = ?, status = 'FAILED', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (err_text, final_model_used, turn.assistant_msg_id)
                )

        except asyncio.CancelledError:
            turn.status = "CANCELLED"
            partial_content = "".join(turn.accumulated_chunks).strip()
            cancel_text = partial_content + ("\n\n*(Đã dừng bởi người dùng)*" if partial_content else "*(Đã dừng bởi người dùng)*")
            execute_commit(
                """
                UPDATE messages
                SET content = ?, model_used = ?, status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (cancel_text, final_model_used, turn.assistant_msg_id)
            )
            turn.add_event("done", {"status": "cancelled", "message_id": turn.assistant_msg_id})
        except Exception as e:
            logger.exception(f"Unexpected error in background chat generation: {e}")
            turn.status = "FAILED"
            turn.error = str(e)
            err_text = f"⚠️ Dịch vụ AI tạm thời gián đoạn: {str(e)}"
            execute_commit(
                """
                UPDATE messages
                SET content = ?, model_used = ?, status = 'FAILED', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (err_text, final_model_used, turn.assistant_msg_id)
            )
            turn.add_event("error", {"status": "error", "message": err_text})
        finally:
            turn.completed_at = time.time()
            # Retain in registry for 5 minutes for late reconnects, then clean up
            asyncio.create_task(cls._schedule_cleanup(turn.conversation_id, delay=300))

    @classmethod
    async def _schedule_cleanup(cls, conversation_id: str, delay: int = 300) -> None:
        await asyncio.sleep(delay)
        turn = cls._turns.get(conversation_id)
        if turn and turn.status != "RUNNING":
            cls._turns.pop(conversation_id, None)

    @classmethod
    def cancel_turn(cls, conversation_id: str, user_id: str) -> bool:
        turn = cls.get_active_turn(conversation_id)
        if not turn:
            return False
        if turn.user_id != user_id and user_id != "guest_user":
            return False
        if turn.task and not turn.task.done():
            turn.status = "CANCELLED"
            turn.task.cancel()
            return True
        return False

    @classmethod
    async def stream_turn(
        cls,
        turn: ActiveChatTurn,
        after_seq: int = -1
    ) -> AsyncGenerator[str, None]:
        """Yields SSE events starting after the specified sequence number, then streams live."""
        # 1. Replay buffered events
        for ev in turn.events:
            if ev["seq"] > after_seq:
                yield f"event: {ev['event']}\ndata: {json.dumps(ev['data'], ensure_ascii=False)}\n\n"

        # If already done, we're finished
        if turn.status in ("COMPLETED", "FAILED", "CANCELLED", "INTERRUPTED"):
            return

        # 2. Subscribe to live queue for remaining events
        q: asyncio.Queue = asyncio.Queue()
        turn.subscribers.add(q)
        try:
            while True:
                payload = await q.get()
                yield payload
                if "event: done" in payload or "event: error" in payload:
                    break
        except (asyncio.CancelledError, GeneratorExit):
            pass
        finally:
            turn.subscribers.discard(q)

    @classmethod
    def reconcile_startup_interrupted_turns(cls) -> int:
        """Finds any turns left in RUNNING/QUEUED from previous process run and marks them INTERRUPTED."""
        rows = execute_commit(
            """
            UPDATE messages
            SET status = 'INTERRUPTED',
                content = CASE 
                    WHEN content = '' OR content IS NULL 
                    THEN '⚠️ Quá trình sinh phản hồi bị gián đoạn do hệ thống khởi động lại.' 
                    ELSE content || '\n\n⚠️ *(Bị gián đoạn do hệ thống khởi động lại)*' 
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE status IN ('RUNNING', 'QUEUED')
            """
        )
        return rows

reconcile_startup_interrupted_turns = ProjectChatTurnManager.reconcile_startup_interrupted_turns
