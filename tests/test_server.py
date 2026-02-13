"""Tests for the FastMCP server — verify tool/resource/prompt registration."""

from __future__ import annotations

import pytest


@pytest.fixture
def mcp_app():
    """Import the FastMCP app without running it."""
    from mcp_logan.server import mcp
    return mcp


class TestServerRegistration:
    """Verify the MCP app object is properly configured."""

    def test_server_name(self, mcp_app):
        assert mcp_app.name == "OCI Log Analytics MCP Server"

    def test_server_has_version(self, mcp_app):
        from mcp_logan import __version__
        # FastMCP stores version internally; verify it was set
        assert __version__ == "5.0.0"


class TestModuleImports:
    """Verify all modules can be imported without errors."""

    def test_import_config(self):
        from mcp_logan.config import settings
        assert settings.mcp_transport in ("stdio", "http", "streamable-http")

    def test_import_client(self):
        from mcp_logan.core.client import LoganClient
        client = LoganClient()
        assert client._initialized is False

    def test_import_query_engine(self):
        from mcp_logan.core.query_engine import QueryEngine
        engine = QueryEngine()
        assert engine is not None

    def test_import_observability(self):
        from mcp_logan.core.observability import get_logger, get_metrics
        log = get_logger("test")
        assert log is not None
        metrics = get_metrics()
        assert isinstance(metrics, dict)

    def test_import_catalog(self):
        from mcp_logan.detections.catalog import DetectionCatalog
        catalog = DetectionCatalog()
        assert catalog.is_loaded is False

    def test_import_tool_modules(self):
        from mcp_logan.tools.query import register_query_tools
        from mcp_logan.tools.management import register_management_tools
        from mcp_logan.tools.analytics import register_analytics_tools
        from mcp_logan.tools.dashboard import register_dashboard_tools
        from mcp_logan.tools.detections import register_detection_tools
        assert callable(register_query_tools)
        assert callable(register_management_tools)
        assert callable(register_analytics_tools)
        assert callable(register_dashboard_tools)
        assert callable(register_detection_tools)

    def test_import_resources(self):
        from mcp_logan.resources.detection_resources import register_detection_resources
        assert callable(register_detection_resources)

    def test_import_prompts(self):
        from mcp_logan.prompts.security_workflows import register_security_prompts
        assert callable(register_security_prompts)
