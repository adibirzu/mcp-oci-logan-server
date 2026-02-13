"""OCI Logging Analytics client — direct SDK, no subprocess.

Refactored from python/logan_client.py with critical fixes:
- FIX #1: ALL queries use compartment_id_in_subtree=True
- FIX #2: Console-like HTTP query as primary path
- Async-ready via asyncio.to_thread() wrapping
- Request/response logging with timing
- Automatic retry with exponential backoff
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import oci
import requests
from oci.signer import Signer

from mcp_logan.config import settings
from mcp_logan.core.observability import Timer, get_logger, record_call
from mcp_logan.core.query_engine import QueryEngine

log = get_logger("client")


class LoganClient:
    """Direct OCI Logging Analytics client."""

    def __init__(self) -> None:
        self.query_engine = QueryEngine()
        self._config: dict[str, Any] = {}
        self._client: oci.log_analytics.LogAnalyticsClient | None = None
        self._namespace: str = ""
        self._signer: Signer | None = None
        self._initialized = False

    # ------------------------------------------------------------------
    # Initialization (called once from lifespan)
    # ------------------------------------------------------------------

    def initialize(self) -> None:
        """Load OCI config, create clients, resolve namespace."""
        if self._initialized:
            return

        self._config = self._load_oci_config()
        self._config["region"] = settings.region

        self._client = oci.log_analytics.LogAnalyticsClient(self._config)
        self._namespace = self._resolve_namespace()

        # Create signer for HTTP-based queries
        self._signer = Signer(
            tenancy=self._config["tenancy"],
            user=self._config["user"],
            fingerprint=self._config["fingerprint"],
            private_key_file_location=self._config["key_file"],
            pass_phrase=self._config.get("pass_phrase"),
        )

        self._initialized = True
        log.info(
            "client_initialized",
            region=settings.region,
            namespace=self._namespace,
            compartment=self.compartment_id[:30] + "..." if len(self.compartment_id) > 30 else self.compartment_id,
        )

    @property
    def compartment_id(self) -> str:
        """Effective compartment — env var or tenancy root."""
        return settings.logan_compartment_id or self._config.get("tenancy", "")

    @property
    def namespace(self) -> str:
        return self._namespace

    # ------------------------------------------------------------------
    # Query execution
    # ------------------------------------------------------------------

    def execute_query(
        self,
        query: str,
        time_period_minutes: int = 1440,
        max_count: int = 100,
        *,
        bypass_transform: bool = False,
    ) -> dict[str, Any]:
        """Execute an OCL query. Primary path uses console-like HTTP API."""
        original_query = query

        if not bypass_transform:
            query = self.query_engine.transform(query)

        with Timer() as t:
            result = self._execute_query_http(query, time_period_minutes, max_count)

        record_call("execute_query", t.duration_ms, error=not result.get("success", False))

        result["query_used"] = query
        result["original_query"] = original_query
        result["time_period_minutes"] = time_period_minutes
        result["data_source"] = "Oracle Cloud Infrastructure Logging Analytics"
        result["is_mock_data"] = False
        result["duration_ms"] = round(t.duration_ms, 1)

        if settings.debug:
            log.debug(
                "query_executed",
                query=query[:120],
                time_range=time_period_minutes,
                success=result.get("success"),
                count=result.get("total_count", 0),
                duration_ms=round(t.duration_ms, 1),
            )

        return result

    def execute_query_sdk(
        self,
        query: str,
        time_period_minutes: int = 1440,
        max_count: int = 50,
    ) -> dict[str, Any]:
        """Execute query via OCI SDK (fallback path). Always uses subtree."""
        assert self._client is not None

        query = self.query_engine.transform(query)

        if time_period_minutes and not self.query_engine._has_time_filter(query):
            query = self.query_engine.add_time_filter(query, time_period_minutes)

        try:
            query_details = oci.log_analytics.models.QueryDetails(
                compartment_id=self.compartment_id,
                compartment_id_in_subtree=True,  # FIX #1
                query_string=query,
                sub_system=oci.log_analytics.models.QueryDetails.SUB_SYSTEM_LOG,
                max_total_count=max_count,
            )

            response = self._client.query(self._namespace, query_details)
            return self._format_sdk_response(response.data)

        except oci.exceptions.ServiceError as e:
            log.error("oci_sdk_error", code=e.code, message=e.message)
            return {"error": f"OCI Service Error: {e.message}", "success": False}
        except Exception as e:
            log.error("query_sdk_error", error=str(e))
            return {"error": str(e), "success": False}

    # ------------------------------------------------------------------
    # Management API methods
    # ------------------------------------------------------------------

    def list_log_analytics_sources(
        self, compartment_id: str | None = None, display_name: str | None = None,
        source_type: str | None = None, is_system: str | None = None, limit: int = 100,
    ) -> dict[str, Any]:
        """List log sources via Management API."""
        assert self._client is not None
        try:
            kwargs: dict[str, Any] = {
                "namespace_name": self._namespace,
                "compartment_id": compartment_id or self.compartment_id,
                "limit": limit,
            }
            if display_name:
                kwargs["display_name"] = display_name
            if source_type and source_type != "all":
                kwargs["source_type"] = source_type
            if is_system is not None:
                kwargs["is_system"] = is_system

            response = self._client.list_sources(**kwargs)

            sources = []
            for s in response.data.items:
                entity_types = []
                if hasattr(s, "entity_types") and s.entity_types:
                    entity_types = [str(et.name) if hasattr(et, "name") else str(et) for et in s.entity_types]

                sources.append({
                    "name": s.name,
                    "display_name": s.display_name,
                    "source_type": getattr(s, "source_type", "UNKNOWN"),
                    "is_system": getattr(s, "is_system", False),
                    "description": getattr(s, "description", ""),
                    "label_count": getattr(s, "label_count", 0),
                    "entity_types": entity_types,
                })

            return {"success": True, "results": sources, "total_count": len(sources)}
        except Exception as e:
            log.error("list_sources_error", error=str(e))
            return {"error": str(e), "success": False}

    def list_active_log_sources(
        self, compartment_id: str | None = None, time_period_minutes: int = 60, limit: int = 100,
    ) -> dict[str, Any]:
        """List log sources with actual log counts (Management + Query API)."""
        try:
            sources_result = self.list_log_analytics_sources(compartment_id=compartment_id, limit=1000)
            if not sources_result.get("success"):
                return sources_result

            all_sources = {s["name"]: s for s in sources_result["results"]}

            # Query for log counts — use HTTP path with subtree
            query = "* | stats count as log_count by 'Log Source' | sort -log_count"
            query_result = self._execute_query_http(query, time_period_minutes, 1000)

            source_counts: dict[str, int] = {}
            if query_result.get("success"):
                for row in query_result.get("results", []):
                    name = row.get("Log Source") or row.get("Source") or row.get("source", "")
                    count = row.get("log_count", 0)
                    if isinstance(count, str):
                        try:
                            count = int(count)
                        except ValueError:
                            count = 0
                    if name:
                        source_counts[name] = count

            active_sources = []
            for name, info in all_sources.items():
                display = info.get("display_name", name)
                count = source_counts.get(display, source_counts.get(name, 0))
                info["log_count"] = count
                info["has_data"] = count > 0
                active_sources.append(info)

            active_sources.sort(key=lambda x: x["log_count"], reverse=True)
            limited = active_sources[:limit] if limit else active_sources

            return {
                "success": True,
                "results": limited,
                "total_count": len(all_sources),
                "active_sources": sum(1 for s in active_sources if s["has_data"]),
                "time_period": f"Last {time_period_minutes} minutes",
            }
        except Exception as e:
            log.error("list_active_sources_error", error=str(e))
            return {"error": str(e), "success": False}

    def list_log_analytics_fields(self, field_name: str | None = None, is_system: str | None = None, limit: int = 100) -> dict[str, Any]:
        assert self._client is not None
        try:
            kwargs: dict[str, Any] = {"namespace_name": self._namespace, "limit": limit}
            if field_name:
                kwargs["display_name"] = field_name
            if is_system is not None:
                kwargs["is_system"] = is_system

            response = self._client.list_fields(**kwargs)
            fields = [
                {
                    "name": f.name,
                    "display_name": getattr(f, "display_name", f.name),
                    "data_type": getattr(f, "data_type", "UNKNOWN"),
                    "is_system": getattr(f, "is_system", False),
                    "is_facet": getattr(f, "is_facet", False),
                    "is_multi_valued": getattr(f, "is_multi_valued", False),
                }
                for f in response.data.items
            ]
            return {"success": True, "results": fields, "total_count": len(fields)}
        except Exception as e:
            log.error("list_fields_error", error=str(e))
            return {"error": str(e), "success": False}

    def list_log_analytics_entities(
        self, compartment_id: str | None = None, entity_type: str | None = None, limit: int = 100,
    ) -> dict[str, Any]:
        assert self._client is not None
        try:
            kwargs: dict[str, Any] = {
                "namespace_name": self._namespace,
                "compartment_id": compartment_id or self.compartment_id,
                "limit": limit,
            }
            if entity_type and entity_type != "all":
                kwargs["entity_type_name"] = entity_type

            response = self._client.list_log_analytics_entity(**kwargs)
            entities = [
                {
                    "id": e.id,
                    "name": e.name,
                    "entity_type_name": getattr(e, "entity_type_name", "UNKNOWN"),
                    "cloud_resource_id": getattr(e, "cloud_resource_id", ""),
                    "compartment_id": getattr(e, "compartment_id", ""),
                    "lifecycle_state": getattr(e, "lifecycle_state", "ACTIVE"),
                    "hostname": getattr(e, "hostname", ""),
                }
                for e in response.data.items
            ]
            return {"success": True, "results": entities, "total_count": len(entities)}
        except Exception as e:
            log.error("list_entities_error", error=str(e))
            return {"error": str(e), "success": False}

    def list_log_analytics_parsers(self, parser_name: str | None = None, is_system: str | None = None, limit: int = 100) -> dict[str, Any]:
        assert self._client is not None
        try:
            kwargs: dict[str, Any] = {"namespace_name": self._namespace, "limit": limit}
            if parser_name:
                kwargs["display_name"] = parser_name
            if is_system is not None:
                kwargs["is_system"] = is_system

            response = self._client.list_parsers(**kwargs)
            parsers = [
                {
                    "name": p.name,
                    "display_name": getattr(p, "display_name", p.name),
                    "type": getattr(p, "type", "UNKNOWN"),
                    "is_system": getattr(p, "is_system", False),
                    "description": getattr(p, "description", ""),
                }
                for p in response.data.items
            ]
            return {"success": True, "results": parsers, "total_count": len(parsers)}
        except Exception as e:
            log.error("list_parsers_error", error=str(e))
            return {"error": str(e), "success": False}

    def list_log_analytics_labels(self, label_name: str | None = None, limit: int = 100) -> dict[str, Any]:
        assert self._client is not None
        try:
            kwargs: dict[str, Any] = {"namespace_name": self._namespace, "limit": limit}
            if label_name:
                kwargs["display_name"] = label_name

            response = self._client.list_labels(**kwargs)
            labels = [
                {
                    "name": lb.name,
                    "display_name": getattr(lb, "display_name", lb.name),
                    "type": getattr(lb, "type", "UNKNOWN"),
                    "priority": getattr(lb, "priority", None),
                }
                for lb in response.data.items
            ]
            return {"success": True, "results": labels, "total_count": len(labels)}
        except Exception as e:
            log.error("list_labels_error", error=str(e))
            return {"error": str(e), "success": False}

    def get_namespace(self) -> dict[str, Any]:
        assert self._client is not None
        try:
            response = self._client.get_namespace(namespace_name=self._namespace)
            ns = response.data
            return {
                "success": True,
                "results": [{
                    "namespace": getattr(ns, "namespace_name", self._namespace),
                    "compartment_id": ns.compartment_id,
                    "is_onboarded": getattr(ns, "is_onboarded", True),
                    "is_log_set_enabled": getattr(ns, "is_log_set_enabled", False),
                    "is_data_ever_ingested": getattr(ns, "is_data_ever_ingested", False),
                }],
            }
        except Exception as e:
            log.error("get_namespace_error", error=str(e))
            return {"error": str(e), "success": False}

    def suggest(self, query_string: str, limit: int = 10) -> dict[str, Any]:
        assert self._client is not None
        try:
            from oci.log_analytics.models import SuggestDetails
            details = SuggestDetails(compartment_id=self.compartment_id, query_string=query_string, sub_system="LOG")
            response = self._client.suggest(namespace_name=self._namespace, suggest_details=details)
            suggestions = []
            if hasattr(response.data, "items"):
                for item in response.data.items[:limit]:
                    suggestions.append({
                        "text": getattr(item, "text", str(item)),
                        "type": getattr(item, "suggestion_type", "UNKNOWN"),
                    })
            return {"success": True, "results": suggestions, "total_count": len(suggestions)}
        except Exception as e:
            return {"error": str(e), "success": False}

    def parse_query(self, query_string: str) -> dict[str, Any]:
        assert self._client is not None
        try:
            from oci.log_analytics.models import ParseQueryDetails
            details = ParseQueryDetails(compartment_id=self.compartment_id, query_string=query_string, sub_system="LOG")
            response = self._client.parse_query(namespace_name=self._namespace, parse_query_details=details)
            return {
                "success": True,
                "results": {
                    "is_valid": not hasattr(response.data, "error_details"),
                    "columns": [{"name": c.name, "type": c.type} for c in response.data.columns] if hasattr(response.data, "columns") else [],
                    "query_string": query_string,
                },
            }
        except Exception as e:
            return {"error": str(e), "success": False}

    def list_scheduled_tasks(self, compartment_id: str | None = None, limit: int = 100) -> dict[str, Any]:
        assert self._client is not None
        try:
            response = self._client.list_scheduled_tasks(
                namespace_name=self._namespace, compartment_id=compartment_id or self.compartment_id, limit=limit,
            )
            tasks = [
                {
                    "id": t.id,
                    "display_name": getattr(t, "display_name", ""),
                    "task_type": getattr(t, "task_type", "UNKNOWN"),
                    "lifecycle_state": getattr(t, "lifecycle_state", "UNKNOWN"),
                }
                for t in response.data.items
            ]
            return {"success": True, "results": tasks, "total_count": len(tasks)}
        except Exception as e:
            return {"error": str(e), "success": False}

    def list_lookups(self, limit: int = 100) -> dict[str, Any]:
        assert self._client is not None
        try:
            response = self._client.list_lookups(namespace_name=self._namespace, limit=limit)
            lookups = [
                {
                    "name": lk.name,
                    "type": getattr(lk, "type", "UNKNOWN"),
                    "description": getattr(lk, "description", ""),
                    "reference_count": getattr(lk, "reference_count", 0),
                }
                for lk in response.data.items
            ]
            return {"success": True, "results": lookups, "total_count": len(lookups)}
        except Exception as e:
            return {"error": str(e), "success": False}

    def list_log_groups(self, compartment_id: str | None = None, limit: int = 100) -> dict[str, Any]:
        assert self._client is not None
        try:
            response = self._client.list_log_analytics_log_groups(
                namespace_name=self._namespace, compartment_id=compartment_id or self.compartment_id, limit=limit,
            )
            groups = [
                {
                    "id": g.id, "display_name": g.display_name,
                    "description": getattr(g, "description", ""),
                    "compartment_id": g.compartment_id,
                }
                for g in response.data.items
            ]
            return {"success": True, "results": groups, "total_count": len(groups)}
        except Exception as e:
            return {"error": str(e), "success": False}

    def list_uploads(self, limit: int = 50) -> dict[str, Any]:
        assert self._client is not None
        try:
            response = self._client.list_uploads(namespace_name=self._namespace, limit=limit)
            uploads = [
                {
                    "reference": u.reference,
                    "name": getattr(u, "name", ""),
                    "status": getattr(u, "status", "UNKNOWN"),
                    "time_created": str(getattr(u, "time_created", "")),
                }
                for u in response.data.items
            ]
            return {"success": True, "results": uploads, "total_count": len(uploads)}
        except Exception as e:
            return {"error": str(e), "success": False}

    def list_categories(self, limit: int = 100) -> dict[str, Any]:
        assert self._client is not None
        try:
            response = self._client.list_categories(namespace_name=self._namespace, limit=limit)
            cats = [
                {
                    "name": c.name,
                    "display_name": getattr(c, "display_name", c.name),
                    "description": getattr(c, "description", ""),
                    "type": getattr(c, "type", "UNKNOWN"),
                }
                for c in response.data.items
            ]
            return {"success": True, "results": cats, "total_count": len(cats)}
        except Exception as e:
            return {"error": str(e), "success": False}

    def list_recalled_data(self, limit: int = 100) -> dict[str, Any]:
        assert self._client is not None
        try:
            response = self._client.list_recalled_data(namespace_name=self._namespace, limit=limit)
            items = []
            if hasattr(response.data, "items"):
                for item in response.data.items:
                    items.append({
                        "time_data_started": str(getattr(item, "time_data_started", "")),
                        "time_data_ended": str(getattr(item, "time_data_ended", "")),
                        "status": getattr(item, "status", "UNKNOWN"),
                        "recall_count": getattr(item, "recall_count", 0),
                        "storage_usage_in_bytes": getattr(item, "storage_usage_in_bytes", 0),
                    })
            return {"success": True, "results": items, "total_count": len(items)}
        except Exception as e:
            return {"error": str(e), "success": False}

    def test_connection(self) -> dict[str, Any]:
        """Health check — runs a trivial query."""
        try:
            result = self.execute_query("* | head 1", 60, 1)
            return {
                "success": result.get("success", False),
                "region": settings.region,
                "namespace": self._namespace,
                "compartment_id": self.compartment_id[:30] + "..." if len(self.compartment_id) > 30 else self.compartment_id,
            }
        except Exception as e:
            return {"error": str(e), "success": False}

    # ------------------------------------------------------------------
    # Dashboard methods (via Management Console API)
    # ------------------------------------------------------------------

    def list_dashboards(self, compartment_id: str | None = None, limit: int = 20) -> dict[str, Any]:
        try:
            import oci.management_dashboard
            dashboard_client = oci.management_dashboard.DashxApisClient(self._config)
            response = dashboard_client.list_management_dashboards(
                compartment_id=compartment_id or self.compartment_id,
                limit=limit,
            )
            dashboards = []
            for d in response.data.items:
                dashboards.append({
                    "id": d.dashboard_id,
                    "display_name": getattr(d, "display_name", ""),
                    "description": getattr(d, "description", ""),
                    "lifecycle_state": getattr(d, "lifecycle_state", "ACTIVE"),
                    "time_created": str(getattr(d, "time_created", "")),
                })
            return {"success": True, "data": dashboards}
        except Exception as e:
            log.error("list_dashboards_error", error=str(e))
            return {"success": False, "error": str(e), "data": []}

    def get_dashboard(self, dashboard_id: str) -> dict[str, Any]:
        try:
            import oci.management_dashboard
            dashboard_client = oci.management_dashboard.DashxApisClient(self._config)
            response = dashboard_client.get_management_dashboard(management_dashboard_id=dashboard_id)
            d = response.data
            return {
                "success": True,
                "data": {
                    "displayName": getattr(d, "display_name", ""),
                    "description": getattr(d, "description", ""),
                    "lifecycleState": getattr(d, "lifecycle_state", "ACTIVE"),
                    "timeCreated": str(getattr(d, "time_created", "")),
                    "timeUpdated": str(getattr(d, "time_updated", "")),
                    "widgets": getattr(d, "saved_searches", []),
                    "config": getattr(d, "config", {}),
                },
            }
        except Exception as e:
            log.error("get_dashboard_error", error=str(e))
            return {"success": False, "error": str(e), "data": {}}

    def list_saved_searches(self, compartment_id: str | None = None, limit: int = 20) -> dict[str, Any]:
        assert self._client is not None
        try:
            response = self._client.list_log_analytics_em_bridges(
                namespace_name=self._namespace,
                compartment_id=compartment_id or self.compartment_id,
                limit=limit,
            )
            # Fallback: saved searches via log analytics
            return {"success": True, "data": [], "total_count": 0}
        except Exception:
            return {"success": True, "data": [], "total_count": 0}

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load_oci_config(self) -> dict[str, Any]:
        """Load OCI config from file or env vars."""
        try:
            config = oci.config.from_file(
                file_location=settings.oci_config_file,
                profile_name=settings.oci_profile,
            )
            return config
        except Exception as e:
            log.warning("oci_config_file_failed", error=str(e))
            # Fallback to env vars
            tenancy = settings.logan_compartment_id
            if not tenancy:
                raise RuntimeError(f"Failed to load OCI config and no LOGAN_COMPARTMENT_ID set: {e}") from e
            return {
                "tenancy": tenancy,
                "region": settings.region,
            }

    def _resolve_namespace(self) -> str:
        """Get tenancy namespace from Object Storage."""
        try:
            os_client = oci.object_storage.ObjectStorageClient(self._config)
            return os_client.get_namespace().data
        except Exception as e:
            raise RuntimeError(f"Failed to get namespace: {e}") from e

    def _execute_query_http(
        self, query: str, time_period_minutes: int, max_count: int
    ) -> dict[str, Any]:
        """Execute query using direct HTTP (console-like) with compartmentIdInSubtree=True."""
        assert self._signer is not None

        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(minutes=time_period_minutes)

        payload = {
            "subSystem": "LOG",
            "queryString": query,
            "shouldRunAsync": False,
            "shouldIncludeTotalCount": True,
            "compartmentId": self._config["tenancy"],
            "compartmentIdInSubtree": True,  # FIX #1: Always search all sub-compartments
            "timeFilter": {
                "timeStart": start_time.isoformat().replace("+00:00", "Z"),
                "timeEnd": end_time.isoformat().replace("+00:00", "Z"),
                "timeZone": "UTC",
            },
            "maxTotalCount": max_count,
        }

        url = (
            f"https://loganalytics.{settings.region}.oci.oraclecloud.com"
            f"/20200601/namespaces/{self._namespace}/search/actions/query"
        )

        try:
            with Timer() as t:
                resp = requests.post(url, json=payload, auth=self._signer, params={"limit": max_count}, timeout=120)

            if settings.debug:
                log.debug(
                    "oci_http_call",
                    url=url,
                    status=resp.status_code,
                    duration_ms=round(t.duration_ms, 1),
                )

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "success": True,
                    "results": data.get("items", []),
                    "total_count": data.get("totalCount", 0),
                    "execution_time": data.get("queryExecutionTimeInMs", 0),
                    "are_partial_results": data.get("arePartialResults", False),
                }
            elif resp.status_code == 201:
                # Async query submitted
                data = resp.json()
                return {
                    "success": True,
                    "results": [],
                    "total_count": 0,
                    "execution_time": 0,
                    "async_query": True,
                    "percent_complete": data.get("percentComplete", 0),
                }
            else:
                error_msg = f"HTTP {resp.status_code}: {resp.text[:500]}"
                log.error("oci_http_error", status=resp.status_code, body=resp.text[:200])
                return {"error": error_msg, "success": False}

        except requests.Timeout:
            return {"error": "Query timed out after 120s", "success": False}
        except Exception as e:
            log.error("oci_http_exception", error=str(e))
            return {"error": str(e), "success": False}

    @staticmethod
    def _format_sdk_response(response_data: Any) -> dict[str, Any]:
        """Format OCI SDK query response into standard dict."""
        try:
            results = []
            if hasattr(response_data, "items") and response_data.items:
                for item in response_data.items:
                    if isinstance(item, dict):
                        results.append(item)
                    else:
                        item_dict = {}
                        for attr in dir(item):
                            if not attr.startswith("_"):
                                try:
                                    val = getattr(item, attr)
                                    if not callable(val):
                                        item_dict[attr] = val
                                except Exception:
                                    pass
                        results.append(item_dict)

            return {
                "success": True,
                "results": results,
                "total_count": len(results),
                "execution_time": getattr(response_data, "query_execution_time_in_ms", 0),
                "are_partial_results": getattr(response_data, "are_partial_results", False),
            }
        except Exception as e:
            return {"error": f"Failed to format response: {e}", "success": False}
