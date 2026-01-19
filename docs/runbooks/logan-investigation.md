# Logan MCP Server Runbook (mcp-oci-logan-server)

Use this runbook for Logging Analytics investigations and dashboards.

## Inputs
- Log Analytics namespace
- Time window
- Query intent (security, audit, performance, API)

## Steps
1. **Health + connectivity check**
   - Tools: `oci_logan_health`, `oci_logan_check_connection`
2. **List available queries or patterns**
   - Tools: `oci_logan_get_queries`, `oci_logan_search_log_patterns`
3. **Validate and execute the query**
   - Tools: `oci_logan_validate_query`, `oci_logan_execute_query`
4. **Run advanced analytics if needed**
   - Tools: `oci_logan_execute_statistical_analysis`, `oci_logan_execute_advanced_analytics`, `oci_logan_correlation_analysis`
5. **Security drilldown**
   - Tools: `oci_logan_search_security_events`, `oci_logan_get_mitre_techniques`, `oci_logan_analyze_ip_activity`
6. **Dashboards and saved searches**
   - Tools: `oci_logan_list_dashboards`, `oci_logan_get_dashboard`, `oci_logan_create_saved_search`

## Skill/Tool mapping
- Health: `oci_logan_health`, `oci_logan_check_connection`
- Query catalog: `oci_logan_get_queries`, `oci_logan_search_log_patterns`
- Execution: `oci_logan_validate_query`, `oci_logan_execute_query`
- Analytics: `oci_logan_execute_statistical_analysis`, `oci_logan_execute_advanced_analytics`, `oci_logan_correlation_analysis`
- Security: `oci_logan_search_security_events`, `oci_logan_get_mitre_techniques`, `oci_logan_analyze_ip_activity`
- Dashboards: `oci_logan_list_dashboards`, `oci_logan_get_dashboard`, `oci_logan_create_saved_search`

## Outputs
- Query results and analytics summary
- Security findings and recommended follow-ups
- Dashboard or saved search details
