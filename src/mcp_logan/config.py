"""Configuration via pydantic-settings. All env vars loaded once at startup."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

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
    detection_rules_path: str = Field(
        default=str(Path.home() / "dev" / "oci-log-analytics-detections" / "queries"),
        validation_alias=AliasChoices("DETECTION_RULES_PATH", "LOGAN_DETECTION_RULES_PATH"),
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

    @property
    def detection_rules_dir(self) -> Path:
        """Expanded detection rules directory."""
        return Path(self.detection_rules_path).expanduser().resolve()

    @property
    def detection_catalog_path(self) -> Path:
        """Path to the generated detection catalog manifest."""
        return self.detection_rules_dir / "catalog.json"

    @property
    def detection_hunting_dir(self) -> Path:
        """Path to hunting query JSON files."""
        return self.detection_rules_dir / "hunting"

    def detection_content_status(self) -> dict[str, Any]:
        """Validate canonical detection content paths for health/reporting."""
        rules_dir = self.detection_rules_dir
        catalog_path = self.detection_catalog_path
        hunting_dir = self.detection_hunting_dir
        return {
            "rulesPath": str(rules_dir),
            "catalogPath": str(catalog_path),
            "huntingPath": str(hunting_dir),
            "rulesPathExists": rules_dir.exists(),
            "catalogExists": catalog_path.exists(),
            "huntingPathExists": hunting_dir.exists(),
        }


# Singleton loaded once at import
settings = Settings()
