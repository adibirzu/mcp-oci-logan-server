#!/usr/bin/env python3
"""
OCI Dashboard Client for retrieving dashboards from OCI Management Dashboard service

This client integrates with the OCI Management Dashboard API (DashxApis) to:
- List management dashboards in a compartment
- Get dashboard details including widgets/tiles
- Export dashboards as JSON
- List saved searches
"""

import oci
import oci.object_storage
from oci.management_dashboard import DashxApisClient
import json
import sys
import os
import argparse
from datetime import datetime
from typing import Optional, Dict, Any, List


class DashboardClient:
    """Client for OCI Management Dashboard API operations."""

    def __init__(self, compartment_id: Optional[str] = None):
        """
        Initialize the Dashboard Client.

        Args:
            compartment_id: OCI Compartment OCID. If not provided, uses
                           DASHBOARD_COMPARTMENT_ID env var or tenancy from config.
        """
        self.config = self._load_oci_config()

        # Prioritize environment variables passed from the calling process
        self.region = os.getenv('DASHBOARD_REGION') or self.config.get("region", "us-ashburn-1")

        # Use provided compartment_id, then environment variable, then config tenancy
        self.compartment_id = compartment_id or os.getenv('DASHBOARD_COMPARTMENT_ID') or self.config.get("tenancy")

        if not self.compartment_id:
            raise Exception("Compartment ID must be provided via parameter, DASHBOARD_COMPARTMENT_ID environment variable, or OCI config 'tenancy'.")

        # Set the region for the client
        self.config["region"] = self.region

        # Initialize the Management Dashboard client (DashxApis)
        self.dashboard_client = DashxApisClient(self.config)
        self.namespace = self._get_namespace()

        # Debug info only for explicit debugging
        if os.getenv('DASHBOARD_DEBUG') == 'true':
            sys.stderr.write(f"DashboardClient initialized with:\n")
            sys.stderr.write(f"  Region: {self.region}\n")
            sys.stderr.write(f"  Compartment ID: {self.compartment_id}\n")

    def _load_oci_config(self) -> Dict[str, str]:
        """Load OCI configuration, allowing for environment variable overrides."""
        try:
            # Attempt to load from default file, but allow overrides later
            config = oci.config.from_file()
            # If region is explicitly set in env, override config
            if os.getenv('DASHBOARD_REGION'):
                config['region'] = os.getenv('DASHBOARD_REGION')
            return config
        except Exception as e:
            # If config file fails, try to create a minimal config from env vars
            if os.getenv('OCI_TENANCY') and os.getenv('OCI_USER') and os.getenv('OCI_FINGERPRINT') and \
               os.getenv('OCI_KEY_FILE') and os.getenv('DASHBOARD_REGION'):
                sys.stderr.write("Warning: OCI config file not found, attempting to use environment variables for config.\n")
                return {
                    "tenancy": os.getenv('OCI_TENANCY'),
                    "user": os.getenv('OCI_USER'),
                    "fingerprint": os.getenv('OCI_FINGERPRINT'),
                    "key_file": os.getenv('OCI_KEY_FILE'),
                    "region": os.getenv('DASHBOARD_REGION')
                }
            raise Exception(f"Failed to load OCI config: {e}. Ensure ~/.oci/config is set up or all OCI_* env vars are present.")

    def _get_namespace(self) -> str:
        """Get tenancy namespace from Object Storage."""
        try:
            object_storage_client = oci.object_storage.ObjectStorageClient(self.config)
            namespace = object_storage_client.get_namespace().data
            return namespace
        except Exception as e:
            raise Exception(f"Failed to get namespace: {e}")

    def _serialize_datetime(self, obj: Any) -> Any:
        """Helper to serialize datetime objects for JSON output."""
        if isinstance(obj, datetime):
            return obj.isoformat()
        return obj

    def _dashboard_to_dict(self, dashboard: Any) -> Dict[str, Any]:
        """Convert OCI dashboard object to dictionary."""
        result = {}
        for attr in ['id', 'display_name', 'description', 'compartment_id',
                     'provider_id', 'provider_name', 'provider_version',
                     'is_oob_dashboard', 'time_created', 'time_updated',
                     'lifecycle_state', 'freeform_tags', 'defined_tags',
                     'dashboard_type', 'tiles', 'data_config', 'screen_image',
                     'nls', 'ui_config', 'parameters_config', 'features_config',
                     'drilldown_config', 'is_show_in_home', 'metadata_version',
                     'is_show_description']:
            value = getattr(dashboard, attr, None)
            if value is not None:
                # Convert snake_case to camelCase for consistency
                camel_key = ''.join(word.capitalize() if i > 0 else word
                                   for i, word in enumerate(attr.split('_')))
                result[camel_key] = self._serialize_datetime(value)
        return result

    def _saved_search_to_dict(self, saved_search: Any) -> Dict[str, Any]:
        """Convert OCI saved search object to dictionary."""
        result = {}
        for attr in ['id', 'display_name', 'description', 'compartment_id',
                     'provider_id', 'provider_name', 'provider_version',
                     'is_oob_saved_search', 'time_created', 'time_updated',
                     'lifecycle_state', 'freeform_tags', 'defined_tags',
                     'type', 'ui_config', 'data_config', 'screen_image',
                     'metadata_version', 'widget_template', 'widget_vm',
                     'nls', 'parameters_config', 'features_config', 'drilldown_config']:
            value = getattr(saved_search, attr, None)
            if value is not None:
                camel_key = ''.join(word.capitalize() if i > 0 else word
                                   for i, word in enumerate(attr.split('_')))
                result[camel_key] = self._serialize_datetime(value)
        return result

    def list_dashboards(self, display_name: Optional[str] = None,
                       lifecycle_state: str = "ACTIVE",
                       limit: int = 50) -> Dict[str, Any]:
        """
        List management dashboards in the compartment.

        Args:
            display_name: Filter by display name (partial match)
            lifecycle_state: Filter by lifecycle state (ACTIVE, CREATING, etc.)
            limit: Maximum number of dashboards to return (1-100)

        Returns:
            Dictionary with success status, dashboards list, and metadata
        """
        try:
            dashboards = []
            page = None
            count = 0

            while count < limit:
                # Calculate how many more we need
                remaining = limit - count
                page_size = min(remaining, 100)  # API max is typically 100

                response = self.dashboard_client.list_management_dashboards(
                    compartment_id=self.compartment_id,
                    display_name=display_name,
                    lifecycle_state=lifecycle_state,
                    limit=page_size,
                    page=page
                )

                for item in response.data.items:
                    dashboard_summary = {
                        'id': item.id,
                        'displayName': item.display_name,
                        'description': getattr(item, 'description', None),
                        'compartmentId': item.compartment_id,
                        'providerId': getattr(item, 'provider_id', None),
                        'providerName': getattr(item, 'provider_name', None),
                        'isOobDashboard': getattr(item, 'is_oob_dashboard', False),
                        'timeCreated': self._serialize_datetime(getattr(item, 'time_created', None)),
                        'timeUpdated': self._serialize_datetime(getattr(item, 'time_updated', None)),
                        'lifecycleState': getattr(item, 'lifecycle_state', None),
                        'freeformTags': getattr(item, 'freeform_tags', {}),
                        'definedTags': getattr(item, 'defined_tags', {})
                    }
                    dashboards.append(dashboard_summary)
                    count += 1
                    if count >= limit:
                        break

                # Check if there are more pages
                if response.has_next_page and count < limit:
                    page = response.next_page
                else:
                    break

            return {
                "success": True,
                "dashboards": dashboards,
                "totalCount": len(dashboards),
                "compartmentId": self.compartment_id,
                "region": self.region
            }

        except oci.exceptions.ServiceError as e:
            sys.stderr.write(f"OCI Service Error listing dashboards: Code={e.code}, Message={e.message}\n")
            return {"error": f"OCI Service Error: {e.message}", "success": False, "dashboards": []}
        except Exception as e:
            sys.stderr.write(f"General error listing dashboards: {e}\n")
            return {"error": str(e), "success": False, "dashboards": []}

    def get_dashboard(self, dashboard_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific dashboard.

        Args:
            dashboard_id: The OCID of the dashboard to retrieve

        Returns:
            Dictionary with dashboard details including tiles/widgets
        """
        try:
            response = self.dashboard_client.get_management_dashboard(
                management_dashboard_id=dashboard_id
            )

            dashboard = self._dashboard_to_dict(response.data)

            # Extract tiles/widgets if present
            tiles = getattr(response.data, 'tiles', None)
            if tiles:
                dashboard['tiles'] = []
                for tile in tiles:
                    tile_dict = {
                        'displayName': getattr(tile, 'display_name', None),
                        'savedSearchId': getattr(tile, 'saved_search_id', None),
                        'row': getattr(tile, 'row', 0),
                        'column': getattr(tile, 'column', 0),
                        'height': getattr(tile, 'height', 1),
                        'width': getattr(tile, 'width', 1),
                        'nls': getattr(tile, 'nls', {}),
                        'uiConfig': getattr(tile, 'ui_config', {}),
                        'dataConfig': getattr(tile, 'data_config', []),
                        'state': getattr(tile, 'state', None),
                        'drilldownConfig': getattr(tile, 'drilldown_config', []),
                        'parametersMap': getattr(tile, 'parameters_map', {})
                    }
                    dashboard['tiles'].append(tile_dict)

            return {
                "success": True,
                "dashboard": dashboard
            }

        except oci.exceptions.ServiceError as e:
            sys.stderr.write(f"OCI Service Error getting dashboard: Code={e.code}, Message={e.message}\n")
            if e.code == 'NotFound':
                return {"error": f"Dashboard not found: {dashboard_id}", "success": False}
            return {"error": f"OCI Service Error: {e.message}", "success": False}
        except Exception as e:
            sys.stderr.write(f"General error getting dashboard: {e}\n")
            return {"error": str(e), "success": False}

    def get_dashboard_tiles(self, dashboard_id: str,
                           tile_type: str = "all") -> Dict[str, Any]:
        """
        Get tiles/widgets from a specific dashboard.

        Args:
            dashboard_id: The OCID of the dashboard
            tile_type: Filter by type (all, query, visualization, metric, text)

        Returns:
            Dictionary with tiles list
        """
        try:
            result = self.get_dashboard(dashboard_id)
            if not result.get("success"):
                return result

            dashboard = result.get("dashboard", {})
            tiles = dashboard.get("tiles", [])

            # Filter by type if specified
            if tile_type != "all":
                # Tile type filtering based on savedSearchId or uiConfig
                filtered_tiles = []
                for tile in tiles:
                    ui_config = tile.get('uiConfig', {})
                    viz_type = ui_config.get('vizType', '').lower()

                    if tile_type == "query" and tile.get('savedSearchId'):
                        filtered_tiles.append(tile)
                    elif tile_type == "visualization" and viz_type in ['chart', 'pie', 'bar', 'line', 'area']:
                        filtered_tiles.append(tile)
                    elif tile_type == "metric" and viz_type == 'metric':
                        filtered_tiles.append(tile)
                    elif tile_type == "text" and viz_type in ['text', 'markdown']:
                        filtered_tiles.append(tile)
                tiles = filtered_tiles

            return {
                "success": True,
                "dashboardId": dashboard_id,
                "displayName": dashboard.get('displayName'),
                "tiles": tiles,
                "tileCount": len(tiles)
            }

        except Exception as e:
            sys.stderr.write(f"Error getting dashboard tiles: {e}\n")
            return {"error": str(e), "success": False}

    def export_dashboard(self, dashboard_id: str,
                        include_queries: bool = True) -> Dict[str, Any]:
        """
        Export a dashboard configuration as JSON.

        Args:
            dashboard_id: The OCID of the dashboard to export
            include_queries: Whether to include full query definitions

        Returns:
            Dictionary with the exportable dashboard configuration
        """
        try:
            response = self.dashboard_client.export_dashboard(
                export_dashboard_id=dashboard_id
            )

            export_data = response.data

            # Convert to dictionary
            result = {
                "dashboards": [],
                "savedSearches": []
            }

            # Process dashboards in export
            if hasattr(export_data, 'dashboards') and export_data.dashboards:
                for dash in export_data.dashboards:
                    result["dashboards"].append(self._dashboard_to_dict(dash))

            # Process saved searches if included
            if include_queries and hasattr(export_data, 'saved_searches') and export_data.saved_searches:
                for search in export_data.saved_searches:
                    result["savedSearches"].append(self._saved_search_to_dict(search))

            return {
                "success": True,
                "export": result,
                "dashboardId": dashboard_id
            }

        except oci.exceptions.ServiceError as e:
            sys.stderr.write(f"OCI Service Error exporting dashboard: Code={e.code}, Message={e.message}\n")
            return {"error": f"OCI Service Error: {e.message}", "success": False}
        except Exception as e:
            sys.stderr.write(f"Error exporting dashboard: {e}\n")
            return {"error": str(e), "success": False}

    def list_saved_searches(self, display_name: Optional[str] = None,
                           lifecycle_state: str = "ACTIVE",
                           limit: int = 50) -> Dict[str, Any]:
        """
        List saved searches in the compartment.

        Args:
            display_name: Filter by display name (partial match)
            lifecycle_state: Filter by lifecycle state
            limit: Maximum number of results (1-100)

        Returns:
            Dictionary with saved searches list
        """
        try:
            searches = []
            page = None
            count = 0

            while count < limit:
                remaining = limit - count
                page_size = min(remaining, 100)

                response = self.dashboard_client.list_management_saved_searches(
                    compartment_id=self.compartment_id,
                    display_name=display_name,
                    lifecycle_state=lifecycle_state,
                    limit=page_size,
                    page=page
                )

                for item in response.data.items:
                    search_summary = {
                        'id': item.id,
                        'displayName': item.display_name,
                        'description': getattr(item, 'description', None),
                        'compartmentId': item.compartment_id,
                        'providerId': getattr(item, 'provider_id', None),
                        'providerName': getattr(item, 'provider_name', None),
                        'isOobSavedSearch': getattr(item, 'is_oob_saved_search', False),
                        'timeCreated': self._serialize_datetime(getattr(item, 'time_created', None)),
                        'timeUpdated': self._serialize_datetime(getattr(item, 'time_updated', None)),
                        'lifecycleState': getattr(item, 'lifecycle_state', None),
                        'type': getattr(item, 'type', None),
                        'freeformTags': getattr(item, 'freeform_tags', {}),
                        'definedTags': getattr(item, 'defined_tags', {})
                    }
                    searches.append(search_summary)
                    count += 1
                    if count >= limit:
                        break

                if response.has_next_page and count < limit:
                    page = response.next_page
                else:
                    break

            return {
                "success": True,
                "savedSearches": searches,
                "totalCount": len(searches),
                "compartmentId": self.compartment_id
            }

        except oci.exceptions.ServiceError as e:
            sys.stderr.write(f"OCI Service Error listing saved searches: Code={e.code}, Message={e.message}\n")
            return {"error": f"OCI Service Error: {e.message}", "success": False, "savedSearches": []}
        except Exception as e:
            sys.stderr.write(f"Error listing saved searches: {e}\n")
            return {"error": str(e), "success": False, "savedSearches": []}

    def get_saved_search(self, saved_search_id: str) -> Dict[str, Any]:
        """
        Get details of a specific saved search.

        Args:
            saved_search_id: The OCID of the saved search

        Returns:
            Dictionary with saved search details
        """
        try:
            response = self.dashboard_client.get_management_saved_search(
                management_saved_search_id=saved_search_id
            )

            return {
                "success": True,
                "savedSearch": self._saved_search_to_dict(response.data)
            }

        except oci.exceptions.ServiceError as e:
            sys.stderr.write(f"OCI Service Error getting saved search: Code={e.code}, Message={e.message}\n")
            if e.code == 'NotFound':
                return {"error": f"Saved search not found: {saved_search_id}", "success": False}
            return {"error": f"OCI Service Error: {e.message}", "success": False}
        except Exception as e:
            sys.stderr.write(f"Error getting saved search: {e}\n")
            return {"error": str(e), "success": False}


def main():
    """CLI entry point for the Dashboard Client."""
    parser = argparse.ArgumentParser(
        description='OCI Dashboard Client - Interact with OCI Management Dashboards'
    )
    parser.add_argument('action',
                       choices=['list', 'get', 'tiles', 'export', 'saved-searches', 'get-saved-search'],
                       help='Action to perform')
    parser.add_argument('--compartment-id', help='OCI Compartment OCID')
    parser.add_argument('--dashboard-id', help='Dashboard OCID (for get/tiles/export actions)')
    parser.add_argument('--saved-search-id', help='Saved Search OCID (for get-saved-search action)')
    parser.add_argument('--display-name', help='Filter by display name')
    parser.add_argument('--lifecycle-state', default='ACTIVE', help='Filter by lifecycle state')
    parser.add_argument('--limit', type=int, default=50, help='Maximum number of results')
    parser.add_argument('--tile-type', default='all',
                       choices=['all', 'query', 'visualization', 'metric', 'text'],
                       help='Filter tiles by type')
    parser.add_argument('--include-queries', action='store_true', default=True,
                       help='Include full query definitions in export')

    args = parser.parse_args()

    try:
        client = DashboardClient(compartment_id=args.compartment_id)

        if args.action == 'list':
            result = client.list_dashboards(
                display_name=args.display_name,
                lifecycle_state=args.lifecycle_state,
                limit=args.limit
            )
        elif args.action == 'get':
            if not args.dashboard_id:
                result = {"error": "Dashboard ID required for get action", "success": False}
            else:
                result = client.get_dashboard(args.dashboard_id)
        elif args.action == 'tiles':
            if not args.dashboard_id:
                result = {"error": "Dashboard ID required for tiles action", "success": False}
            else:
                result = client.get_dashboard_tiles(args.dashboard_id, args.tile_type)
        elif args.action == 'export':
            if not args.dashboard_id:
                result = {"error": "Dashboard ID required for export action", "success": False}
            else:
                result = client.export_dashboard(args.dashboard_id, args.include_queries)
        elif args.action == 'saved-searches':
            result = client.list_saved_searches(
                display_name=args.display_name,
                lifecycle_state=args.lifecycle_state,
                limit=args.limit
            )
        elif args.action == 'get-saved-search':
            if not args.saved_search_id:
                result = {"error": "Saved Search ID required for get-saved-search action", "success": False}
            else:
                result = client.get_saved_search(args.saved_search_id)
        else:
            result = {"error": "Invalid action", "success": False}

        print(json.dumps(result, indent=2, default=str))

    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
