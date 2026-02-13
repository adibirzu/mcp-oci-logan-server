"""Detection catalog engine — loads rules from disk, builds in-memory indexes.

Ported from src/detections/detection-catalog.ts with fixes:
- FIX #5: Reads 'query' field from detection rule JSONs (not 'detection.ocl_query')
- Graceful degradation if DETECTION_RULES_PATH unavailable
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from mcp_logan.config import settings
from mcp_logan.core.observability import get_logger

log = get_logger("detection_catalog")


class DetectionCatalog:
    """Index-based detection rule catalog with O(1) lookups."""

    def __init__(self) -> None:
        self.rules_path = Path(settings.detection_rules_path)
        self._catalog: dict[str, Any] | None = None
        self._loaded = False

        # In-memory indexes
        self._by_id: dict[str, dict[str, Any]] = {}
        self._by_platform: dict[str, list[dict[str, Any]]] = {}
        self._by_level: dict[str, list[dict[str, Any]]] = {}
        self._by_technique: dict[str, list[dict[str, Any]]] = {}
        self._by_tactic: dict[str, list[dict[str, Any]]] = {}
        self._by_stig: dict[str, list[dict[str, Any]]] = {}
        self._hunting_files: set[str] = set()

    def initialize(self) -> None:
        """Load catalog.json and build indexes."""
        if self._loaded:
            return

        catalog_path = self.rules_path / "catalog.json"

        try:
            if not catalog_path.exists():
                log.warning("detection_catalog_not_found", path=str(catalog_path))
                self._loaded = True
                return

            self._catalog = json.loads(catalog_path.read_text())

            # Discover hunting queries
            hunting_dir = self.rules_path / "hunting"
            if hunting_dir.exists():
                for f in hunting_dir.iterdir():
                    if f.suffix == ".json":
                        self._hunting_files.add(f.name)

            # Build indexes
            for entry in self._catalog.get("rules", []):
                rule_id = entry["file"].removesuffix(".json")
                self._by_id[rule_id] = entry

                # Platform index
                platform = entry.get("platform") or self._infer_platform(entry["file"])
                self._by_platform.setdefault(platform, []).append(entry)

                # Level index
                self._by_level.setdefault(entry["level"], []).append(entry)

                # MITRE technique index
                for tech in entry.get("mitre_techniques", []):
                    self._by_technique.setdefault(tech, []).append(entry)

                # MITRE tactic index
                for tactic in entry.get("mitre_tactics", []):
                    self._by_tactic.setdefault(tactic, []).append(entry)

                # STIG category index
                if entry.get("stig_category"):
                    self._by_stig.setdefault(entry["stig_category"], []).append(entry)

            self._loaded = True
            log.info(
                "detection_catalog_loaded",
                rules=len(self._by_id),
                hunting=len(self._hunting_files),
                platforms=list(self._by_platform.keys()),
            )
        except Exception as e:
            log.error("detection_catalog_load_failed", error=str(e))
            self._loaded = True  # Prevent retry loops

    @staticmethod
    def _infer_platform(filename: str) -> str:
        if filename.startswith(("oci_", "cloud_guard_")):
            return "oci"
        if filename.startswith(("linux_", "suspicious_usage_")):
            return "linux"
        if filename.startswith(("win_", "windows_")):
            return "windows"
        return "oci"

    # ------------------------------------------------------------------
    # Lookups
    # ------------------------------------------------------------------

    def get_rule(self, rule_id: str) -> dict[str, Any] | None:
        """Load full rule from disk by ID."""
        if rule_id not in self._by_id:
            return None
        return self._load_rule_file(self._by_id[rule_id]["file"])

    def get_hunting_query(self, query_id: str) -> dict[str, Any] | None:
        """Load full hunting query from disk."""
        filename = f"{query_id}.json"
        if filename not in self._hunting_files:
            return None
        return self._load_hunting_file(filename)

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def search_rules(
        self,
        *,
        platform: str | None = None,
        level: str | None = None,
        mitre_technique: str | None = None,
        mitre_tactic: str | None = None,
        stig_category: str | None = None,
        keyword: str | None = None,
    ) -> list[dict[str, str]]:
        """Search rules by filter criteria. Returns compact results."""
        # Start with most selective index
        if mitre_technique:
            candidates = self._by_technique.get(mitre_technique, [])
        elif mitre_tactic:
            candidates = self._by_tactic.get(mitre_tactic, [])
        elif platform:
            candidates = self._by_platform.get(platform, [])
        elif level:
            candidates = self._by_level.get(level, [])
        elif stig_category:
            candidates = self._by_stig.get(stig_category, [])
        else:
            candidates = self._catalog.get("rules", []) if self._catalog else []

        results = candidates

        # Apply remaining filters
        if platform and not (mitre_technique or mitre_tactic):
            pass  # Already filtered by platform
        elif platform:
            results = [r for r in results if (r.get("platform") or self._infer_platform(r["file"])) == platform]

        if level and results is not self._by_level.get(level):
            results = [r for r in results if r["level"] == level]

        if stig_category and results is not self._by_stig.get(stig_category):
            results = [r for r in results if r.get("stig_category") == stig_category]

        if keyword:
            kw = keyword.lower()
            results = [
                r for r in results
                if kw in r["title"].lower() or kw in r.get("description", "").lower()
            ]

        return [self._to_compact(r) for r in results]

    def list_rules_compact(self) -> list[dict[str, str]]:
        if not self._catalog:
            return []
        return [self._to_compact(r) for r in self._catalog.get("rules", [])]

    def list_hunting_compact(self) -> list[dict[str, str]]:
        results = []
        for filename in sorted(self._hunting_files):
            query = self._load_hunting_file(filename)
            if query:
                results.append({
                    "id": filename.removesuffix(".json"),
                    "title": query.get("title", ""),
                    "level": query.get("level", "medium"),
                    "platform": query.get("logsource", {}).get("product", "oci"),
                })
        return results

    # ------------------------------------------------------------------
    # Summary & stats
    # ------------------------------------------------------------------

    def get_summary(self) -> dict[str, Any]:
        if not self._catalog:
            return {
                "version": "0.0", "totalRules": 0, "totalHunting": 0,
                "platforms": {}, "severities": {}, "mitreTechniques": 0,
                "mitreTactics": 0, "stigControls": 0, "loaded": False,
            }
        return {
            "version": self._catalog.get("version", ""),
            "totalRules": self._catalog.get("total_rules", 0),
            "totalHunting": self._catalog.get("total_hunting", 0),
            "platforms": self._catalog.get("platforms", {}),
            "severities": self._catalog.get("severities", {}),
            "mitreTechniques": len(self._catalog.get("mitre_techniques", [])),
            "mitreTactics": len(self._catalog.get("mitre_tactics", [])),
            "stigControls": len(self._catalog.get("stig_controls", [])),
            "loaded": True,
        }

    def get_stats(self) -> dict[str, Any]:
        if not self._catalog:
            return {"loaded": False, "message": "Detection catalog not available"}
        return {
            "loaded": True,
            "version": self._catalog.get("version", ""),
            "totalRules": self._catalog.get("total_rules", 0),
            "totalHunting": len(self._hunting_files),
            "platforms": self._catalog.get("platforms", {}),
            "severities": self._catalog.get("severities", {}),
            "mitreTechniques": self._catalog.get("mitre_techniques", []),
            "mitreTactics": self._catalog.get("mitre_tactics", []),
            "stigControls": self._catalog.get("stig_controls", []),
            "indexSizes": {
                "byId": len(self._by_id),
                "byPlatform": {k: len(v) for k, v in self._by_platform.items()},
                "byLevel": {k: len(v) for k, v in self._by_level.items()},
                "byTechnique": len(self._by_technique),
                "byTactic": len(self._by_tactic),
            },
        }

    def get_mitre_coverage(self) -> dict[str, Any]:
        if not self._catalog:
            return {"loaded": False}
        coverage: dict[str, list[str]] = {}
        for tactic, entries in self._by_tactic.items():
            techniques: set[str] = set()
            for entry in entries:
                for tech in entry.get("mitre_techniques", []):
                    techniques.add(tech)
            coverage[tactic] = sorted(techniques)
        return {
            "totalTactics": len(self._catalog.get("mitre_tactics", [])),
            "totalTechniques": len(self._catalog.get("mitre_techniques", [])),
            "coverage": coverage,
        }

    def get_stig_controls(self) -> dict[str, Any]:
        if not self._catalog:
            return {"loaded": False}
        controls: dict[str, dict[str, Any]] = {}
        for entry in self._catalog.get("rules", []):
            for stig_id in entry.get("stig_ids", []):
                if stig_id not in controls:
                    controls[stig_id] = {"count": 0, "category": entry.get("stig_category", ""), "rules": []}
                controls[stig_id]["count"] += 1
                controls[stig_id]["rules"].append(entry["file"].removesuffix(".json"))
        return {"totalControls": len(self._catalog.get("stig_controls", [])), "controls": controls}

    @property
    def is_loaded(self) -> bool:
        return self._loaded and self._catalog is not None

    @property
    def rule_count(self) -> int:
        return self._catalog.get("total_rules", 0) if self._catalog else 0

    # ------------------------------------------------------------------
    # Private
    # ------------------------------------------------------------------

    def _to_compact(self, entry: dict[str, Any]) -> dict[str, str]:
        platform = entry.get("platform") or self._infer_platform(entry["file"])
        if platform not in ("oci", "linux", "windows"):
            platform = "oci"
        return {
            "id": entry["file"].removesuffix(".json"),
            "title": entry["title"],
            "level": entry["level"],
            "platform": platform,
        }

    def _load_rule_file(self, filename: str) -> dict[str, Any] | None:
        try:
            filepath = self.rules_path / filename
            if not filepath.exists():
                return None
            return json.loads(filepath.read_text())
        except Exception:
            return None

    def _load_hunting_file(self, filename: str) -> dict[str, Any] | None:
        try:
            filepath = self.rules_path / "hunting" / filename
            if not filepath.exists():
                return None
            return json.loads(filepath.read_text())
        except Exception:
            return None
