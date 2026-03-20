"""Configuration via pydantic-settings. All env vars loaded once at startup."""

from __future__ import annotations

import os
from pathlib import Path

from pydantic import AliasChoices, ConfigDict, Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Server settings sourced from environment variables."""

    model_config = ConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # OCI authentication
    oci_region: str = "eu-frankfurt-1"
    oci_profile: str = Field(
        default="DEFAULT",
        validation_alias=AliasChoices("OCI_PROFILE", "OCI_CLI_PROFILE"),
    )
    oci_config_file: str = "~/.oci/config"

    # Compartment — if empty, falls back to tenancy root with subtree=True
    logan_compartment_id: str = ""

    # Logan-specific region override (takes priority over oci_region)
    logan_region: str = ""

    # Detection rules path
    detection_rules_path: str = str(
        Path.home() / "dev" / "oci-log-analytics-detections" / "queries"
    )

    # MCP transport
    mcp_transport: str = "stdio"
    mcp_host: str = "0.0.0.0"
    mcp_port: int = 8001

    # Logging & debug
    mcp_log_level: str = "INFO"
    mcp_debug: bool = False

    # OTEL / APM
    otel_tracing_enabled: bool = False
    otel_service_name: str = "mcp-server-logan"
    oci_apm_endpoint: str = ""
    oci_apm_public_data_key: str = ""

    @property
    def region(self) -> str:
        """Effective OCI region (logan_region takes priority)."""
        return self.logan_region or self.oci_region

    @property
    def debug(self) -> bool:
        """Debug mode enabled."""
        return self.mcp_debug or os.getenv("LOGAN_DEBUG", "").lower() == "true"


# Singleton loaded once at import
settings = Settings()
