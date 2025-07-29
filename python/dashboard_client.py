#!/usr/bin/env python3
"""
OCI Dashboard Client for retrieving dashboards from OCI Management Dashboard service
"""

import oci
import oci.log_analytics
import oci.object_storage
try:
    import oci.management_dashboard
except ImportError:
    # Management dashboard may not be available in all OCI SDK versions
    pass
import json
import sys
import os
import argparse
from datetime import datetime

class DashboardClient:
    def __init__(self, compartment_id=None):
        self.config = self._load_oci_config()
        
        # Prioritize environment variables passed from the calling process
        self.region = os.getenv('DASHBOARD_REGION') or self.config.get("region", "us-ashburn-1")
        
        # Use provided compartment_id, then environment variable, then config tenancy
        self.compartment_id = compartment_id or os.getenv('DASHBOARD_COMPARTMENT_ID') or self.config.get("tenancy")

        if not self.compartment_id:
            raise Exception("Compartment ID must be provided via parameter, DASHBOARD_COMPARTMENT_ID environment variable, or OCI config 'tenancy'.")

        # Set the region for the client
        self.config["region"] = self.region
        
        # Initialize client - always use Log Analytics for now since dashboard service may not be available
        self.client = oci.log_analytics.LogAnalyticsClient(self.config)
        self.namespace = self._get_namespace()
        
        # Debug info only for explicit debugging
        if os.getenv('DASHBOARD_DEBUG') == 'true':
            sys.stderr.write(f"DashboardClient initialized with:\n")
            sys.stderr.write(f"  Region: {self.region}\n")
            sys.stderr.write(f"  Compartment ID: {self.compartment_id}\n")

    def _load_oci_config(self):
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
                print("Warning: OCI config file not found, attempting to use environment variables for config.")
                return {
                    "tenancy": os.getenv('OCI_TENANCY'),
                    "user": os.getenv('OCI_USER'),
                    "fingerprint": os.getenv('OCI_FINGERPRINT'),
                    "key_file": os.getenv('OCI_KEY_FILE'),
                    "region": os.getenv('DASHBOARD_REGION')
                }
            raise Exception(f"Failed to load OCI config: {e}. Ensure ~/.oci/config is set up or all OCI_* env vars are present.")

    def _get_namespace(self):
        """Get tenancy namespace"""
        try:
            object_storage_client = oci.object_storage.ObjectStorageClient(self.config)
            namespace = object_storage_client.get_namespace().data
            return namespace
        except Exception as e:
            raise Exception(f"Failed to get namespace: {e}")

    def list_dashboards(self, display_name=None, lifecycle_state="ACTIVE", limit=50):
        """List dashboards - currently returns a placeholder as direct dashboard API may not be available"""
        try:
            # Return a message indicating that dashboard listing requires specific API access
            # In a real implementation, this would integrate with OCI Management Dashboard or Observability services
            
            # For now, return some example dashboard information
            sample_dashboards = [
                {
                    "id": "ocid1.dashboard.oc1..sample1",
                    "displayName": "Security Overview Dashboard",
                    "description": "Overview of security events and alerts from Log Analytics",
                    "compartmentId": self.compartment_id,
                    "type": "SECURITY_DASHBOARD",
                    "query": "* | stats count by 'Log Source' | sort -count",
                    "timeCreated": datetime.now().isoformat(),
                    "timeUpdated": datetime.now().isoformat(),
                    "lifecycleState": "ACTIVE"
                },
                {
                    "id": "ocid1.dashboard.oc1..sample2",
                    "displayName": "Network Traffic Analysis",
                    "description": "VCN Flow logs analysis and network patterns",
                    "compartmentId": self.compartment_id,
                    "type": "NETWORK_DASHBOARD",
                    "query": "'Log Source' = 'OCI VCN Flow Unified Schema Logs' | stats count by srcaddr, dstaddr | sort -count",
                    "timeCreated": datetime.now().isoformat(),
                    "timeUpdated": datetime.now().isoformat(),
                    "lifecycleState": "ACTIVE"
                },
                {
                    "id": "ocid1.dashboard.oc1..sample3",
                    "displayName": "Audit Events Dashboard",
                    "description": "OCI Audit events and compliance monitoring",
                    "compartmentId": self.compartment_id,
                    "type": "AUDIT_DASHBOARD",
                    "query": "'Log Source' = 'OCI Audit Logs' | stats count by eventName | sort -count",
                    "timeCreated": datetime.now().isoformat(),
                    "timeUpdated": datetime.now().isoformat(),
                    "lifecycleState": "ACTIVE"
                }
            ]
            
            # Filter by display name if provided
            if display_name:
                sample_dashboards = [d for d in sample_dashboards if display_name.lower() in d["displayName"].lower()]
            
            # Apply limit
            sample_dashboards = sample_dashboards[:limit]
            
            return {
                "success": True,
                "dashboards": sample_dashboards,
                "totalCount": len(sample_dashboards),
                "compartmentId": self.compartment_id,
                "note": "Sample dashboards shown. Full dashboard API integration requires OCI Management Dashboard service access."
            }
                
        except Exception as e:
            sys.stderr.write(f"General error listing dashboards: {e}\n")
            return {"error": str(e), "success": False, "dashboards": []}

    def get_dashboard(self, dashboard_id):
        """Get a specific dashboard by ID - returns sample data"""
        try:
            # For demonstration, return sample dashboard details
            if dashboard_id == "ocid1.dashboard.oc1..sample1":
                dashboard = {
                    "id": "ocid1.dashboard.oc1..sample1",
                    "displayName": "Security Overview Dashboard",
                    "description": "Overview of security events and alerts from Log Analytics",
                    "compartmentId": self.compartment_id,
                    "type": "SECURITY_DASHBOARD",
                    "query": "* | stats count by 'Log Source' | sort -count",
                    "timeCreated": datetime.now().isoformat(),
                    "timeUpdated": datetime.now().isoformat(),
                    "lifecycleState": "ACTIVE",
                    "widgets": [
                        {
                            "id": "widget1",
                            "displayName": "Log Sources Distribution",
                            "type": "PIE_CHART",
                            "query": "* | stats count by 'Log Source' | sort -count | head 10",
                            "position": {"row": 0, "column": 0, "height": 2, "width": 2}
                        },
                        {
                            "id": "widget2",
                            "displayName": "Security Events Timeline",
                            "type": "LINE_CHART",
                            "query": "'Log Source' in ('OCI Audit Logs', 'OCI Cloud Guard Problems') | timestats count by 'Log Source'",
                            "position": {"row": 0, "column": 2, "height": 2, "width": 4}
                        }
                    ]
                }
            elif dashboard_id == "ocid1.dashboard.oc1..sample2":
                dashboard = {
                    "id": "ocid1.dashboard.oc1..sample2",
                    "displayName": "Network Traffic Analysis",
                    "description": "VCN Flow logs analysis and network patterns",
                    "compartmentId": self.compartment_id,
                    "type": "NETWORK_DASHBOARD",
                    "query": "'Log Source' = 'OCI VCN Flow Unified Schema Logs' | stats count by srcaddr, dstaddr | sort -count",
                    "timeCreated": datetime.now().isoformat(),
                    "timeUpdated": datetime.now().isoformat(),
                    "lifecycleState": "ACTIVE",
                    "widgets": [
                        {
                            "id": "widget1",
                            "displayName": "Top Source IPs",
                            "type": "TABLE",
                            "query": "'Log Source' = 'OCI VCN Flow Unified Schema Logs' | stats count by srcaddr | sort -count | head 20",
                            "position": {"row": 0, "column": 0, "height": 2, "width": 3}
                        }
                    ]
                }
            else:
                return {"error": f"Dashboard not found: {dashboard_id}", "success": False}
            
            return {
                "success": True,
                "dashboard": dashboard
            }
                
        except oci.exceptions.ServiceError as e:
            sys.stderr.write(f"OCI Service Error getting dashboard: Code={e.code}, Message={e.message}\n")
            return {"error": f"OCI Service Error: {e.message}", "success": False}
        except Exception as e:
            sys.stderr.write(f"General error getting dashboard: {e}\n")
            return {"error": str(e), "success": False}

def main():
    parser = argparse.ArgumentParser(description='OCI Dashboard Client')
    parser.add_argument('action', choices=['list', 'get'], help='Action to perform')
    parser.add_argument('--compartment-id', help='OCI Compartment OCID')
    parser.add_argument('--dashboard-id', help='Dashboard OCID (for get action)')
    parser.add_argument('--display-name', help='Filter dashboards by display name')
    parser.add_argument('--lifecycle-state', default='ACTIVE', help='Filter by lifecycle state')
    parser.add_argument('--limit', type=int, default=50, help='Maximum number of dashboards to return')
    
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
        else:
            result = {"error": "Invalid action", "success": False}
            
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()