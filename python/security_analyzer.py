#!/usr/bin/env python3
"""
Security Analyzer for OCI Logging Analytics
Combines query mapping with execution for security analysis
"""

import json
import sys
import os
import argparse
from datetime import datetime
from logan_client import LoganClient
from query_mapper import QueryMapper
from query_validator import QueryValidator

class SecurityAnalyzer:
    def __init__(self):
        self.client = LoganClient()
        self.mapper = QueryMapper()
        self.validator = QueryValidator()

    def run_security_check(self, check_type, time_period_minutes=60):
        """Run a specific security check"""
        try:
            # Get the mapped queries for this security check
            query_result = self.mapper.get_security_query(check_type, time_period_minutes)
            
            if not query_result.get("success"):
                return query_result
            
            # Try each query until one succeeds
            events = []
            successful_query = None
            
            for i, query in enumerate(query_result["queries"]):
                result = self.client.execute_query(query, time_period_minutes, 100)
                
                if result.get("success") and result.get("results"):
                    events = result["results"]
                    successful_query = query
                    break
                elif result.get("success"):
                    # Query succeeded but no results
                    successful_query = query
                    break
            
            # Format events for security analysis
            formatted_events = []
            for event in events:
                formatted_event = {
                    "id": f"{check_type}_{len(formatted_events)}",
                    "timestamp": event.get("Datetime") or event.get("Time") or event.get("timestamp", ""),
                    "type": check_type,
                    "severity": self._determine_severity(check_type, event),
                    "source": event.get("Log Source", "Unknown"),
                    "message": event.get("Log Entry") or event.get("Message") or "Security event detected",
                    "details": event,
                    "count": event.get("logrecords") or event.get("count") or 1
                }
                formatted_events.append(formatted_event)
            
            return {
                "success": True,
                "check_type": check_type,
                "description": query_result["description"],
                "events": formatted_events,
                "total_events": len(formatted_events),
                "time_period_minutes": time_period_minutes,
                "query_used": successful_query
            }
            
        except Exception as e:
            return {"error": str(e), "success": False}

    def _determine_severity(self, check_type, event):
        """Determine event severity based on type and content"""
        # Check if event has explicit severity
        if "Severity" in event:
            return event["Severity"].lower()
        
        # Determine severity by check type
        high_severity_checks = ["privilege_escalation", "suspicious_network", "failed_logins"]
        medium_severity_checks = ["audit_changes", "user_management", "port_scanning"]
        
        if check_type in high_severity_checks:
            return "high"
        elif check_type in medium_severity_checks:
            return "medium"
        else:
            return "low"

    def search_logs(self, query, time_period_minutes=1440, bypass_validation=False):
        """Execute a custom log search with optional validation bypass"""
        try:
            # First, test connection to OCI Logging Analytics
            connection_test_result = self.client.test_connection()
            if not connection_test_result.get("success"):
                sys.stderr.write(f"SecurityAnalyzer: OCI connection test failed: {connection_test_result.get('error', 'Unknown error')}\n")
                return connection_test_result # Return the connection error

            if os.getenv('LOGAN_DEBUG') == 'true':
                sys.stderr.write("SecurityAnalyzer: OCI connection test successful. Proceeding with query.\n")

            original_query = query
            query_was_modified = False
            validation_warnings = []

            if bypass_validation:
                # Send query as-is without any validation or modification
                if os.getenv('LOGAN_DEBUG') == 'true':
                    sys.stderr.write("SecurityAnalyzer: Bypassing validation - sending query as-is to OCI\n")
                # Use console-like execution with proper parameters and bypass all preprocessing
                result = self.client.execute_query_like_console(query, time_period_minutes, 2000, bypass_all_processing=True)
            else:
                # Validate and fix the query before execution
                validation_result = self.validator.validate_and_fix_query(query)
                
                if not validation_result.get("success"):
                    if os.getenv('LOGAN_DEBUG') == 'true':
                        sys.stderr.write(f"SecurityAnalyzer: Query validation failed: {validation_result.get('error')}\n")
                        # Try suggested alternative
                        suggested_query = validation_result.get("suggested_alternative", "* | head 10")
                        sys.stderr.write(f"SecurityAnalyzer: Trying suggested alternative: {suggested_query}\n")
                    else:
                        suggested_query = validation_result.get("suggested_alternative", "* | head 10")
                    query = suggested_query
                    query_was_modified = True
                else:
                    # Use the fixed query
                    query = validation_result.get("fixed_query", query)
                    validation_warnings = validation_result.get("warnings", [])
                    
                    if query != original_query:
                        if os.getenv('LOGAN_DEBUG') == 'true':
                            sys.stderr.write(f"SecurityAnalyzer: Query was modified from '{original_query}' to '{query}'\n")
                        query_was_modified = True
                    
                    # Log any warnings
                    if os.getenv('LOGAN_DEBUG') == 'true':
                        for warning in validation_warnings:
                            sys.stderr.write(f"SecurityAnalyzer: Warning: {warning}\n")

                result = self.client.execute_query(query, time_period_minutes, 100)
            
            if result.get("success"):
                return {
                    "success": True,
                    "results": result.get("results", []),
                    "total": result.get("total_count", 0),
                    "execution_time": result.get("execution_time", 0),
                    "query": query,
                    "original_query": original_query,
                    "query_was_modified": query_was_modified,
                    "validation_bypassed": bypass_validation,
                    "validation_warnings": validation_warnings,
                    "time_period_minutes": time_period_minutes,
                    "fallback_used": result.get("fallback_used", False)
                }
            
            return result
            
        except Exception as e:
            sys.stderr.write(f"SecurityAnalyzer: General error in search_logs: {e}\n")
            return {"error": str(e), "success": False}

def main():
    parser = argparse.ArgumentParser(description='Security Analyzer for OCI LOGAN')
    parser.add_argument('action', choices=['check', 'events', 'stats', 'search'], help='Action to perform')
    parser.add_argument('--type', help='Security check type')
    parser.add_argument('--severity', default='all', help='Event severity filter')
    parser.add_argument('--query', type=str, help='Custom query string')
    parser.add_argument('--time-period', type=int, default=1440, help='Time period in minutes')
    parser.add_argument('--bypass-validation', action='store_true', help='Send query as-is without validation')
    
    args = parser.parse_args()
    
    try:
        analyzer = SecurityAnalyzer()
        
        if args.action == 'check':
            if not args.type:
                result = {"error": "Security check type required", "success": False}
            else:
                result = analyzer.run_security_check(args.type, args.time_period)
        elif args.action == 'search':
            if not args.query:
                result = {"error": "Query string required", "success": False}
            else:
                result = analyzer.search_logs(args.query, args.time_period, args.bypass_validation)
        else:
            result = {"error": "Invalid action", "success": False}
            
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()