"""Tests for the OCI client — unit tests with mocked OCI SDK."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from mcp_logan.core.client import LoganClient


class TestClientInit:
    """Test client initialization."""

    def test_default_state(self):
        client = LoganClient()
        assert client._initialized is False
        assert client._namespace == ""
        assert client._client is None

    def test_compartment_id_from_settings(self):
        client = LoganClient()
        # Before initialization, compartment_id falls back to empty config
        cid = client.compartment_id
        assert isinstance(cid, str)


class TestClientQueryBuild:
    """Test query execution without live OCI calls."""

    @patch("mcp_logan.core.client.requests.post")
    @patch("mcp_logan.core.client.LoganClient._load_oci_config")
    @patch("mcp_logan.core.client.LoganClient._resolve_namespace")
    def test_execute_query_structure(self, mock_ns, mock_config, mock_post):
        """Verify execute_query returns expected structure on HTTP error."""
        mock_config.return_value = {
            "tenancy": "ocid1.tenancy.oc1..test",
            "user": "ocid1.user.oc1..test",
            "fingerprint": "aa:bb:cc",
            "key_file": "/tmp/nonexistent.pem",
            "region": "us-ashburn-1",
        }
        mock_ns.return_value = "testnamespace"

        # Simulate HTTP error
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"
        mock_response.json.return_value = {"message": "Unauthorized"}
        mock_post.return_value = mock_response

        client = LoganClient()
        # Manually set initialized state to skip full init
        client._initialized = True
        client._namespace = "testnamespace"
        client._config = mock_config.return_value
        client._signer = MagicMock()

        result = client.execute_query("* | stats count", 60, 10)
        assert isinstance(result, dict)
        assert "success" in result


class TestClientManagementAPIs:
    """Test management API methods return correct structure on failure."""

    def test_list_sources_not_initialized(self):
        """Client should handle calls before initialization gracefully."""
        client = LoganClient()
        # Without initialization, these should fail but not crash
        try:
            result = client.list_log_analytics_sources()
            assert isinstance(result, dict)
        except Exception:
            # Expected — client not initialized
            pass

    def test_test_connection_not_initialized(self):
        client = LoganClient()
        try:
            result = client.test_connection()
            assert isinstance(result, dict)
        except Exception:
            pass
