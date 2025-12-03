/**
 * Predefined OCI Logging Analytics Queries
 *
 * Organized by Oracle-defined Dashboard categories and security use cases.
 * All queries follow OCI LA syntax with proper field quoting and time filtering.
 *
 * Reference: https://docs.oracle.com/en-us/iaas/log-analytics/doc/command-reference.html
 */
// ============================================================================
// VCN FLOW LOGS ANALYSIS
// Based on Oracle-defined "VCN Flow Logs" and "Enterprise Network Overview" dashboards
// ============================================================================
export const VCN_FLOW_QUERIES = [
    {
        id: 'vcn_traffic_by_subnet',
        name: 'Traffic Distribution by Subnet',
        query: "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Time > dateRelative(24h) | stats sum('Bytes In') as bytes_in, sum('Bytes Out') as bytes_out, count as connections by 'Subnet Name' | sort -connections",
        category: 'vcn_flow',
        description: 'Analyze network traffic distribution across subnets',
        tags: ['network', 'vcn', 'traffic', 'subnet'],
        tested: false,
        logSources: ['OCI VCN Flow Unified Schema Logs']
    },
    {
        id: 'vcn_top_destination_ports',
        name: 'Top Destination Ports',
        query: "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Time > dateRelative(24h) | stats count as connections by 'Destination Port' | sort -connections | head 20",
        category: 'vcn_flow',
        description: 'Identify most frequently accessed destination ports',
        tags: ['network', 'ports', 'services'],
        tested: false,
        logSources: ['OCI VCN Flow Unified Schema Logs']
    },
    {
        id: 'vcn_rejected_traffic',
        name: 'Rejected Network Traffic',
        query: "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and 'Action' = 'REJECT' and Time > dateRelative(24h) | stats count as rejections by 'Source IP', 'Destination IP', 'Destination Port' | sort -rejections | head 50",
        category: 'vcn_flow',
        description: 'Analyze blocked/rejected network connections',
        tags: ['network', 'security', 'firewall', 'blocked'],
        tested: false,
        logSources: ['OCI VCN Flow Unified Schema Logs']
    },
    {
        id: 'vcn_ingress_egress_ratio',
        name: 'Ingress vs Egress Traffic Ratio',
        query: "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Time > dateRelative(24h) | stats sum('Bytes In') as ingress_bytes, sum('Bytes Out') as egress_bytes by 'VCN Name' | eval ratio=round(egress_bytes/ingress_bytes, 2) | sort -egress_bytes",
        category: 'vcn_flow',
        description: 'Compare inbound vs outbound traffic volumes per VCN',
        tags: ['network', 'bandwidth', 'traffic'],
        tested: false,
        logSources: ['OCI VCN Flow Unified Schema Logs']
    },
    {
        id: 'vcn_traffic_trends_hourly',
        name: 'Hourly Traffic Trends',
        query: "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Time > dateRelative(7d) | timestats 1h sum('Bytes In') as bytes_in, sum('Bytes Out') as bytes_out, count as connections | sort Time",
        category: 'vcn_flow',
        description: 'Visualize network traffic patterns over time',
        tags: ['network', 'trends', 'timeseries'],
        tested: false,
        logSources: ['OCI VCN Flow Unified Schema Logs'],
        minTimeRange: '7d'
    },
    {
        id: 'vcn_protocol_distribution',
        name: 'Protocol Distribution',
        query: "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Time > dateRelative(24h) | stats count as connections, sum('Bytes In') as total_bytes by 'Protocol Number' | eval protocol_name=case('Protocol Number'=6, 'TCP', 'Protocol Number'=17, 'UDP', 'Protocol Number'=1, 'ICMP', 'Other') | sort -connections",
        category: 'vcn_flow',
        description: 'Breakdown of traffic by network protocol',
        tags: ['network', 'protocol', 'tcp', 'udp'],
        tested: false,
        logSources: ['OCI VCN Flow Unified Schema Logs']
    },
    {
        id: 'vcn_external_connections',
        name: 'External IP Connections',
        query: "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and 'Source IP' not like '10.*' and 'Source IP' not like '172.16.*' and 'Source IP' not like '192.168.*' and Time > dateRelative(24h) | stats count as connections by 'Source IP', 'Destination Port' | sort -connections | head 50",
        category: 'vcn_flow',
        description: 'Identify connections from external/public IP addresses',
        tags: ['network', 'external', 'security'],
        tested: false,
        logSources: ['OCI VCN Flow Unified Schema Logs']
    }
];
// ============================================================================
// OCI AUDIT ANALYSIS
// Based on Oracle-defined "OCI Audit Analysis" dashboard
// ============================================================================
export const OCI_AUDIT_QUERIES = [
    {
        id: 'audit_user_actions_timeline',
        name: 'User Actions Timeline',
        query: "'Log Source' = 'OCI Audit Logs' and Time > dateRelative(24h) | timestats 1h count as actions by 'User Name' | sort Time",
        category: 'oci_audit',
        description: 'Track user activity over time',
        tags: ['audit', 'users', 'timeline'],
        tested: false,
        logSources: ['OCI Audit Logs']
    },
    {
        id: 'audit_resource_modifications',
        name: 'Resource Modifications',
        query: "'Log Source' = 'OCI Audit Logs' and ('Event Name' contains 'Create' or 'Event Name' contains 'Update' or 'Event Name' contains 'Delete' or 'Event Name' contains 'Terminate') and Time > dateRelative(24h) | stats count by 'Event Name', 'User Name', 'Resource Name' | sort -count | head 100",
        category: 'oci_audit',
        description: 'Track all resource create/update/delete operations',
        tags: ['audit', 'changes', 'resources'],
        tested: false,
        logSources: ['OCI Audit Logs']
    },
    {
        id: 'audit_policy_changes',
        name: 'IAM Policy Changes',
        query: "'Log Source' = 'OCI Audit Logs' and ('Event Name' contains 'Policy' or 'Event Name' contains 'Group' or 'Event Name' contains 'User') and Time > dateRelative(7d) | stats count by 'Event Name', 'User Name' | sort -count",
        category: 'oci_audit',
        description: 'Monitor IAM policy and group modifications',
        tags: ['audit', 'iam', 'policy', 'security'],
        tested: false,
        logSources: ['OCI Audit Logs'],
        minTimeRange: '7d'
    },
    {
        id: 'audit_api_calls_by_service',
        name: 'API Calls by Service',
        query: "'Log Source' = 'OCI Audit Logs' and Time > dateRelative(24h) | stats count as api_calls by 'Service Name' | sort -api_calls | head 20",
        category: 'oci_audit',
        description: 'Distribution of API calls across OCI services',
        tags: ['audit', 'api', 'services'],
        tested: false,
        logSources: ['OCI Audit Logs']
    },
    {
        id: 'audit_failed_operations',
        name: 'Failed API Operations',
        query: "'Log Source' = 'OCI Audit Logs' and 'Response Status' >= 400 and Time > dateRelative(24h) | stats count as failures by 'Event Name', 'Response Status', 'User Name' | sort -failures | head 50",
        category: 'oci_audit',
        description: 'Identify failed API operations (4xx/5xx responses)',
        tags: ['audit', 'errors', 'failures'],
        tested: false,
        logSources: ['OCI Audit Logs']
    },
    {
        id: 'audit_compartment_activity',
        name: 'Activity by Compartment',
        query: "'Log Source' = 'OCI Audit Logs' and Time > dateRelative(24h) | stats count as actions, distinct_count('User Name') as unique_users by 'Compartment Name' | sort -actions",
        category: 'oci_audit',
        description: 'Analyze activity distribution across compartments',
        tags: ['audit', 'compartment', 'activity'],
        tested: false,
        logSources: ['OCI Audit Logs']
    },
    {
        id: 'audit_rare_events',
        name: 'Rare/Unusual Events',
        query: "'Log Source' = 'OCI Audit Logs' and Time > dateRelative(7d) | stats count by 'Event Name' | where count < 5 | sort count",
        category: 'oci_audit',
        description: 'Identify rarely occurring events that may indicate anomalies',
        tags: ['audit', 'anomaly', 'rare'],
        tested: false,
        logSources: ['OCI Audit Logs'],
        minTimeRange: '7d'
    },
    {
        id: 'audit_console_vs_api',
        name: 'Console vs API Usage',
        query: "'Log Source' = 'OCI Audit Logs' and Time > dateRelative(24h) | eval access_type=if('User Agent' contains 'OCI-Console', 'Console', 'API/SDK') | stats count as calls by access_type, 'User Name' | sort -calls",
        category: 'oci_audit',
        description: 'Compare console access vs programmatic API access',
        tags: ['audit', 'console', 'api'],
        tested: false,
        logSources: ['OCI Audit Logs']
    }
];
// ============================================================================
// DATABASE ANALYSIS
// Based on Oracle-defined "Oracle Database Alert" and "Oracle Database Audit Analysis" dashboards
// ============================================================================
export const DATABASE_QUERIES = [
    {
        id: 'db_ora_errors',
        name: 'Oracle ORA Errors',
        query: "'Log Source' = 'Database Alert Logs' and 'Message' like 'ORA-%' and Time > dateRelative(24h) | extract 'ORA-(?<error_code>\\d+)' from 'Message' | stats count by error_code | sort -count | head 20",
        category: 'database',
        description: 'Identify most common Oracle database errors',
        tags: ['database', 'oracle', 'errors'],
        tested: false,
        logSources: ['Database Alert Logs']
    },
    {
        id: 'db_alert_severity',
        name: 'Database Alerts by Severity',
        query: "'Log Source' = 'Database Alert Logs' and Time > dateRelative(24h) | stats count as alerts by 'Severity', 'Entity' | sort -alerts",
        category: 'database',
        description: 'Breakdown of database alerts by severity level',
        tags: ['database', 'alerts', 'severity'],
        tested: false,
        logSources: ['Database Alert Logs']
    },
    {
        id: 'db_connection_errors',
        name: 'Database Connection Errors',
        query: "'Log Source' = 'Database Alert Logs' and ('Message' contains 'TNS' or 'Message' contains 'connection' or 'Message' contains 'listener') and Time > dateRelative(24h) | stats count by 'Message' | sort -count | head 20",
        category: 'database',
        description: 'Monitor TNS and connection-related errors',
        tags: ['database', 'connection', 'tns'],
        tested: false,
        logSources: ['Database Alert Logs']
    },
    {
        id: 'db_audit_privileged_actions',
        name: 'Privileged Database Actions',
        query: "'Log Source' = 'Oracle Database Unified Audit Logs' and ('Action' = 'GRANT' or 'Action' = 'REVOKE' or 'Action' = 'ALTER USER' or 'Action' = 'CREATE USER' or 'Action' = 'DROP USER') and Time > dateRelative(7d) | stats count by 'Action', 'DB User', 'Object Name' | sort -count",
        category: 'database',
        subcategory: 'audit',
        description: 'Track privileged database operations',
        tags: ['database', 'audit', 'privileges', 'security'],
        tested: false,
        logSources: ['Oracle Database Unified Audit Logs'],
        minTimeRange: '7d'
    },
    {
        id: 'db_audit_schema_changes',
        name: 'Schema Changes',
        query: "'Log Source' = 'Oracle Database Unified Audit Logs' and ('Action' contains 'CREATE' or 'Action' contains 'ALTER' or 'Action' contains 'DROP') and 'Object Type' in ('TABLE', 'INDEX', 'VIEW', 'PROCEDURE', 'FUNCTION') and Time > dateRelative(7d) | stats count by 'Action', 'Object Type', 'Object Name', 'DB User' | sort -count",
        category: 'database',
        subcategory: 'audit',
        description: 'Monitor DDL operations on database objects',
        tags: ['database', 'audit', 'ddl', 'schema'],
        tested: false,
        logSources: ['Oracle Database Unified Audit Logs'],
        minTimeRange: '7d'
    },
    {
        id: 'db_failed_logins',
        name: 'Failed Database Logins',
        query: "'Log Source' = 'Oracle Database Unified Audit Logs' and 'Return Code' != 0 and 'Action' = 'LOGON' and Time > dateRelative(24h) | stats count as failures by 'DB User', 'Client Host', 'Return Code' | sort -failures",
        category: 'database',
        subcategory: 'security',
        description: 'Monitor failed database authentication attempts',
        tags: ['database', 'security', 'login', 'authentication'],
        tested: false,
        logSources: ['Oracle Database Unified Audit Logs']
    },
    {
        id: 'db_tablespace_issues',
        name: 'Tablespace Issues',
        query: "'Log Source' = 'Database Alert Logs' and ('Message' contains 'tablespace' or 'Message' contains 'ORA-01653' or 'Message' contains 'ORA-01654') and Time > dateRelative(7d) | stats count by 'Message', 'Entity' | sort -count",
        category: 'database',
        description: 'Monitor tablespace-related warnings and errors',
        tags: ['database', 'tablespace', 'storage'],
        tested: false,
        logSources: ['Database Alert Logs'],
        minTimeRange: '7d'
    }
];
// ============================================================================
// API GATEWAY ANALYSIS
// Based on Oracle-defined "OCI API Gateway Overview" dashboard
// ============================================================================
export const API_GATEWAY_QUERIES = [
    {
        id: 'apigw_request_trends',
        name: 'API Request Trends',
        query: "'Log Source' = 'OCI API Gateway Access Logs' and Time > dateRelative(24h) | timestats 1h count as requests | sort Time",
        category: 'api_gateway',
        description: 'Visualize API request volume over time',
        tags: ['api', 'gateway', 'trends'],
        tested: false,
        logSources: ['OCI API Gateway Access Logs']
    },
    {
        id: 'apigw_status_codes',
        name: 'Response Status Codes',
        query: "'Log Source' = 'OCI API Gateway Access Logs' and Time > dateRelative(24h) | stats count as requests by 'Response Status' | eval status_category=case('Response Status'<300, '2xx Success', 'Response Status'<400, '3xx Redirect', 'Response Status'<500, '4xx Client Error', '5xx Server Error') | stats sum(requests) as total by status_category",
        category: 'api_gateway',
        description: 'Breakdown of API responses by status code category',
        tags: ['api', 'gateway', 'status', 'errors'],
        tested: false,
        logSources: ['OCI API Gateway Access Logs']
    },
    {
        id: 'apigw_latency_percentiles',
        name: 'API Latency Percentiles',
        query: "'Log Source' = 'OCI API Gateway Access Logs' and Time > dateRelative(24h) | stats avg('Response Time') as avg_latency, perc50('Response Time') as p50, perc95('Response Time') as p95, perc99('Response Time') as p99 by 'Request Path' | sort -p99 | head 20",
        category: 'api_gateway',
        description: 'Analyze API endpoint response time percentiles',
        tags: ['api', 'gateway', 'latency', 'performance'],
        tested: false,
        logSources: ['OCI API Gateway Access Logs']
    },
    {
        id: 'apigw_top_endpoints',
        name: 'Top API Endpoints',
        query: "'Log Source' = 'OCI API Gateway Access Logs' and Time > dateRelative(24h) | stats count as requests, avg('Response Time') as avg_latency by 'Request Method', 'Request Path' | sort -requests | head 20",
        category: 'api_gateway',
        description: 'Most frequently called API endpoints',
        tags: ['api', 'gateway', 'endpoints'],
        tested: false,
        logSources: ['OCI API Gateway Access Logs']
    },
    {
        id: 'apigw_client_errors',
        name: 'Client Errors (4xx)',
        query: "'Log Source' = 'OCI API Gateway Access Logs' and 'Response Status' >= 400 and 'Response Status' < 500 and Time > dateRelative(24h) | stats count as errors by 'Request Path', 'Response Status', 'Client IP' | sort -errors | head 50",
        category: 'api_gateway',
        description: 'Identify client-side API errors',
        tags: ['api', 'gateway', 'errors', 'client'],
        tested: false,
        logSources: ['OCI API Gateway Access Logs']
    },
    {
        id: 'apigw_server_errors',
        name: 'Server Errors (5xx)',
        query: "'Log Source' = 'OCI API Gateway Access Logs' and 'Response Status' >= 500 and Time > dateRelative(24h) | stats count as errors by 'Request Path', 'Response Status' | sort -errors",
        category: 'api_gateway',
        description: 'Monitor server-side API errors',
        tags: ['api', 'gateway', 'errors', 'server'],
        tested: false,
        logSources: ['OCI API Gateway Access Logs']
    },
    {
        id: 'apigw_top_clients',
        name: 'Top API Clients',
        query: "'Log Source' = 'OCI API Gateway Access Logs' and Time > dateRelative(24h) | stats count as requests, distinct_count('Request Path') as unique_endpoints by 'Client IP' | sort -requests | head 20",
        category: 'api_gateway',
        description: 'Identify top API consumers by IP',
        tags: ['api', 'gateway', 'clients'],
        tested: false,
        logSources: ['OCI API Gateway Access Logs']
    }
];
// ============================================================================
// OBJECT STORAGE ANALYSIS
// ============================================================================
export const OBJECT_STORAGE_QUERIES = [
    {
        id: 'objstor_bucket_activity',
        name: 'Bucket Activity Summary',
        query: "'Log Source' = 'OCI Object Storage Logs' and Time > dateRelative(24h) | stats count as operations by 'Bucket Name', 'Event Name' | sort -operations",
        category: 'object_storage',
        description: 'Overview of operations per bucket',
        tags: ['storage', 'bucket', 'activity'],
        tested: false,
        logSources: ['OCI Object Storage Logs']
    },
    {
        id: 'objstor_large_downloads',
        name: 'Large Data Downloads',
        query: "'Log Source' = 'OCI Object Storage Logs' and 'Event Name' = 'GetObject' and Time > dateRelative(24h) | stats sum('Content Length') as total_bytes, count as downloads by 'User Name', 'Bucket Name' | where total_bytes > 1073741824 | sort -total_bytes",
        category: 'object_storage',
        description: 'Identify users downloading large amounts of data (>1GB)',
        tags: ['storage', 'download', 'exfiltration', 'security'],
        tested: false,
        logSources: ['OCI Object Storage Logs']
    },
    {
        id: 'objstor_public_access',
        name: 'Public Bucket Access',
        query: "'Log Source' = 'OCI Object Storage Logs' and 'User Name' = 'anonymous' and Time > dateRelative(24h) | stats count as accesses by 'Bucket Name', 'Event Name', 'Client IP' | sort -accesses",
        category: 'object_storage',
        description: 'Monitor anonymous/public access to buckets',
        tags: ['storage', 'public', 'security'],
        tested: false,
        logSources: ['OCI Object Storage Logs']
    },
    {
        id: 'objstor_delete_operations',
        name: 'Object Deletions',
        query: "'Log Source' = 'OCI Object Storage Logs' and 'Event Name' = 'DeleteObject' and Time > dateRelative(24h) | stats count as deletions by 'User Name', 'Bucket Name' | sort -deletions",
        category: 'object_storage',
        description: 'Track object deletion activity',
        tags: ['storage', 'delete', 'audit'],
        tested: false,
        logSources: ['OCI Object Storage Logs']
    },
    {
        id: 'objstor_unusual_hours',
        name: 'Off-Hours Access',
        query: "'Log Source' = 'OCI Object Storage Logs' and Time > dateRelative(7d) | eval hour=strftime(Time, '%H') | where hour < 6 or hour > 22 | stats count as accesses by 'User Name', 'Bucket Name', hour | sort -accesses",
        category: 'object_storage',
        description: 'Detect storage access during unusual hours',
        tags: ['storage', 'security', 'anomaly'],
        tested: false,
        logSources: ['OCI Object Storage Logs'],
        minTimeRange: '7d'
    }
];
// ============================================================================
// SECURITY / CLOUD GUARD ANALYSIS
// ============================================================================
export const SECURITY_QUERIES = [
    {
        id: 'cg_findings_by_risk',
        name: 'Cloud Guard Findings by Risk Level',
        query: "'Log Source' = 'OCI Cloud Guard' and Time > dateRelative(24h) | stats count as findings by 'Risk Level', 'Detector Type' | sort -findings",
        category: 'security',
        subcategory: 'cloud_guard',
        description: 'Overview of Cloud Guard security findings',
        tags: ['security', 'cloud_guard', 'findings'],
        tested: false,
        logSources: ['OCI Cloud Guard']
    },
    {
        id: 'cg_critical_findings',
        name: 'Critical Security Findings',
        query: "'Log Source' = 'OCI Cloud Guard' and 'Risk Level' = 'CRITICAL' and Time > dateRelative(7d) | stats count by 'Problem Name', 'Resource Name', 'Compartment Name' | sort -count",
        category: 'security',
        subcategory: 'cloud_guard',
        description: 'Critical severity security findings requiring immediate attention',
        tags: ['security', 'cloud_guard', 'critical'],
        tested: false,
        logSources: ['OCI Cloud Guard'],
        minTimeRange: '7d'
    },
    {
        id: 'cg_findings_trend',
        name: 'Security Findings Trend',
        query: "'Log Source' = 'OCI Cloud Guard' and Time > dateRelative(7d) | timestats 1d count as findings by 'Risk Level' | sort Time",
        category: 'security',
        subcategory: 'cloud_guard',
        description: 'Track security finding trends over time',
        tags: ['security', 'cloud_guard', 'trends'],
        tested: false,
        logSources: ['OCI Cloud Guard'],
        minTimeRange: '7d'
    },
    {
        id: 'sec_brute_force_detection',
        name: 'Brute Force Attack Detection',
        query: "'Event Name' = 'UserLoginFailed' and Time > dateRelative(1h) | stats count as failures by 'User Name', 'Source IP' | where failures > 10 | sort -failures",
        category: 'security',
        subcategory: 'attacks',
        description: 'Detect potential brute force login attempts',
        tags: ['security', 'brute_force', 'login'],
        tested: false
    },
    {
        id: 'sec_impossible_travel',
        name: 'Impossible Travel Detection',
        query: "'Event Name' contains 'Login' and Time > dateRelative(24h) | link 'User Name' maxspan=2h | stats distinct_count('Source IP') as unique_ips, distinct_count('Country') as unique_countries by 'User Name' | where unique_countries > 1",
        category: 'security',
        subcategory: 'anomaly',
        description: 'Detect logins from multiple countries in short time span',
        tags: ['security', 'anomaly', 'travel'],
        tested: false
    },
    {
        id: 'sec_service_account_activity',
        name: 'Service Account Activity',
        query: "'Log Source' = 'OCI Audit Logs' and ('User Name' contains 'service' or 'User Name' contains 'svc' or 'User Name' contains 'automation') and Time > dateRelative(24h) | stats count as actions, distinct_count('Event Name') as unique_actions by 'User Name' | sort -actions",
        category: 'security',
        description: 'Monitor service account usage patterns',
        tags: ['security', 'service_account', 'audit'],
        tested: false,
        logSources: ['OCI Audit Logs']
    },
    {
        id: 'sec_data_exfiltration_risk',
        name: 'Data Exfiltration Risk',
        query: "'Log Source' = 'OCI Object Storage Logs' and 'Event Name' = 'GetObject' and Time > dateRelative(24h) | stats sum('Content Length') as total_bytes by 'User Name', 'Source IP' | eval gb_transferred=round(total_bytes/1073741824, 2) | where gb_transferred > 5 | sort -gb_transferred",
        category: 'security',
        subcategory: 'exfiltration',
        description: 'Identify potential data exfiltration (>5GB transfers)',
        tags: ['security', 'exfiltration', 'data_loss'],
        tested: false,
        logSources: ['OCI Object Storage Logs']
    }
];
// ============================================================================
// COMPUTE INSTANCE ANALYSIS
// ============================================================================
export const COMPUTE_QUERIES = [
    {
        id: 'compute_instance_actions',
        name: 'Instance Lifecycle Actions',
        query: "'Log Source' = 'OCI Audit Logs' and 'Service Name' = 'compute' and ('Event Name' contains 'Instance' or 'Event Name' contains 'Launch' or 'Event Name' contains 'Terminate') and Time > dateRelative(24h) | stats count by 'Event Name', 'User Name', 'Resource Name' | sort -count",
        category: 'compute',
        description: 'Track compute instance lifecycle events',
        tags: ['compute', 'instance', 'lifecycle'],
        tested: false,
        logSources: ['OCI Audit Logs']
    },
    {
        id: 'compute_ssh_access',
        name: 'SSH Access Patterns',
        query: "'Log Source' = 'Linux Secure Logs' and 'Message' contains 'sshd' and Time > dateRelative(24h) | stats count as attempts by 'Host Name (Server)', 'Source IP' | sort -attempts | head 50",
        category: 'compute',
        description: 'Monitor SSH access to compute instances',
        tags: ['compute', 'ssh', 'access', 'security'],
        tested: false,
        logSources: ['Linux Secure Logs']
    },
    {
        id: 'compute_sudo_usage',
        name: 'Sudo Command Usage',
        query: "'Log Source' = 'Linux Secure Logs' and 'Message' contains 'sudo' and Time > dateRelative(24h) | extract 'COMMAND=(?<command>.+)$' from 'Message' | stats count by 'Host Name (Server)', 'User Name', command | sort -count | head 50",
        category: 'compute',
        description: 'Track privileged command execution',
        tags: ['compute', 'sudo', 'privilege', 'security'],
        tested: false,
        logSources: ['Linux Secure Logs']
    }
];
// ============================================================================
// LOAD BALANCER ANALYSIS
// ============================================================================
export const LOAD_BALANCER_QUERIES = [
    {
        id: 'lb_request_distribution',
        name: 'Request Distribution by Backend',
        query: "'Log Source' = 'OCI Load Balancer Logs' and Time > dateRelative(24h) | stats count as requests by 'Backend Server', 'Backend Port' | sort -requests",
        category: 'load_balancer',
        description: 'Distribution of requests across backend servers',
        tags: ['loadbalancer', 'backend', 'distribution'],
        tested: false,
        logSources: ['OCI Load Balancer Logs']
    },
    {
        id: 'lb_error_rate',
        name: 'Load Balancer Error Rate',
        query: "'Log Source' = 'OCI Load Balancer Logs' and Time > dateRelative(24h) | stats count as total, sum(if('Status Code' >= 500, 1, 0)) as errors by 'Load Balancer Name' | eval error_rate=round((errors/total)*100, 2) | sort -error_rate",
        category: 'load_balancer',
        description: 'Calculate error rate per load balancer',
        tags: ['loadbalancer', 'errors', 'availability'],
        tested: false,
        logSources: ['OCI Load Balancer Logs']
    },
    {
        id: 'lb_latency_analysis',
        name: 'Backend Latency Analysis',
        query: "'Log Source' = 'OCI Load Balancer Logs' and Time > dateRelative(24h) | stats avg('Backend Time') as avg_latency, perc95('Backend Time') as p95_latency, max('Backend Time') as max_latency by 'Backend Server' | sort -p95_latency",
        category: 'load_balancer',
        description: 'Analyze response time from backend servers',
        tags: ['loadbalancer', 'latency', 'performance'],
        tested: false,
        logSources: ['OCI Load Balancer Logs']
    }
];
// ============================================================================
// AGGREGATED EXPORTS
// ============================================================================
export const ALL_PREDEFINED_QUERIES = [
    ...VCN_FLOW_QUERIES,
    ...OCI_AUDIT_QUERIES,
    ...DATABASE_QUERIES,
    ...API_GATEWAY_QUERIES,
    ...OBJECT_STORAGE_QUERIES,
    ...SECURITY_QUERIES,
    ...COMPUTE_QUERIES,
    ...LOAD_BALANCER_QUERIES
];
export const QUERY_CATEGORIES = [
    {
        id: 'vcn_flow',
        name: 'VCN Flow Logs',
        description: 'Network traffic analysis from Virtual Cloud Networks',
        queries: VCN_FLOW_QUERIES
    },
    {
        id: 'oci_audit',
        name: 'OCI Audit',
        description: 'OCI service API activity and resource changes',
        queries: OCI_AUDIT_QUERIES
    },
    {
        id: 'database',
        name: 'Database',
        description: 'Oracle Database alerts, audit, and performance',
        queries: DATABASE_QUERIES
    },
    {
        id: 'api_gateway',
        name: 'API Gateway',
        description: 'API Gateway access logs and metrics',
        queries: API_GATEWAY_QUERIES
    },
    {
        id: 'object_storage',
        name: 'Object Storage',
        description: 'Object Storage bucket access and operations',
        queries: OBJECT_STORAGE_QUERIES
    },
    {
        id: 'security',
        name: 'Security',
        description: 'Security findings, threat detection, and anomalies',
        queries: SECURITY_QUERIES
    },
    {
        id: 'compute',
        name: 'Compute',
        description: 'Compute instance access and administration',
        queries: COMPUTE_QUERIES
    },
    {
        id: 'load_balancer',
        name: 'Load Balancer',
        description: 'Load balancer traffic and backend health',
        queries: LOAD_BALANCER_QUERIES
    }
];
/**
 * Get queries by category
 */
export function getQueriesByCategory(categoryId) {
    const category = QUERY_CATEGORIES.find(c => c.id === categoryId);
    return category?.queries || [];
}
/**
 * Get queries by tag
 */
export function getQueriesByTag(tag) {
    return ALL_PREDEFINED_QUERIES.filter(q => q.tags.includes(tag.toLowerCase()));
}
/**
 * Search queries by name or description
 */
export function searchQueries(searchTerm) {
    const lower = searchTerm.toLowerCase();
    return ALL_PREDEFINED_QUERIES.filter(q => q.name.toLowerCase().includes(lower) ||
        q.description.toLowerCase().includes(lower) ||
        q.tags.some(t => t.includes(lower)));
}
/**
 * Get query by ID
 */
export function getQueryById(id) {
    return ALL_PREDEFINED_QUERIES.find(q => q.id === id);
}
/**
 * Get all untested queries
 */
export function getUntestedQueries() {
    return ALL_PREDEFINED_QUERIES.filter(q => !q.tested);
}
/**
 * Get query statistics
 */
export function getQueryStats() {
    const byCategory = {};
    for (const category of QUERY_CATEGORIES) {
        byCategory[category.id] = category.queries.length;
    }
    return {
        total: ALL_PREDEFINED_QUERIES.length,
        tested: ALL_PREDEFINED_QUERIES.filter(q => q.tested).length,
        untested: ALL_PREDEFINED_QUERIES.filter(q => !q.tested).length,
        byCategory
    };
}
