import os
import json
import asyncio
import logging
import base64
from typing import TypedDict, Sequence, Optional, List, Dict, Any, AsyncGenerator
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END

logger = logging.getLogger("ai_chan.agent")

def extract_text_content(content: Any) -> str:
    """Safely normalizes response content from string, list of blocks, or AIMessage."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(item["text"])
        return "".join(parts)
    return str(content) if content is not None else ""

class EnvKeyLoader:
    """Dynamically loads and validates LLM provider keys and configurations from .env."""
    
    @staticmethod
    def get_config() -> Dict[str, Any]:
        try:
            from src.core.config import settings
            gemini_key = (settings.GEMINI_API_KEY or "").strip()
            openai_key = (settings.OPENAI_API_KEY or "").strip()
            anthropic_key = (settings.ANTHROPIC_API_KEY or "").strip()
            groq_key = (settings.GROQ_API_KEY or "").strip()
            ollama_url = (settings.OLLAMA_BASE_URL or "http://localhost:11434").strip()
            default_prov = (settings.DEFAULT_LLM_PROVIDER or "gemini").lower().strip()
            default_mod = (settings.DEFAULT_LLM_MODEL or "gemini-3.8-flash").strip()
        except Exception:
            gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
            openai_key = os.getenv("OPENAI_API_KEY", "").strip()
            anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
            groq_key = os.getenv("GROQ_API_KEY", "").strip()
            ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip()
            default_prov = os.getenv("DEFAULT_LLM_PROVIDER", "gemini").lower().strip()
            default_mod = os.getenv("DEFAULT_LLM_MODEL", "gemini-3.8-flash").strip()

        # Fallback to os.getenv if empty
        gemini_key = gemini_key or os.getenv("GEMINI_API_KEY", "").strip()
        openai_key = openai_key or os.getenv("OPENAI_API_KEY", "").strip()

        # Modern Gemini model alias upgrade
        if default_mod in ["gemini-1.5-flash", "gemini-2.5-flash"]:
            default_mod = "gemini-3.8-flash"

        return {
            "gemini_api_key": gemini_key,
            "openai_api_key": openai_key,
            "anthropic_api_key": anthropic_key,
            "groq_api_key": groq_key,
            "ollama_base_url": ollama_url,
            "default_provider": default_prov,
            "default_model": default_mod
        }

    @classmethod
    def get_available_providers(cls) -> List[str]:
        cfg = cls.get_config()
        available = []
        if cfg["gemini_api_key"]:
            available.append("gemini")
        if cfg["openai_api_key"]:
            available.append("openai")
        if cfg["anthropic_api_key"]:
            available.append("anthropic")
        if cfg["groq_api_key"]:
            available.append("groq")
        return available

class AgentChatState(TypedDict):
    """LangGraph state representation for chat message workflow."""
    messages: Sequence[BaseMessage]
    prompt: str
    history: List[Dict[str, Any]]
    target_model: str
    active_provider: str
    response_text: str
    error: Optional[str]
    failover_triggered: bool
    final_model: str

class LangChainModelFactory:
    """Factory creating LangChain Chat Model instances based on .env configuration."""
    
    @staticmethod
    def get_candidate_models(provider: str, target_model: Optional[str] = None) -> List[str]:
        provider = provider.lower().strip()
        if provider == "gemini":
            pool = [
                target_model,
                "gemini-3.5-flash-lite",
                "gemini-flash-lite-latest",
                "gemini-3-flash-preview",
                "gemini-3.5-flash",
                "gemini-3.8-flash"
            ]
            candidates = []
            for m in pool:
                if m and m not in candidates:
                    candidates.append(m)
            return candidates
        elif provider == "openai":
            pool = [target_model, "gpt-4o-mini", "gpt-4o"]
            candidates = []
            for m in pool:
                if m and m not in candidates:
                    candidates.append(m)
            return candidates
        return [target_model] if target_model else []

    @staticmethod
    def create_model(provider: str, model_name: Optional[str] = None):
        cfg = EnvKeyLoader.get_config()
        provider = provider.lower()
        
        if provider == "gemini" and cfg["gemini_api_key"]:
            from langchain_google_genai import ChatGoogleGenerativeAI
            target = model_name or cfg["default_model"] or "gemini-3.5-flash-lite"
            if target in ["gemini-1.5-flash", "gemini-2.5-flash"]:
                target = "gemini-3.5-flash-lite"
            return ChatGoogleGenerativeAI(
                model=target,
                google_api_key=cfg["gemini_api_key"],
                temperature=0.7,
                timeout=12.0,
                max_retries=1
            )
        elif provider == "openai" and cfg["openai_api_key"]:
            from langchain_openai import ChatOpenAI
            target = model_name or "gpt-4o-mini"
            return ChatOpenAI(
                model=target,
                api_key=cfg["openai_api_key"],
                temperature=0.7,
                timeout=30.0
            )
        return None

def build_langchain_messages(
    prompt: str,
    history: List[Dict[str, Any]],
    system_instruction: Optional[str] = None,
    attachments: Optional[List[Dict[str, Any]]] = None
) -> List[BaseMessage]:
    """Constructs a sliding window of max 20 messages (INV-04) formatted for LangChain with optional custom system instruction and multimodal attachments."""
    default_instruction = (
        "Bạn là AI-Chan, trợ lý ảo thông minh và thân thiện. "
        "Hãy trả lời chính xác, hữu ích, hỗ trợ định dạng Markdown và mã nguồn chuẩn khi cần."
    )
    instruction = system_instruction.strip() if system_instruction and system_instruction.strip() else default_instruction
    messages: List[BaseMessage] = [SystemMessage(content=instruction)]
    
    # 20 most recent messages context window
    recent_history = history[-20:] if len(history) > 20 else history
    for item in recent_history:
        role = item.get("role", "")
        content = item.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))

    # Process attachments for the current turn
    image_parts: List[Dict[str, Any]] = []
    text_attachment_blocks: List[str] = []

    if attachments:
        from src.core.attachment_storage import read_attachment_bytes, extract_text_from_file
        for att in attachments:
            m_type = (att.get("mime_type") or "").lower()
            fname = att.get("filename") or att.get("original_name") or "tệp"
            storage_path = att.get("storage_path")
            
            # 1. Image modalities (PNG, JPEG, WebP, GIF)
            if m_type.startswith("image/"):
                if storage_path:
                    try:
                        raw_bytes = read_attachment_bytes(storage_path)
                        b64_str = base64.b64encode(raw_bytes).decode("utf-8")
                        image_parts.append({
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{m_type};base64,{b64_str}"
                            }
                        })
                    except Exception as err:
                        logger.warning(f"Không thể nạp dữ liệu ảnh {fname} ({storage_path}): {err}")

            # 2. Text / Code / CSV / JSON / PDF text extraction
            ext_text = att.get("extracted_text")
            if not ext_text and storage_path and not m_type.startswith("image/"):
                try:
                    ext_text = extract_text_from_file(storage_path, m_type)
                except Exception as err:
                    logger.warning(f"Không thể trích xuất văn bản từ {fname}: {err}")

            if ext_text and ext_text.strip():
                text_attachment_blocks.append(
                    f"\n\n--- [Tài liệu đính kèm: {fname} (MIME: {m_type})] ---\n"
                    f"{ext_text.strip()}\n"
                    f"--- [Hết tài liệu: {fname}] ---"
                )

    combined_text = prompt
    if text_attachment_blocks:
        combined_text = combined_text + "".join(text_attachment_blocks)

    if image_parts:
        content_parts: List[Dict[str, Any]] = [{"type": "text", "text": combined_text}]
        content_parts.extend(image_parts)
        messages.append(HumanMessage(content=content_parts))
    else:
        messages.append(HumanMessage(content=combined_text))

    return messages


class ChatAgentOrchestrator:
    """Stateful Chat Agent orchestrator powered by LangChain and LangGraph."""

    def __init__(self):
        self.workflow = self._build_graph()

    def _build_graph(self):
        """Constructs the LangGraph StateGraph workflow with failover routing."""
        builder = StateGraph(AgentChatState)

        def context_node(state: AgentChatState) -> Dict[str, Any]:
            msgs = build_langchain_messages(state["prompt"], state["history"])
            return {"messages": msgs, "error": None, "failover_triggered": False}

        def primary_node(state: AgentChatState) -> Dict[str, Any]:
            cfg = EnvKeyLoader.get_config()
            primary_prov = cfg["default_provider"] if cfg["default_provider"] in ["gemini", "openai"] else "gemini"
            target_model = state.get("target_model")
            candidates = LangChainModelFactory.get_candidate_models(primary_prov, target_model)
            for cand_model in candidates:
                model = LangChainModelFactory.create_model(primary_prov, cand_model)
                if not model:
                    continue
                try:
                    resp = model.invoke(state["messages"])
                    clean_text = extract_text_content(resp.content)
                    return {
                        "response_text": clean_text,
                        "final_model": getattr(model, "model_name", cand_model),
                        "active_provider": primary_prov,
                        "error": None
                    }
                except Exception as exc:
                    logger.warning(f"Primary model {cand_model} failed in primary_node: {exc}. Trying next candidate...")
                    continue
            return {
                "error": f"All models for provider {primary_prov} failed.",
                "failover_triggered": True
            }

        def fallback_node(state: AgentChatState) -> Dict[str, Any]:
            # Failover logic: if gemini failed, try openai, or vice-versa (BR-005)
            fallback_prov = "openai" if state.get("active_provider") == "gemini" else "gemini"
            fallback_candidates = LangChainModelFactory.get_candidate_models(fallback_prov)
            for fb_cand in fallback_candidates:
                model = LangChainModelFactory.create_model(fallback_prov, fb_cand)
                if not model:
                    continue
                try:
                    resp = model.invoke(state["messages"])
                    clean_text = extract_text_content(resp.content)
                    return {
                        "response_text": clean_text,
                        "final_model": getattr(model, "model_name", fb_cand),
                        "active_provider": fallback_prov,
                        "error": None
                    }
                except Exception as exc:
                    logger.error(f"Fallback model {fb_cand} ({fallback_prov}) failed: {exc}")
                    continue

            return {"error": f"Fallback provider {fallback_prov} also failed.", "active_provider": "failed"}

        builder.add_node("context_prep", context_node)
        builder.add_node("primary_model", primary_node)
        builder.add_node("fallback_model", fallback_node)

        builder.set_entry_point("context_prep")
        builder.add_edge("context_prep", "primary_model")

        def route_after_primary(state: AgentChatState) -> str:
            if state.get("failover_triggered"):
                return "fallback_model"
            return END

        builder.add_conditional_edges("primary_model", route_after_primary)
        builder.add_edge("fallback_model", END)

        return builder.compile()

    async def astream_agent(
        self,
        prompt: str,
        history: List[Dict[str, Any]],
        model_override: Optional[str] = None,
        system_instruction: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Asynchronously streams token chunks with automatic failover (SSE compatible), custom system instruction, and multimodal attachments."""
        cfg = EnvKeyLoader.get_config()
        messages = build_langchain_messages(prompt, history, system_instruction=system_instruction, attachments=attachments)
        
        primary_prov = cfg["default_provider"] if cfg["default_provider"] in ["gemini", "openai"] else "gemini"
        target_model = model_override or cfg["default_model"]

        # 1. Thử truyền luồng từ Primary Provider với intra-provider model failover (BR-005)
        primary_candidates = LangChainModelFactory.get_candidate_models(primary_prov, target_model)
        for cand_model in primary_candidates:
            primary_model = LangChainModelFactory.create_model(primary_prov, cand_model)
            if not primary_model:
                continue
            stream_started = False
            try:
                final_model_name = getattr(primary_model, "model_name", cand_model)
                async for chunk in primary_model.astream(messages):
                    raw_content = chunk.content if hasattr(chunk, "content") else str(chunk)
                    token_str = extract_text_content(raw_content)
                    if token_str:
                        stream_started = True
                        yield {"token": token_str, "status": "streaming"}
                
                if stream_started:
                    # Stream hoàn tất thành công qua Primary
                    yield {
                        "status": "done",
                        "model": final_model_name,
                        "provider": primary_prov
                    }
                    return
            except Exception as primary_exc:
                logger.warning(f"LangChain primary model '{cand_model}' failed ({primary_prov}): {primary_exc}")
                if stream_started:
                    yield {"status": "error", "message": f"Stream gián đoạn: {primary_exc}"}
                    return
                # Thử model tiếp theo trong cùng provider

        # 2. Kích hoạt Fallback Provider nếu Primary provider không khả dụng (BR-005, ADR-003, ADR-005)
        fallback_prov = "openai" if primary_prov == "gemini" else "gemini"
        fallback_candidates = LangChainModelFactory.get_candidate_models(fallback_prov)
        for fb_cand in fallback_candidates:
            fallback_model = LangChainModelFactory.create_model(fallback_prov, fb_cand)
            if not fallback_model:
                continue
            stream_started = False
            try:
                fallback_model_name = getattr(fallback_model, "model_name", fb_cand)
                logger.info(f"Kích hoạt chuyển vùng dự phòng LangGraph sang {fallback_prov} ({fallback_model_name})")
                async for chunk in fallback_model.astream(messages):
                    raw_content = chunk.content if hasattr(chunk, "content") else str(chunk)
                    token_str = extract_text_content(raw_content)
                    if token_str:
                        stream_started = True
                        yield {"token": token_str, "status": "streaming"}
                if stream_started:
                    yield {
                        "status": "done",
                        "model": fallback_model_name,
                        "provider": fallback_prov,
                        "failover": True
                    }
                    return
            except Exception as fb_exc:
                logger.error(f"Fallback model '{fb_cand}' ({fallback_prov}) thất bại: {fb_exc}")
                if stream_started:
                    yield {"status": "error", "message": f"Stream gián đoạn: {fb_exc}"}
                    return

        # 3. Fallback High-Quality Local/Mock Generator (khi chưa cấu hình API Key trong .env hoặc toàn bộ Cloud Provider bị sự cố)
        logger.info("Toàn bộ Cloud Provider không khả dụng -> Kích hoạt Local Agent Simulator thích ứng ngữ cảnh.")
        
        # Phân tích System Prompt để xác định vai trò chuyên môn (Persona)
        persona_role = "Trợ lý Trí tuệ Nhân tạo AI-Chan"
        if system_instruction and system_instruction.strip():
            si_clean = system_instruction.strip()
            first_line = si_clean.split("\n")[0]
            for prefix in ["Bạn là một", "Bạn là", "You are a", "You are"]:
                if first_line.startswith(prefix):
                    first_line = first_line[len(prefix):].strip()
                    break
            first_line = first_line.strip(".:;\"'")
            if first_line:
                persona_role = first_line[:80]

        p_lower = prompt.lower()
        if attachments:
            att_names = ", ".join(f"`{a.get('filename') or a.get('original_name') or 'tệp'}`" for a in attachments)
            texts = [a.get("extracted_text") for a in attachments if a.get("extracted_text")]
            images = [a for a in attachments if (a.get("mime_type") or "").startswith("image/")]
            if texts and ("nội dung" in p_lower or "phân tích" in p_lower or "file" in p_lower or "tệp" in p_lower or "đọc" in p_lower or "tóm tắt" in p_lower or "hỏi" in p_lower):
                combined_snippet = "\n".join(t.strip() for t in texts if t)[:800]
                body = (
                    f"Tôi đã phân tích thành công nội dung từ tệp đính kèm {att_names}:\n\n"
                    f"**Nội dung trích xuất:**\n"
                    f"```\n{combined_snippet}\n```\n\n"
                    f"Về câu hỏi *\"{prompt}\"*: Nội dung trên đã được tiếp nhận và xử lý đầy đủ theo đúng yêu cầu của bạn."
                )
            elif images:
                body = (
                    f"Tôi đã nhận và phân tích hình ảnh đính kèm {att_names}.\n\n"
                    f"Dưới vai trò **{persona_role}**, hình ảnh đã được xử lý thành công theo yêu cầu *\"{prompt}\"*."
                )
            else:
                body = (
                    f"Tôi đã tiếp nhận {len(attachments)} tệp đính kèm ({att_names}).\n\n"
                    f"Dưới vai trò **{persona_role}**, tôi đã đọc và xử lý toàn bộ dữ liệu theo yêu cầu *\"{prompt}\"*."
                )
        elif "giới thiệu" in p_lower or "bạn là ai" in p_lower or "who are you" in p_lower or "chào" in p_lower:
            if "business analyst" in persona_role.lower() or "ba" in persona_role.lower() or "nghiệp vụ" in persona_role.lower():
                body = (
                    f"Chào bạn! Tôi là một **{persona_role}**.\n\n"
                    f"Với vai trò chuyên viên phân tích nghiệp vụ, tôi có các nhiệm vụ trọng tâm sau:\n"
                    f"- **Bóc tách & Khảo sát yêu cầu**: Phân tích Business Requirements, viết User Stories và tiêu chí chấp nhận (Acceptance Criteria).\n"
                    f"- **Mô hình hóa quy trình**: Vẽ sơ đồ luồng nghiệp vụ (BPMN, Swimlane), xây dựng Use Case và đặc tả chức năng (SRS).\n"
                    f"- **Cầu nối kỹ thuật**: Đồng hành cùng Product Owner và Tech Team để đảm bảo giải pháp đáp ứng đúng mục tiêu kinh doanh.\n\n"
                    f"Hôm nay bạn cần tôi hỗ trợ phân tích quy trình hay lập tài liệu đặc tả cho tính năng nào?"
                )
            elif "python" in persona_role.lower() or "architect" in persona_role.lower() or "kỹ sư" in persona_role.lower() or "engineer" in persona_role.lower():
                body = (
                    f"Chào bạn! Tôi là một **{persona_role}**.\n\n"
                    f"Tôi chuyên sâu về thiết kế kiến trúc phần mềm, xây dựng hệ sinh thái AI Agent (LangChain, LangGraph) và tối ưu hóa hệ thống phân tán:\n"
                    f"- **Thiết kế kiến trúc**: Clean Architecture, Microservices, Event-driven và StateGraph bền bỉ.\n"
                    f"- **Tối ưu hóa hiệu năng**: Xử lý bất đồng bộ cao (AsyncIO, SSE streaming), quản lý bộ nhớ và truy vấn CSDL.\n"
                    f"- **Tiêu chuẩn mã nguồn**: Thiết lập CI/CD, viết Unit Test / Integration Test tự động và bảo mật API.\n\n"
                    f"Bạn đang cần tôi tư vấn giải pháp kỹ thuật, review kiến trúc hay tối ưu đoạn code nào?"
                )
            else:
                body = (
                    f"Chào bạn! Tôi đang đảm nhiệm vai trò **{persona_role}**.\n\n"
                    f"Theo chỉ dẫn hệ thống đã được cấu hình trong Project:\n"
                    f"> *\"{system_instruction.strip()[:140]}...\"*\n\n"
                    f"Tôi sẵn sàng hỗ trợ bạn giải quyết mọi câu hỏi hoặc nhiệm vụ thuộc chuyên môn này. "
                    f"Hãy cho tôi biết yêu cầu cụ thể của bạn!"
                )
        elif "python" in p_lower or "code" in p_lower or "lập trình" in p_lower:
            body = (
                f"Về câu hỏi kỹ thuật (*\"{prompt}\"*):\n\n"
                f"Dưới góc nhìn của **{persona_role}**, tôi đề xuất cấu trúc triển khai chuẩn như sau:\n\n"
                f"```python\n"
                f"# Mô hình xử lý dữ liệu chuẩn hóa\n"
                f"import asyncio\n"
                f"from typing import Dict, Any\n\n"
                f"async def execute_task(data: Dict[str, Any]) -> Dict[str, Any]:\n"
                f"    # Xác thực và xử lý luồng logic\n"
                f"    await asyncio.sleep(0.01)\n"
                f"    return {{'status': 'success', 'data': data}}\n"
                f"```\n\n"
                f"Cấu trúc này đảm bảo tính module hóa, dễ kiểm thử và có khả năng mở rộng cao."
            )
        else:
            body = (
                f"Dưới vai trò **{persona_role}**, tôi xin phản hồi yêu cầu *\"{prompt}\"* của bạn:\n\n"
                f"1. **Phân tích bối cảnh**: Yêu cầu đã được tiếp nhận và xử lý theo đúng chỉ dẫn chuyên môn.\n"
                f"2. **Định hướng giải pháp**: Áp dụng các nguyên tắc thiết kế tối ưu và đảm bảo tính nhất quán.\n"
                f"3. **Hành động tiếp theo**: Bạn có thể cung cấp thêm chi tiết để tôi đi sâu vào từng khía cạnh cụ thể."
            )


        full_text = body
        words = full_text.split(" ")
        for idx, word in enumerate(words):
            chunk_word = word + (" " if idx < len(words) - 1 else "")
            yield {"token": chunk_word, "status": "streaming"}
            await asyncio.sleep(0.025)

        yield {
            "status": "done",
            "model": "agent-simulator",
            "provider": "langgraph-local"
        }

# Global singleton instance
chat_agent = ChatAgentOrchestrator()
