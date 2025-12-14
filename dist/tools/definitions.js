/**
 * OCI Logan MCP Server - Tool Definitions
 * Following MCP best practices with tool annotations
 */
// ============================================
// Tool Annotations
// ============================================
const READ_ONLY = {
    title: '',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
};
const WRITE_SAFE = {
    title: '',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false
};
const WRITE_DESTRUCTIVE = {
    title: '',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false
};
// ============================================
// Tool Definitions
// ============================================
export const TOOL_DEFINITIONS = [
    // Query Execution Tools
    {
        name: 'oci_logan_execute_query',
        description: 'Execute a Logan Security Dashboard query against OCI Logging Analytics with enhanced query language support',
        annotations: { ...READ_ONLY, title: 'Execute OCI Log Query' },
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'OCI Logging Analytics query using pipe-delimited commands (e.g., "Severity = \'error\' | stats count by \'Host Name\'")'
                },
                queryName: {
                    type: 'string',
                    description: 'Name/identifier for the query (optional)'
                },
                timeRange: {
                    type: 'string',
                    description: 'Time range for the query (Sysmon/security data recommended: 30d, general queries: 24h)',
                    enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'],
                    default: '24h'
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID (optional, uses default if not provided)'
                },
                environment: {
                    type: 'string',
                    description: 'Environment name for multi-tenant queries (optional)'
                },
                timeFilter: {
                    type: 'string',
                    description: 'Custom time filter using dateRelative() or toDate() functions (overrides timeRange if provided)'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown',
                    description: 'Response format'
                }
            },
            required: ['query']
        }
    },
    {
        name: 'oci_logan_search_security_events',
        description: 'Search for security events using natural language or predefined patterns',
        annotations: { ...READ_ONLY, title: 'Search Security Events' },
        inputSchema: {
            type: 'object',
            properties: {
                searchTerm: {
                    type: 'string',
                    description: 'Natural language description or specific security event pattern'
                },
                eventType: {
                    type: 'string',
                    description: 'Type of security event',
                    enum: ['login', 'privilege_escalation', 'privilege-escalation', 'network_anomaly', 'data_exfiltration', 'malware', 'all'],
                    default: 'all'
                },
                timeRange: {
                    type: 'string',
                    description: 'Time range for the search',
                    default: '24h'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results (1-100)',
                    default: 20,
                    minimum: 1,
                    maximum: 100
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            },
            required: ['searchTerm']
        }
    },
    {
        name: 'oci_logan_get_mitre_techniques',
        description: 'Search for MITRE ATT&CK techniques in the logs',
        annotations: { ...READ_ONLY, title: 'Get MITRE Techniques' },
        inputSchema: {
            type: 'object',
            properties: {
                techniqueId: {
                    type: 'string',
                    description: 'Specific MITRE technique ID (e.g., T1003, T1110) or "all" for all techniques'
                },
                category: {
                    type: 'string',
                    description: 'MITRE tactic category',
                    enum: ['initial_access', 'execution', 'persistence', 'privilege_escalation', 'privilege-escalation', 'defense_evasion', 'credential_access', 'discovery', 'lateral_movement', 'collection', 'command_and_control', 'exfiltration', 'impact', 'all'],
                    default: 'all'
                },
                timeRange: {
                    type: 'string',
                    description: 'Time range for the analysis (Sysmon data defaults to 30 days)',
                    enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'],
                    default: '30d'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            }
        }
    },
    {
        name: 'oci_logan_analyze_ip_activity',
        description: 'Analyze activity for specific IP addresses',
        annotations: { ...READ_ONLY, title: 'Analyze IP Activity' },
        inputSchema: {
            type: 'object',
            properties: {
                ipAddress: {
                    type: 'string',
                    description: 'IP address to analyze (IPv4 or IPv6)'
                },
                analysisType: {
                    type: 'string',
                    description: 'Type of analysis to perform',
                    enum: ['full', 'authentication', 'network', 'threat_intel', 'communication_patterns'],
                    default: 'full'
                },
                timeRange: {
                    type: 'string',
                    description: 'Time range for the analysis',
                    default: '24h'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            },
            required: ['ipAddress']
        }
    },
    // Utility Tools
    {
        name: 'oci_logan_get_queries',
        description: 'Get predefined Logan Security Dashboard queries by category',
        annotations: { ...READ_ONLY, title: 'Get Predefined Queries' },
        inputSchema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    description: 'Query category',
                    enum: ['mitre-attack', 'security', 'network', 'authentication', 'privilege_escalation', 'privilege-escalation', 'advanced_analytics', 'statistical_analysis', 'compliance_monitoring', 'all']
                },
                queryName: {
                    type: 'string',
                    description: 'Specific query name (optional)'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            }
        }
    },
    {
        name: 'oci_logan_validate_query',
        description: 'Validate an OCI Logging Analytics query syntax',
        annotations: { ...READ_ONLY, title: 'Validate Query Syntax' },
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Query to validate'
                },
                fix: {
                    type: 'boolean',
                    description: 'Attempt to automatically fix common syntax errors',
                    default: false
                }
            },
            required: ['query']
        }
    },
    {
        name: 'oci_logan_get_documentation',
        description: 'Get documentation and help for OCI Logging Analytics and Logan queries',
        annotations: { ...READ_ONLY, title: 'Get Documentation' },
        inputSchema: {
            type: 'object',
            properties: {
                topic: {
                    type: 'string',
                    description: 'Documentation topic',
                    enum: ['query_syntax', 'field_names', 'functions', 'time_filters', 'operators', 'mitre_mapping', 'examples', 'troubleshooting']
                },
                searchTerm: {
                    type: 'string',
                    description: 'Specific term to search for in documentation'
                }
            }
        }
    },
    {
        name: 'oci_logan_usage_guide',
        description: 'Return a concise usage guide and best-practice tips for Logan MCP tools',
        annotations: { ...READ_ONLY, title: 'Usage Guide' },
        inputSchema: {
            type: 'object',
            properties: {
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            }
        }
    },
    {
        name: 'oci_logan_health',
        description: 'Health/status check for the OCI Logan MCP server (no side effects)',
        annotations: { ...READ_ONLY, title: 'Health Check' },
        inputSchema: {
            type: 'object',
            properties: {
                detail: {
                    type: 'boolean',
                    description: 'Return extended detail if true',
                    default: false
                }
            }
        }
    },
    {
        name: 'oci_logan_check_connection',
        description: 'Check OCI Logging Analytics connection and authentication',
        annotations: { ...READ_ONLY, title: 'Check OCI Connection' },
        inputSchema: {
            type: 'object',
            properties: {
                testQuery: {
                    type: 'boolean',
                    description: 'Run a test query to verify connectivity',
                    default: true
                }
            }
        }
    },
    // Dashboard Management Tools
    {
        name: 'oci_logan_list_dashboards',
        description: 'List OCI dashboards from the tenant with pagination',
        annotations: { ...READ_ONLY, title: 'List Dashboards' },
        inputSchema: {
            type: 'object',
            properties: {
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID (uses default if not provided)'
                },
                displayName: {
                    type: 'string',
                    description: 'Filter dashboards by display name (partial match)'
                },
                lifecycleState: {
                    type: 'string',
                    description: 'Filter by lifecycle state',
                    enum: ['CREATING', 'UPDATING', 'ACTIVE', 'DELETING', 'DELETED', 'FAILED'],
                    default: 'ACTIVE'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results (1-100)',
                    default: 20,
                    minimum: 1,
                    maximum: 100
                },
                offset: {
                    type: 'number',
                    description: 'Number of items to skip',
                    default: 0,
                    minimum: 0
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            }
        }
    },
    {
        name: 'oci_logan_get_dashboard',
        description: 'Get details of a specific OCI dashboard',
        annotations: { ...READ_ONLY, title: 'Get Dashboard' },
        inputSchema: {
            type: 'object',
            properties: {
                dashboardId: {
                    type: 'string',
                    description: 'OCID of the dashboard to retrieve'
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID (optional, for validation)'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            },
            required: ['dashboardId']
        }
    },
    {
        name: 'oci_logan_get_dashboard_tiles',
        description: 'Get tiles/widgets from a specific OCI dashboard',
        annotations: { ...READ_ONLY, title: 'Get Dashboard Tiles' },
        inputSchema: {
            type: 'object',
            properties: {
                dashboardId: {
                    type: 'string',
                    description: 'OCID of the dashboard'
                },
                tileType: {
                    type: 'string',
                    description: 'Filter tiles by type',
                    enum: ['all', 'query', 'visualization', 'metric', 'text'],
                    default: 'all'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            },
            required: ['dashboardId']
        }
    },
    {
        name: 'oci_logan_create_dashboard',
        description: 'Create a new dashboard with queries and visualizations',
        annotations: { ...WRITE_SAFE, title: 'Create Dashboard' },
        inputSchema: {
            type: 'object',
            properties: {
                displayName: {
                    type: 'string',
                    description: 'Display name for the dashboard'
                },
                description: {
                    type: 'string',
                    description: 'Description of the dashboard'
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID (uses default if not provided)'
                },
                dashboardConfig: {
                    type: 'object',
                    description: 'Dashboard configuration including widgets',
                    properties: {
                        widgets: {
                            type: 'array',
                            description: 'Array of widget configurations (max 50)',
                            items: {
                                type: 'object',
                                properties: {
                                    displayName: { type: 'string' },
                                    widgetType: { type: 'string', enum: ['LINE_CHART', 'BAR_CHART', 'PIE_CHART', 'TABLE', 'METRIC', 'TEXT'] },
                                    query: { type: 'string' },
                                    position: {
                                        type: 'object',
                                        properties: {
                                            row: { type: 'number' },
                                            column: { type: 'number' },
                                            height: { type: 'number' },
                                            width: { type: 'number' }
                                        }
                                    }
                                },
                                required: ['displayName', 'widgetType', 'query']
                            }
                        }
                    }
                }
            },
            required: ['displayName']
        }
    },
    {
        name: 'oci_logan_update_dashboard',
        description: 'Update an existing dashboard',
        annotations: { ...WRITE_SAFE, title: 'Update Dashboard' },
        inputSchema: {
            type: 'object',
            properties: {
                dashboardId: {
                    type: 'string',
                    description: 'OCID of the dashboard to update'
                },
                displayName: {
                    type: 'string',
                    description: 'New display name (optional)'
                },
                description: {
                    type: 'string',
                    description: 'New description (optional)'
                },
                addWidgets: {
                    type: 'array',
                    description: 'Widgets to add to the dashboard',
                    items: { type: 'object' }
                },
                removeWidgetIds: {
                    type: 'array',
                    description: 'IDs of widgets to remove',
                    items: { type: 'string' }
                }
            },
            required: ['dashboardId']
        }
    },
    {
        name: 'oci_logan_create_saved_search',
        description: 'Create a saved search in Log Analytics',
        annotations: { ...WRITE_SAFE, title: 'Create Saved Search' },
        inputSchema: {
            type: 'object',
            properties: {
                displayName: {
                    type: 'string',
                    description: 'Display name for the saved search'
                },
                query: {
                    type: 'string',
                    description: 'Logan query to save'
                },
                description: {
                    type: 'string',
                    description: 'Description of the saved search'
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID (uses default if not provided)'
                },
                widgetType: {
                    type: 'string',
                    description: 'Preferred visualization type',
                    enum: ['SEARCH', 'CHART', 'TABLE', 'METRIC'],
                    default: 'SEARCH'
                }
            },
            required: ['displayName', 'query']
        }
    },
    {
        name: 'oci_logan_list_saved_searches',
        description: 'List saved searches from Log Analytics with pagination',
        annotations: { ...READ_ONLY, title: 'List Saved Searches' },
        inputSchema: {
            type: 'object',
            properties: {
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID (uses default if not provided)'
                },
                displayName: {
                    type: 'string',
                    description: 'Filter by display name'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results (1-100)',
                    default: 20,
                    minimum: 1,
                    maximum: 100
                },
                offset: {
                    type: 'number',
                    description: 'Number of items to skip',
                    default: 0,
                    minimum: 0
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            }
        }
    },
    {
        name: 'oci_logan_export_dashboard',
        description: 'Export dashboard configuration as JSON',
        annotations: { ...READ_ONLY, title: 'Export Dashboard' },
        inputSchema: {
            type: 'object',
            properties: {
                dashboardId: {
                    type: 'string',
                    description: 'OCID of the dashboard to export'
                },
                includeQueries: {
                    type: 'boolean',
                    description: 'Include full query definitions',
                    default: true
                }
            },
            required: ['dashboardId']
        }
    },
    {
        name: 'oci_logan_import_dashboard',
        description: 'Import dashboard from JSON configuration',
        annotations: { ...WRITE_SAFE, title: 'Import Dashboard' },
        inputSchema: {
            type: 'object',
            properties: {
                dashboardJson: {
                    type: 'string',
                    description: 'JSON string containing dashboard configuration'
                },
                compartmentId: {
                    type: 'string',
                    description: 'Target compartment OCID (uses default if not provided)'
                },
                newDisplayName: {
                    type: 'string',
                    description: 'Override display name (optional)'
                }
            },
            required: ['dashboardJson']
        }
    },
    // Advanced Analytics Tools
    {
        name: 'oci_logan_execute_advanced_analytics',
        description: 'Execute advanced analytics queries (cluster, link, nlp, classify, outlier, sequence, geostats, timecluster)',
        annotations: { ...READ_ONLY, title: 'Advanced Analytics' },
        inputSchema: {
            type: 'object',
            properties: {
                analyticsType: {
                    type: 'string',
                    description: 'Type of advanced analytics',
                    enum: ['cluster', 'link', 'nlp', 'classify', 'outlier', 'sequence', 'geostats', 'timecluster']
                },
                query: {
                    type: 'string',
                    description: 'Base query for analytics (optional)'
                },
                field: {
                    type: 'string',
                    description: 'Field to analyze'
                },
                parameters: {
                    type: 'object',
                    description: 'Additional analytics parameters'
                },
                timeRange: {
                    type: 'string',
                    enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'],
                    default: '24h'
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            },
            required: ['analyticsType']
        }
    },
    {
        name: 'oci_logan_execute_statistical_analysis',
        description: 'Execute statistical analysis (stats, timestats, eventstats, top, bottom, rare, distinct)',
        annotations: { ...READ_ONLY, title: 'Statistical Analysis' },
        inputSchema: {
            type: 'object',
            properties: {
                operation: {
                    type: 'string',
                    description: 'Statistical operation',
                    enum: ['stats', 'timestats', 'eventstats', 'top', 'bottom', 'rare', 'distinct']
                },
                fields: {
                    type: 'array',
                    description: 'Fields for statistical analysis (1-20 fields)',
                    items: { type: 'string' }
                },
                groupBy: {
                    type: 'array',
                    description: 'Fields to group by (max 10)',
                    items: { type: 'string' }
                },
                query: {
                    type: 'string',
                    description: 'Base query (optional)'
                },
                timeRange: {
                    type: 'string',
                    enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'],
                    default: '24h'
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            },
            required: ['operation', 'fields']
        }
    },
    {
        name: 'oci_logan_execute_field_operations',
        description: 'Execute field operations (extract, parse, rename, eval, lookup, split, concat, replace)',
        annotations: { ...READ_ONLY, title: 'Field Operations' },
        inputSchema: {
            type: 'object',
            properties: {
                operation: {
                    type: 'string',
                    description: 'Field operation type',
                    enum: ['extract', 'parse', 'rename', 'eval', 'lookup', 'split', 'concat', 'replace']
                },
                sourceField: {
                    type: 'string',
                    description: 'Source field name'
                },
                targetField: {
                    type: 'string',
                    description: 'Target field name'
                },
                pattern: {
                    type: 'string',
                    description: 'Regex pattern for extraction'
                },
                expression: {
                    type: 'string',
                    description: 'Expression for eval/replace'
                },
                query: {
                    type: 'string',
                    description: 'Base query (optional)'
                },
                timeRange: {
                    type: 'string',
                    enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'],
                    default: '24h'
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            },
            required: ['operation', 'sourceField']
        }
    },
    {
        name: 'oci_logan_search_log_patterns',
        description: 'Search for patterns in log data',
        annotations: { ...READ_ONLY, title: 'Search Log Patterns' },
        inputSchema: {
            type: 'object',
            properties: {
                pattern: {
                    type: 'string',
                    description: 'Pattern to search for'
                },
                logSource: {
                    type: 'string',
                    description: 'Filter by log source'
                },
                field: {
                    type: 'string',
                    description: 'Field to search in'
                },
                timeRange: {
                    type: 'string',
                    enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'],
                    default: '24h'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (1-100)',
                    default: 20,
                    minimum: 1,
                    maximum: 100
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            },
            required: ['pattern']
        }
    },
    {
        name: 'oci_logan_correlation_analysis',
        description: 'Perform correlation analysis across log fields',
        annotations: { ...READ_ONLY, title: 'Correlation Analysis' },
        inputSchema: {
            type: 'object',
            properties: {
                correlationType: {
                    type: 'string',
                    description: 'Type of correlation analysis',
                    enum: ['temporal', 'entity', 'transaction', 'session', 'custom']
                },
                primaryField: {
                    type: 'string',
                    description: 'Primary field for correlation'
                },
                secondaryFields: {
                    type: 'array',
                    description: 'Secondary fields to correlate (1-10 fields)',
                    items: { type: 'string' }
                },
                timeWindow: {
                    type: 'string',
                    description: 'Time window for correlation (e.g., 5m, 1h, 1d)'
                },
                query: {
                    type: 'string',
                    description: 'Base query (optional)'
                },
                timeRange: {
                    type: 'string',
                    enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'],
                    default: '24h'
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            },
            required: ['correlationType', 'primaryField', 'secondaryFields']
        }
    },
    // Resource Management Tools
    {
        name: 'oci_logan_list_log_sources',
        description: 'List available log sources in OCI Logging Analytics',
        annotations: { ...READ_ONLY, title: 'List Log Sources' },
        inputSchema: {
            type: 'object',
            properties: {
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                displayName: {
                    type: 'string',
                    description: 'Filter by display name'
                },
                isSystem: {
                    type: 'boolean',
                    description: 'Filter by system sources'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (1-100)',
                    default: 20,
                    minimum: 1,
                    maximum: 100
                },
                offset: {
                    type: 'number',
                    description: 'Number of items to skip',
                    default: 0,
                    minimum: 0
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            }
        }
    },
    {
        name: 'oci_logan_get_log_source_details',
        description: 'Get detailed information about a specific log source',
        annotations: { ...READ_ONLY, title: 'Get Log Source Details' },
        inputSchema: {
            type: 'object',
            properties: {
                logSourceName: {
                    type: 'string',
                    description: 'Log source name'
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            },
            required: ['logSourceName']
        }
    },
    {
        name: 'oci_logan_list_active_log_sources',
        description: 'List log sources with recent activity',
        annotations: { ...READ_ONLY, title: 'List Active Log Sources' },
        inputSchema: {
            type: 'object',
            properties: {
                timeRange: {
                    type: 'string',
                    enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'],
                    default: '24h'
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (1-100)',
                    default: 20,
                    minimum: 1,
                    maximum: 100
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            }
        }
    },
    {
        name: 'oci_logan_list_log_fields',
        description: 'List available fields in log data',
        annotations: { ...READ_ONLY, title: 'List Log Fields' },
        inputSchema: {
            type: 'object',
            properties: {
                logSourceName: {
                    type: 'string',
                    description: 'Filter by log source'
                },
                fieldType: {
                    type: 'string',
                    description: 'Filter by field type'
                },
                isSystem: {
                    type: 'boolean',
                    description: 'Filter by system fields'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (1-100)',
                    default: 20,
                    minimum: 1,
                    maximum: 100
                },
                offset: {
                    type: 'number',
                    description: 'Number of items to skip',
                    default: 0,
                    minimum: 0
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            }
        }
    },
    {
        name: 'oci_logan_get_field_details',
        description: 'Get detailed information about a specific field',
        annotations: { ...READ_ONLY, title: 'Get Field Details' },
        inputSchema: {
            type: 'object',
            properties: {
                fieldName: {
                    type: 'string',
                    description: 'Field name'
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            },
            required: ['fieldName']
        }
    },
    {
        name: 'oci_logan_get_namespace_info',
        description: 'Get OCI Logging Analytics namespace information',
        annotations: { ...READ_ONLY, title: 'Get Namespace Info' },
        inputSchema: {
            type: 'object',
            properties: {
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            }
        }
    },
    {
        name: 'oci_logan_list_entities',
        description: 'List entities (hosts, databases, applications) in Logging Analytics',
        annotations: { ...READ_ONLY, title: 'List Entities' },
        inputSchema: {
            type: 'object',
            properties: {
                entityType: {
                    type: 'string',
                    description: 'Entity type filter',
                    enum: ['HOST', 'DATABASE', 'APPLICATION', 'WEBSERVER', 'CONTAINER', 'all'],
                    default: 'all'
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (1-100)',
                    default: 20,
                    minimum: 1,
                    maximum: 100
                },
                offset: {
                    type: 'number',
                    description: 'Number of items to skip',
                    default: 0,
                    minimum: 0
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            }
        }
    },
    {
        name: 'oci_logan_get_storage_usage',
        description: 'Get storage usage statistics for Logging Analytics',
        annotations: { ...READ_ONLY, title: 'Get Storage Usage' },
        inputSchema: {
            type: 'object',
            properties: {
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                timeRange: {
                    type: 'string',
                    enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'],
                    default: '24h'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            }
        }
    },
    {
        name: 'oci_logan_list_parsers',
        description: 'List available log parsers',
        annotations: { ...READ_ONLY, title: 'List Parsers' },
        inputSchema: {
            type: 'object',
            properties: {
                parserType: {
                    type: 'string',
                    description: 'Parser type filter',
                    enum: ['REGEX', 'XML', 'JSON', 'DELIMITED', 'all'],
                    default: 'all'
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (1-100)',
                    default: 20,
                    minimum: 1,
                    maximum: 100
                },
                offset: {
                    type: 'number',
                    description: 'Number of items to skip',
                    default: 0,
                    minimum: 0
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            }
        }
    },
    {
        name: 'oci_logan_list_labels',
        description: 'List available labels for log categorization',
        annotations: { ...READ_ONLY, title: 'List Labels' },
        inputSchema: {
            type: 'object',
            properties: {
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (1-100)',
                    default: 20,
                    minimum: 1,
                    maximum: 100
                },
                offset: {
                    type: 'number',
                    description: 'Number of items to skip',
                    default: 0,
                    minimum: 0
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            }
        }
    },
    {
        name: 'oci_logan_query_recent_uploads',
        description: 'Query recent log uploads and their status',
        annotations: { ...READ_ONLY, title: 'Query Recent Uploads' },
        inputSchema: {
            type: 'object',
            properties: {
                timeRange: {
                    type: 'string',
                    description: 'Time range for upload history',
                    enum: ['1h', '6h', '24h', '7d'],
                    default: '24h'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (1-100)',
                    default: 20,
                    minimum: 1,
                    maximum: 100
                },
                compartmentId: {
                    type: 'string',
                    description: 'OCI compartment OCID'
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    default: 'markdown'
                }
            }
        }
    }
];
/**
 * Get tool definitions formatted for MCP SDK
 */
export function getToolDefinitions() {
    return TOOL_DEFINITIONS.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        ...(tool.annotations && { annotations: tool.annotations })
    }));
}
/**
 * Map old tool names to new names for backward compatibility
 */
export const TOOL_NAME_MAPPING = {
    // Old name -> New name
    'execute_logan_query': 'oci_logan_execute_query',
    'search_security_events': 'oci_logan_search_security_events',
    'get_mitre_techniques': 'oci_logan_get_mitre_techniques',
    'analyze_ip_activity': 'oci_logan_analyze_ip_activity',
    'get_logan_queries': 'oci_logan_get_queries',
    'validate_query': 'oci_logan_validate_query',
    'get_documentation': 'oci_logan_get_documentation',
    'check_oci_connection': 'oci_logan_check_connection',
    'list_dashboards': 'oci_logan_list_dashboards',
    'get_dashboard': 'oci_logan_get_dashboard',
    'get_dashboard_tiles': 'oci_logan_get_dashboard_tiles',
    'create_dashboard': 'oci_logan_create_dashboard',
    'update_dashboard': 'oci_logan_update_dashboard',
    'create_saved_search': 'oci_logan_create_saved_search',
    'list_saved_searches': 'oci_logan_list_saved_searches',
    'export_dashboard': 'oci_logan_export_dashboard',
    'import_dashboard': 'oci_logan_import_dashboard',
    'execute_advanced_analytics': 'oci_logan_execute_advanced_analytics',
    'execute_statistical_analysis': 'oci_logan_execute_statistical_analysis',
    'execute_field_operations': 'oci_logan_execute_field_operations',
    'search_log_patterns': 'oci_logan_search_log_patterns',
    'correlation_analysis': 'oci_logan_correlation_analysis',
    'list_log_sources': 'oci_logan_list_log_sources',
    'get_log_source_details': 'oci_logan_get_log_source_details',
    'list_active_log_sources': 'oci_logan_list_active_log_sources',
    'list_log_fields': 'oci_logan_list_log_fields',
    'get_field_details': 'oci_logan_get_field_details',
    'get_namespace_info': 'oci_logan_get_namespace_info',
    'list_entities': 'oci_logan_list_entities',
    'get_storage_usage': 'oci_logan_get_storage_usage',
    'list_parsers': 'oci_logan_list_parsers',
    'list_labels': 'oci_logan_list_labels',
    'query_recent_uploads': 'oci_logan_query_recent_uploads'
};
/**
 * Normalize tool name (supports both old and new names)
 */
export function normalizeToolName(name) {
    return TOOL_NAME_MAPPING[name] || name;
}
