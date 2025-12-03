import { promises as fs } from 'fs';
import path from 'path';
export class QueryTransformer {
    loganQueries = {};
    loaded = false;
    constructor() {
        this.loadQueries();
    }
    normalizePrivilegeAlias(value) {
        if (!value) {
            return value;
        }
        return value === 'privilege-escalation' ? 'privilege_escalation' : value;
    }
    async loadQueries() {
        if (this.loaded)
            return;
        try {
            // Try to load queries from Logan Security Dashboard project
            // Allow override via environment variable, otherwise use default path (if available)
            const loganProjectPath = process.env.LOGAN_PROJECT_PATH || path.join(process.env.HOME || '', 'logan-security-dashboard');
            // Only attempt to load if path exists
            try {
                await fs.access(loganProjectPath);
                await this.loadFromLoganProject(loganProjectPath);
                this.loaded = true;
            }
            catch {
                // Path doesn't exist or isn't accessible, use defaults
                console.error(`Logan project not found at ${loganProjectPath}, using default queries`);
                this.loadDefaultQueries();
                this.loaded = true;
            }
        }
        catch (error) {
            console.error('Failed to load Logan queries, using defaults:', error);
            this.loadDefaultQueries();
            this.loaded = true;
        }
    }
    async loadFromLoganProject(projectPath) {
        // Load MITRE queries
        const mitreQueriesPath = path.join(projectPath, 'config', 'mitre-enhanced-queries.json');
        try {
            const mitreContent = await fs.readFile(mitreQueriesPath, 'utf8');
            const mitreData = JSON.parse(mitreContent);
            this.loganQueries['mitre-attack'] = mitreData.queries || [];
        }
        catch (error) {
            console.error('Failed to load MITRE queries:', error);
        }
        // Load working queries
        const workingQueriesPath = path.join(projectPath, 'config', 'working-queries.json');
        try {
            const workingContent = await fs.readFile(workingQueriesPath, 'utf8');
            const workingData = JSON.parse(workingContent);
            // Organize by category
            Object.entries(workingData).forEach(([category, queries]) => {
                if (Array.isArray(queries)) {
                    const normalizedCategory = this.normalizePrivilegeAlias(category) || category;
                    const normalizedQueries = queries.map(query => ({
                        ...query,
                        category: this.normalizePrivilegeAlias(query.category) || query.category
                    }));
                    this.loganQueries[normalizedCategory] = normalizedQueries;
                    if (normalizedCategory !== category) {
                        this.loganQueries[category] = normalizedQueries;
                    }
                }
            });
        }
        catch (error) {
            console.error('Failed to load working queries:', error);
        }
    }
    loadDefaultQueries() {
        this.loganQueries = {
            'security': [
                {
                    id: 'failed_logins',
                    name: 'Failed Login Attempts',
                    query: "'Event Name' = 'UserLoginFailed' and Time > dateRelative(24h) | stats count by 'User Name', 'IP Address' | sort -count",
                    category: 'security',
                    description: 'Find failed login attempts in the last 24 hours'
                },
                {
                    id: 'security_alerts_clustering',
                    name: 'Security Alerts Pattern Analysis',
                    query: "Severity = 'error' AND 'Entity Type' = 'Security Alert' and Time > dateRelative(24h) | cluster maxclusters=10 t=0.8 field='Alert Type', 'Source IP'",
                    category: 'security',
                    description: 'Cluster security alerts to identify patterns using advanced analytics'
                },
                {
                    id: 'outlier_user_activity',
                    name: 'Anomalous User Activity Detection',
                    query: "'Event Name' contains 'User' and Time > dateRelative(7d) | stats count by 'User Name' | outlier threshold=2.5",
                    category: 'security',
                    description: 'Detect users with unusual activity levels using outlier analysis'
                },
                {
                    id: 'security_sequence_analysis',
                    name: 'Attack Sequence Detection',
                    query: "'Log Source' = 'Security Events' and Time > dateRelative(24h) | sequence 'User Name', 'IP Address' maxspan=1h",
                    category: 'security',
                    description: 'Identify sequences of security events that may indicate coordinated attacks'
                }
            ],
            'privilege_escalation': [
                {
                    id: 'privilege_escalation_role_assignments',
                    name: 'Role Assignment Escalations',
                    query: "('Event Name' contains 'RoleAssign' or 'Event Name' contains 'PrivilegeUse') and Time > dateRelative(24h) | stats count by 'User Name', 'Event Name' | sort -count",
                    category: 'privilege_escalation',
                    description: 'Detect potential privilege escalation through new role assignments or privilege usage'
                },
                {
                    id: 'privilege_escalation_policy_changes',
                    name: 'High-Risk Policy Changes',
                    query: "('Event Name' = 'CreatePolicy' or 'Event Name' = 'UpdatePolicy' or 'Event Name' = 'AttachPolicy' or 'Event Name' = 'CreateDynamicGroup') and Time > dateRelative(7d) | stats count by 'User Name', 'Event Name', 'Policy Name' | sort -count",
                    category: 'privilege_escalation',
                    description: 'Highlight recent policy and dynamic group changes that may elevate privileges'
                },
                {
                    id: 'privilege_escalation_account_changes',
                    name: 'Elevated Account Changes',
                    query: "('Event Name' = 'CreateUser' or 'Event Name' = 'UpdateUser' or 'Event Name' contains 'Group') and Time > dateRelative(7d) | stats count by 'User Name', 'Event Name' | sort -count",
                    category: 'privilege_escalation',
                    description: 'Surface newly created or modified accounts that could indicate privilege escalation'
                }
            ],
            'network': [
                {
                    id: 'suspicious_connections',
                    name: 'Suspicious Network Connections',
                    query: "'Log Source' = 'VCN Flow Logs' and 'Action' = 'ACCEPT' and Time > dateRelative(24h) | stats count by 'Source IP', 'Destination IP' | sort -count",
                    category: 'network',
                    description: 'Find high-volume network connections'
                },
                {
                    id: 'geographic_network_analysis',
                    name: 'Geographic Network Traffic Analysis',
                    query: "'Log Source' = 'VCN Flow Logs' and Time > dateRelative(24h) | geostats latfield='Source Latitude' longfield='Source Longitude' count by 'Protocol'",
                    category: 'network',
                    description: 'Analyze network traffic patterns by geographic location using geostats'
                },
                {
                    id: 'network_communication_linking',
                    name: 'Network Communication Correlation',
                    query: "'Log Source' = 'VCN Flow Logs' and Time > dateRelative(24h) | link 'Source IP', 'Destination IP' maxspan=5m",
                    category: 'network',
                    description: 'Link network communications to identify transaction flows'
                },
                {
                    id: 'top_talkers_analysis',
                    name: 'Top Network Talkers',
                    query: "'Log Source' = 'VCN Flow Logs' and Time > dateRelative(24h) | stats sum('Bytes') as total_bytes by 'Source IP' | top 10 'Source IP'",
                    category: 'network',
                    description: 'Identify top bandwidth consumers using statistical analysis'
                },
                {
                    id: 'network_protocol_trends',
                    name: 'Network Protocol Usage Trends',
                    query: "'Log Source' = 'VCN Flow Logs' and Time > dateRelative(7d) | timestats 1h count as connections by 'Protocol' | sort Time",
                    category: 'network',
                    description: 'Analyze network protocol usage trends over time'
                }
            ],
            'authentication': [
                {
                    id: 'admin_logins',
                    name: 'Administrator Logins',
                    query: "'Event Name' = 'UserLogin' and 'User Name' contains 'admin' and Time > dateRelative(24h) | stats count by 'User Name', 'IP Address'",
                    category: 'authentication',
                    description: 'Monitor administrator account logins'
                },
                {
                    id: 'auth_time_patterns',
                    name: 'Authentication Time Pattern Analysis',
                    query: "'Event Name' contains 'Login' and Time > dateRelative(7d) | timestats 1h count as logins by 'Event Name' | eval hour=strftime(Time, '%H') | stats avg(logins) as avg_logins by hour | sort hour",
                    category: 'authentication',
                    description: 'Analyze authentication patterns by time of day using eval and timestats'
                },
                {
                    id: 'failed_auth_clustering',
                    name: 'Failed Authentication Pattern Clustering',
                    query: "'Event Name' = 'UserLoginFailed' and Time > dateRelative(24h) | cluster maxclusters=5 t=0.7 field='User Name', 'IP Address', 'Error Code'",
                    category: 'authentication',
                    description: 'Cluster failed authentication attempts to identify attack patterns'
                },
                {
                    id: 'auth_success_rate',
                    name: 'Authentication Success Rate Analysis',
                    query: "'Event Name' contains 'Login' and Time > dateRelative(24h) | stats count by 'Event Name', 'User Name' | eval success_rate=if('Event Name'='UserLogin', count, 0) | stats sum(success_rate) as successful, sum(count) as total by 'User Name' | eval success_percent=round((successful/total)*100, 2) | sort -success_percent",
                    category: 'authentication',
                    description: 'Calculate authentication success rates using advanced field operations'
                }
            ],
            'advanced_analytics': [
                {
                    id: 'nlp_log_analysis',
                    name: 'Natural Language Processing on Logs',
                    query: "'Log Message' is not null and Time > dateRelative(24h) | nlp | classify sentiment | stats count by sentiment",
                    category: 'advanced_analytics',
                    description: 'Apply NLP to analyze log message sentiment and classification'
                },
                {
                    id: 'time_based_clustering',
                    name: 'Temporal Event Clustering',
                    query: "* and Time > dateRelative(24h) | timecluster span=1h | stats count by cluster_id, 'Event Name' | sort -count",
                    category: 'advanced_analytics',
                    description: 'Cluster events based on temporal patterns using timecluster'
                },
                {
                    id: 'field_extraction_analysis',
                    name: 'Dynamic Field Extraction',
                    query: "'Log Message' contains 'user=' and Time > dateRelative(24h) | extract 'user=(?<extracted_user>[^\\s]+)' | stats count by extracted_user | sort -count",
                    category: 'advanced_analytics',
                    description: 'Extract custom fields from log messages using regex patterns'
                },
                {
                    id: 'bucket_analysis',
                    name: 'Response Time Bucket Analysis',
                    query: "'Response Time' is not null and Time > dateRelative(24h) | bucket 'Response Time' [0, 100, 500, 1000, 5000] | stats count by 'Response Time_bucket', 'Service Name' | sort 'Response Time_bucket'",
                    category: 'advanced_analytics',
                    description: 'Bucket response times into ranges for performance analysis'
                },
                {
                    id: 'dedup_unique_events',
                    name: 'Unique Events Analysis',
                    query: "* and Time > dateRelative(24h) | dedup 'Event Name', 'User Name', 'Resource Name' | stats count by 'Event Name' | sort -count",
                    category: 'advanced_analytics',
                    description: 'Remove duplicate events to analyze unique occurrences'
                }
            ],
            'statistical_analysis': [
                {
                    id: 'error_frequency_stats',
                    name: 'Error Frequency Statistical Analysis',
                    query: "Severity = 'error' and Time > dateRelative(7d) | timestats 1h count as errors | eventstats avg(errors) as avg_errors, stdev(errors) as stdev_errors | eval z_score=(errors-avg_errors)/stdev_errors | where z_score > 2",
                    category: 'statistical_analysis',
                    description: 'Statistical analysis of error frequencies with Z-score calculation'
                },
                {
                    id: 'user_activity_stats',
                    name: 'User Activity Statistical Summary',
                    query: "'User Name' is not null and Time > dateRelative(24h) | stats count, distinct_count('Event Name') as unique_events, min(Time) as first_activity, max(Time) as last_activity by 'User Name' | eval activity_duration=last_activity-first_activity | sort -count",
                    category: 'statistical_analysis',
                    description: 'Comprehensive statistical analysis of user activity patterns'
                },
                {
                    id: 'resource_usage_percentiles',
                    name: 'Resource Usage Percentile Analysis',
                    query: "'CPU Usage' is not null and Time > dateRelative(24h) | stats count, avg('CPU Usage') as avg_cpu, perc50('CPU Usage') as median_cpu, perc95('CPU Usage') as p95_cpu, perc99('CPU Usage') as p99_cpu by 'Host Name' | sort -p99_cpu",
                    category: 'statistical_analysis',
                    description: 'Percentile analysis of resource usage metrics'
                },
                {
                    id: 'frequent_rare_analysis',
                    name: 'Frequent and Rare Events Analysis',
                    query: "* and Time > dateRelative(24h) | stats count by 'Event Name' | eval event_frequency=case(count>1000, 'very_frequent', count>100, 'frequent', count>10, 'common', count>1, 'rare', 'very_rare') | stats count as event_types by event_frequency | sort -event_types",
                    category: 'statistical_analysis',
                    description: 'Classify events by frequency using statistical thresholds'
                }
            ],
            'compliance_monitoring': [
                {
                    id: 'audit_trail_analysis',
                    name: 'Audit Trail Compliance Check',
                    query: "'Log Source' = 'OCI Audit Logs' and Time > dateRelative(24h) | stats count by 'Event Name', 'User Name', 'Resource Name' | where count > 1 | sort -count",
                    category: 'compliance_monitoring',
                    description: 'Monitor audit trails for compliance verification'
                },
                {
                    id: 'privileged_access_monitoring',
                    name: 'Privileged Access Monitoring',
                    query: "'Event Name' contains 'Admin' or 'Event Name' contains 'Root' or 'Event Name' contains 'Privilege' and Time > dateRelative(24h) | addfields risk_score=case('Event Name' contains 'Root', 5, 'Event Name' contains 'Admin', 3, 1) | stats sum(risk_score) as total_risk, count as access_count by 'User Name' | sort -total_risk",
                    category: 'compliance_monitoring',
                    description: 'Monitor privileged access with risk scoring using addfields and eval'
                },
                {
                    id: 'data_access_patterns',
                    name: 'Sensitive Data Access Patterns',
                    query: "'Resource Name' contains 'sensitive' or 'Resource Name' contains 'pii' or 'Resource Name' contains 'confidential' and Time > dateRelative(7d) | link 'User Name', 'Resource Name' maxspan=1h | stats count as access_frequency by linked_events | sort -access_frequency",
                    category: 'compliance_monitoring',
                    description: 'Analyze patterns of sensitive data access using link analysis'
                }
            ]
        };
        this.loganQueries['privilege-escalation'] = this.loganQueries['privilege_escalation'];
    }
    async transformSearchToQuery(searchTerm, eventType) {
        await this.loadQueries();
        const normalizedEventType = this.normalizePrivilegeAlias(eventType) || eventType;
        const lowerSearchTerm = searchTerm.toLowerCase();
        // Security event patterns
        if (normalizedEventType === 'login' || lowerSearchTerm.includes('login') || lowerSearchTerm.includes('authentication')) {
            if (lowerSearchTerm.includes('failed') || lowerSearchTerm.includes('unsuccessful')) {
                return "'Event Name' = 'UserLoginFailed' and Time > dateRelative(24h) | stats count by 'User Name', 'IP Address' | sort -count | head 100";
            }
            return "'Event Name' = 'UserLogin' and Time > dateRelative(24h) | stats count by 'User Name', 'IP Address' | sort -count | head 100";
        }
        if (normalizedEventType === 'privilege_escalation' || lowerSearchTerm.includes('privilege') || lowerSearchTerm.includes('escalation')) {
            return "'Event Name' contains 'RoleAssign' or 'Event Name' contains 'PrivilegeUse' and Time > dateRelative(24h) | stats count by 'User Name', 'Event Name' | sort -count | head 100";
        }
        if (normalizedEventType === 'network_anomaly' || lowerSearchTerm.includes('network') || lowerSearchTerm.includes('connection')) {
            return "'Log Source' = 'VCN Flow Logs' and Time > dateRelative(24h) | stats count by 'Source IP', 'Destination IP', 'Action' | sort -count | head 100";
        }
        if (normalizedEventType === 'malware' || lowerSearchTerm.includes('malware') || lowerSearchTerm.includes('virus')) {
            return "'Event Name' contains 'Malware' or 'Event Name' contains 'Virus' and Time > dateRelative(24h) | stats count by 'Event Name', 'File Path' | sort -count | head 100";
        }
        if (normalizedEventType === 'data_exfiltration' || lowerSearchTerm.includes('exfiltration') || lowerSearchTerm.includes('data transfer')) {
            return "'Log Source' = 'Object Storage Logs' and ('Event Name' = 'GetObject' or 'Event Name' = 'DownloadObject') and Time > dateRelative(24h) | stats sum('Bytes Transferred') as total_bytes by 'User Name', 'IP Address' | sort -total_bytes | head 100";
        }
        // Generic search
        if (lowerSearchTerm.includes('error') || lowerSearchTerm.includes('exception')) {
            return `'Event Name' contains 'Error' or 'Event Name' contains 'Exception' and Time > dateRelative(24h) | search '${searchTerm}' | head 100`;
        }
        // Default comprehensive search
        return `* and Time > dateRelative(24h) | search '${searchTerm}' | head 100`;
    }
    async getMitreCategoryQuery(category) {
        await this.loadQueries();
        const normalizedCategory = this.normalizePrivilegeAlias(category) || category;
        const categoryMappings = {
            'initial_access': ['T1078', 'T1190', 'T1133', 'T1200', 'T1566'],
            'execution': ['T1059', 'T1106', 'T1129', 'T1203', 'T1559'],
            'persistence': ['T1053', 'T1098', 'T1136', 'T1176', 'T1543'],
            'privilege_escalation': ['T1055', 'T1068', 'T1134', 'T1484', 'T1548'],
            'defense_evasion': ['T1027', 'T1036', 'T1055', 'T1070', 'T1112'],
            'credential_access': ['T1003', 'T1110', 'T1555', 'T1212', 'T1056'],
            'discovery': ['T1007', 'T1018', 'T1033', 'T1057', 'T1082'],
            'lateral_movement': ['T1021', 'T1047', 'T1210', 'T1534', 'T1563'],
            'collection': ['T1005', 'T1039', 'T1056', 'T1113', 'T1125'],
            'command_and_control': ['T1071', 'T1090', 'T1095', 'T1105', 'T1572'],
            'exfiltration': ['T1041', 'T1048', 'T1052', 'T1567', 'T1029'],
            'impact': ['T1485', 'T1486', 'T1490', 'T1498', 'T1529']
        };
        const techniques = categoryMappings[normalizedCategory];
        if (!techniques) {
            return "'Log Source' = 'Windows Sysmon Events' and 'Technique_id' is not null and Time > dateRelative(7d) | timestats count as events by 'Technique_id' | sort -events | head 50";
        }
        const techniqueFilters = techniques.map(t => `'Technique_id' like '${t}*'`).join(' or ');
        return `'Log Source' = 'Windows Sysmon Events' and (${techniqueFilters}) and Time > dateRelative(7d) | timestats count as events by 'Technique_id', 'Event Name' | sort -events`;
    }
    async getIPAnalysisQueries(ipAddress, analysisType) {
        const queries = [];
        if (analysisType === 'full' || analysisType === 'authentication') {
            queries.push({
                type: 'authentication',
                description: 'Authentication events for this IP',
                query: `('Event Name' = 'UserLogin' or 'Event Name' = 'UserLoginFailed') and ('IP Address' = '${ipAddress}' or 'Source IP' = '${ipAddress}') and Time > dateRelative(24h) | stats count by 'Event Name', 'User Name' | sort -count`
            });
        }
        if (analysisType === 'full' || analysisType === 'network') {
            queries.push({
                type: 'network',
                description: 'Network connections from/to this IP',
                query: `'Log Source' = 'VCN Flow Logs' and ('Source IP' = '${ipAddress}' or 'Destination IP' = '${ipAddress}') and Time > dateRelative(24h) | stats count by 'Source IP', 'Destination IP', 'Protocol', 'Action' | sort -count`
            });
        }
        if (analysisType === 'full' || analysisType === 'threat_intel') {
            queries.push({
                type: 'threat_intel',
                description: 'Security events involving this IP',
                query: `('Event Name' contains 'Security' or 'Event Name' contains 'Threat' or 'Event Name' contains 'Malicious') and ('IP Address' = '${ipAddress}' or 'Source IP' = '${ipAddress}' or 'Destination IP' = '${ipAddress}') and Time > dateRelative(24h)`
            });
        }
        if (analysisType === 'full' || analysisType === 'communication_patterns') {
            queries.push({
                type: 'communication_patterns',
                description: 'Communication patterns and frequency',
                query: `('Source IP' = '${ipAddress}' or 'Destination IP' = '${ipAddress}') and Time > dateRelative(24h) | timestats count as connections by Time span=1h | sort Time`
            });
        }
        return queries;
    }
    async getLoganQueries(category, queryName) {
        await this.loadQueries();
        let result = [];
        if (category && category !== 'all') {
            const normalizedCategory = this.normalizePrivilegeAlias(category) || category;
            result = this.loganQueries[normalizedCategory] || this.loganQueries[category] || [];
        }
        else {
            // Get all queries from all categories
            result = Object.values(this.loganQueries).flat();
        }
        if (queryName) {
            result = result.filter(q => q.name.toLowerCase().includes(queryName.toLowerCase()) ||
                q.id.toLowerCase().includes(queryName.toLowerCase()));
        }
        return result;
    }
    async buildQueryFromTemplate(templateId, parameters) {
        await this.loadQueries();
        const templates = {
            'user_activity': "'Event Name' contains '{eventType}' and 'User Name' = '{userName}' and Time > dateRelative({timeRange})",
            'ip_investigation': "('IP Address' = '{ipAddress}' or 'Source IP' = '{ipAddress}' or 'Destination IP' = '{ipAddress}') and Time > dateRelative({timeRange})",
            'resource_access': "'Resource Name' = '{resourceName}' and Time > dateRelative({timeRange}) | stats count by 'Event Name', 'User Name'",
            'time_range_analysis': "* and Time > dateRelative({timeRange}) and Time < dateRelative({endTime}) | stats count by 'Event Name'",
            'compartment_activity': "'Compartment Name' = '{compartmentName}' and Time > dateRelative({timeRange}) | stats count by 'Event Name', 'User Name'"
        };
        let template = templates[templateId];
        if (!template) {
            throw new Error(`Unknown template: ${templateId}`);
        }
        // Replace parameters in template
        Object.entries(parameters).forEach(([key, value]) => {
            template = template.replace(new RegExp(`{${key}}`, 'g'), String(value));
        });
        return template;
    }
    convertNaturalLanguageToQuery(naturalQuery) {
        const lower = naturalQuery.toLowerCase();
        // Time expressions
        let timeFilter = 'Time > dateRelative(24h)';
        if (lower.includes('last hour') || lower.includes('past hour')) {
            timeFilter = 'Time > dateRelative(1h)';
        }
        else if (lower.includes('last week') || lower.includes('past week')) {
            timeFilter = 'Time > dateRelative(7d)';
        }
        else if (lower.includes('last month') || lower.includes('past month')) {
            timeFilter = 'Time > dateRelative(30d)';
        }
        // Event type detection
        if (lower.includes('failed login') || lower.includes('login fail')) {
            return `'Event Name' = 'UserLoginFailed' and ${timeFilter} | stats count by 'User Name', 'IP Address' | sort -count`;
        }
        if (lower.includes('admin') && lower.includes('login')) {
            return `'Event Name' = 'UserLogin' and 'User Name' contains 'admin' and ${timeFilter} | stats count by 'User Name', 'IP Address'`;
        }
        if (lower.includes('delete') || lower.includes('deletion')) {
            return `'Event Name' contains 'Delete' and ${timeFilter} | stats count by 'Event Name', 'User Name', 'Resource Name' | sort -count`;
        }
        if (lower.includes('error') || lower.includes('exception')) {
            return `('Event Name' contains 'Error' or 'Event Name' contains 'Exception') and ${timeFilter} | stats count by 'Event Name' | sort -count`;
        }
        // Default search
        const searchTerms = naturalQuery.split(' ').filter(word => word.length > 3 && !['show', 'find', 'get', 'list', 'from', 'with', 'last', 'past'].includes(word.toLowerCase()));
        if (searchTerms.length > 0) {
            return `* and ${timeFilter} | search "${searchTerms.join(' ')}" | head 100`;
        }
        return `* and ${timeFilter} | head 100`;
    }
}
