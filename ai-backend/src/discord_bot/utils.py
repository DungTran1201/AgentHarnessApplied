"""Utilities for AI-Chan Discord Bot, including smart Markdown chunking."""

import re
from typing import List


def split_discord_message(content: str, max_chunk_size: int = 3900) -> List[str]:
    """Splits a long Markdown message into chunks suitable for Discord embeds/messages (<= max_chunk_size).

    Preserves code block fences (```) across chunks so that code syntax highlighting
    does not break when split across multiple Discord messages.

    Args:
        content: The input Markdown text to split.
        max_chunk_size: Maximum characters allowed per chunk (default 3900 for embeds).

    Returns:
        List of formatted message chunks.
    """
    if not content:
        return [""]

    if len(content) <= max_chunk_size:
        return [content]

    chunks: List[str] = []
    lines = content.splitlines(keepends=True)

    current_chunk: List[str] = []
    current_length = 0
    in_code_block = False
    current_lang = ""

    code_fence_pattern = re.compile(r"^```(\w+)?\s*$")

    for line in lines:
        line_len = len(line)

        # Detect code block toggle
        stripped = line.strip()
        fence_match = code_fence_pattern.match(stripped)

        # If adding this line exceeds max_chunk_size, flush current chunk
        # Account for closing fence (4 chars: "\n```") if in code block
        extra_close_len = 4 if in_code_block else 0
        if current_chunk and (current_length + line_len + extra_close_len > max_chunk_size):
            if in_code_block:
                current_chunk.append("\n```")

            chunks.append("".join(current_chunk).strip())

            # Start new chunk
            current_chunk = []
            current_length = 0

            # Reopen code block in next chunk if previously open
            if in_code_block:
                reopen_line = f"```{current_lang}\n" if current_lang else "```\n"
                current_chunk.append(reopen_line)
                current_length += len(reopen_line)

        # Update code block state if current line is a fence
        if fence_match:
            if in_code_block:
                in_code_block = False
                current_lang = ""
            else:
                in_code_block = True
                current_lang = fence_match.group(1) or ""

        current_chunk.append(line)
        current_length += line_len

    if current_chunk:
        chunks.append("".join(current_chunk).strip())

    return [c for c in chunks if c]
