"""Logging configuration module for AI-Chan Discord Bot."""

import logging
import sys


def setup_logging(log_level: str = "INFO") -> None:
    """Configure structured console logging for the Discord Bot.

    Args:
        log_level: Desired logging level (e.g. DEBUG, INFO, WARNING, ERROR).
    """
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    log_format = "[%(asctime)s] [%(levelname)-8s] [%(name)s:%(lineno)d] - %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    formatter = logging.Formatter(fmt=log_format, datefmt=date_format)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(numeric_level)

    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Avoid duplicate handlers
    root_logger.handlers.clear()
    root_logger.addHandler(console_handler)

    # Suppress overly verbose third-party loggers
    logging.getLogger("discord.gateway").setLevel(logging.WARNING)
    logging.getLogger("discord.client").setLevel(logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
