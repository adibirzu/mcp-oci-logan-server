"""Structured logging (structlog) and optional OTEL tracing.

All output goes to stderr so it never contaminates stdio MCP transport.
"""

from __future__ import annotations

import sys
import time
from collections import defaultdict
from typing import Any

import structlog

from mcp_logan.config import settings

# ---------------------------------------------------------------------------
# In-memory metrics
# ---------------------------------------------------------------------------

_call_counts: dict[str, int] = defaultdict(int)
_error_counts: dict[str, int] = defaultdict(int)
_latencies: dict[str, list[float]] = defaultdict(list)

MAX_LATENCY_SAMPLES = 200  # ring buffer per tool


def record_call(tool: str, duration_ms: float, *, error: bool = False) -> None:
    _call_counts[tool] += 1
    if error:
        _error_counts[tool] += 1
    buf = _latencies[tool]
    buf.append(duration_ms)
    if len(buf) > MAX_LATENCY_SAMPLES:
        buf.pop(0)


def get_metrics() -> dict[str, Any]:
    """Return tool-call metrics (zero cost — reads memory)."""
    result: dict[str, Any] = {}
    for tool in sorted(_call_counts):
        lats = _latencies.get(tool, [])
        sorted_lats = sorted(lats) if lats else [0]
        p50_idx = max(0, len(sorted_lats) // 2 - 1)
        p95_idx = max(0, int(len(sorted_lats) * 0.95) - 1)
        result[tool] = {
            "calls": _call_counts[tool],
            "errors": _error_counts.get(tool, 0),
            "p50_ms": round(sorted_lats[p50_idx], 1),
            "p95_ms": round(sorted_lats[p95_idx], 1),
        }
    return result


# ---------------------------------------------------------------------------
# Structured logging
# ---------------------------------------------------------------------------

def configure_logging(level: str = "INFO", json_format: bool = False) -> None:
    """Configure structlog to output to stderr (safe for stdio transport)."""
    processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    if json_format:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stderr),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Return a bound logger with the given component name."""
    return structlog.get_logger(component=name)


# ---------------------------------------------------------------------------
# OTEL integration (optional)
# ---------------------------------------------------------------------------

_tracer = None


def init_otel() -> None:
    """Initialize OpenTelemetry tracing if enabled and packages available."""
    global _tracer
    if not settings.otel_tracing_enabled:
        return

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.resources import Resource

        resource = Resource.create({"service.name": settings.otel_service_name})
        provider = TracerProvider(resource=resource)

        if settings.oci_apm_endpoint:
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
            from opentelemetry.sdk.trace.export import BatchSpanProcessor

            exporter = OTLPSpanExporter(
                endpoint=settings.oci_apm_endpoint,
                headers={"Authorization": f"dataKey {settings.oci_apm_public_data_key}"},
            )
            provider.add_span_processor(BatchSpanProcessor(exporter))

        trace.set_tracer_provider(provider)
        _tracer = trace.get_tracer(settings.otel_service_name)
        get_logger("otel").info("OTEL tracing initialized", endpoint=settings.oci_apm_endpoint or "console")
    except ImportError:
        get_logger("otel").warning("OTEL packages not installed, tracing disabled")
    except Exception as exc:
        get_logger("otel").error("OTEL init failed", error=str(exc))


def get_tracer():
    """Return the OTEL tracer (or None if not initialized)."""
    return _tracer


class Timer:
    """Simple context-manager timer for measuring durations."""

    def __init__(self) -> None:
        self.start = 0.0
        self.duration_ms = 0.0

    def __enter__(self) -> Timer:
        self.start = time.monotonic()
        return self

    def __exit__(self, *args: Any) -> None:
        self.duration_ms = (time.monotonic() - self.start) * 1000


# Initialize logging at import time
configure_logging(level=settings.mcp_log_level)
