import logging

import structlog


def get_logger(name: str) -> structlog.BoundLogger:
    return structlog.get_logger(name)


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO)
