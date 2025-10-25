#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { LogAnalyticsClient } from './oci/LogAnalyticsClient.js';
import { QueryValidator } from './utils/QueryValidator.js';
import fs from 'fs';
import { QueryTransformer } from './utils/QueryTransformer.js';
import { DocumentationLookup } from './utils/DocumentationLookup.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Configuration constants
const DEFAULT_COMPARTMENT_ID = process.env.OCI_COMPARTMENT_ID;
const DEFAULT_REGION = process.env.OCI_REGION || 'us-ashburn-1';
const EXAMPLE_COMPARTMENT_ID = 'ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]';
class OCILoganMCPServer {
    server;
    logAnalyticsClient;
    queryValidator;
    queryTransformer;
    documentationLookup;
    constructor() {
        this.server = new Server({
            name: 'oci-logan-mcp-server',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.logAnalyticsClient = new LogAnalyticsClient();
        this.queryValidator = new QueryValidator();
        this.queryTransformer = new QueryTransformer();
        this.documentationLookup = new DocumentationLookup();
        this.setupToolHandlers();
        // Error handling
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'execute_logan_query',
                    description: 'Execute a Logan Security Dashboard query against OCI Logging Analytics with enhanced query language support',
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
                                description: 'OCI compartment ID (optional, uses default if not provided)'
                            },
                            environment: {
                                type: 'string',
                                description: 'Environment name for multi-tenant queries (optional)'
                            },
                            timeFilter: {
                                type: 'string',
                                description: 'Custom time filter using dateRelative() or toDate() functions (overrides timeRange if provided)',
                                examples: ['dateRelative(7day)', 'toDate(\'2024-01-01T00:00:00Z\')']
                            }
                        },
                        required: ['query']
                    }
                },
                {
                    name: 'search_security_events',
                    description: 'Search for security events using natural language or predefined patterns',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            searchTerm: {
                                type: 'string',
                                description: 'Natural language description or specific security event pattern'
                            },
                            eventType: {
                                type: 'string',
                                description: 'Type of security event (login, privilege_escalation, network_anomaly, etc.)',
                                enum: ['login', 'privilege_escalation', 'network_anomaly', 'data_exfiltration', 'malware', 'all']
                            },
                            timeRange: {
                                type: 'string',
                                description: 'Time range for the search',
                                default: '24h'
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of results to return',
                                default: 100
                            }
                        },
                        required: ['searchTerm']
                    }
                },
                {
                    name: 'get_mitre_techniques',
                    description: 'Search for MITRE ATT&CK techniques in the logs',
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
                                enum: ['initial_access', 'execution', 'persistence', 'privilege_escalation', 'defense_evasion', 'credential_access', 'discovery', 'lateral_movement', 'collection', 'command_and_control', 'exfiltration', 'impact', 'all']
                            },
                            timeRange: {
                                type: 'string',
                                description: 'Time range for the analysis (Sysmon data defaults to 30 days as per OCI Log Analytics)',
                                enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m'],
                                default: '30d'
                            }
                        }
                    }
                },
                {
                    name: 'analyze_ip_activity',
                    description: 'Analyze activity for specific IP addresses',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            ipAddress: {
                                type: 'string',
                                description: 'IP address to analyze'
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
                            }
                        },
                        required: ['ipAddress']
                    }
                },
                {
                    name: 'get_logan_queries',
                    description: 'Get predefined Logan Security Dashboard queries by category',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            category: {
                                type: 'string',
                                description: 'Query category',
                                enum: ['mitre-attack', 'security', 'network', 'authentication', 'privilege-escalation', 'advanced_analytics', 'statistical_analysis', 'compliance_monitoring', 'all']
                            },
                            queryName: {
                                type: 'string',
                                description: 'Specific query name (optional)'
                            }
                        }
                    }
                },
                {
                    name: 'validate_query',
                    description: 'Validate an OCI Logging Analytics query syntax',
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
                    name: 'get_documentation',
                    description: 'Get documentation and help for OCI Logging Analytics and Logan queries',
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
                    name: 'check_oci_connection',
                    description: 'Check OCI Logging Analytics connection and authentication',
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
                {
                    name: 'list_dashboards',
                    description: 'List OCI dashboards from the tenant',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            compartmentId: {
                                type: 'string',
                                description: 'OCI compartment OCID to list dashboards from (uses default if not provided)'
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
                                description: 'Maximum number of dashboards to return',
                                default: 50
                            }
                        }
                    }
                },
                {
                    name: 'get_dashboard',
                    description: 'Get details of a specific OCI dashboard',
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
                            }
                        },
                        required: ['dashboardId']
                    }
                },
                {
                    name: 'get_dashboard_tiles',
                    description: 'Get tiles/widgets from a specific OCI dashboard',
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
                                enum: ['all', 'query', 'visualization', 'metric', 'text']
                            }
                        },
                        required: ['dashboardId']
                    }
                },
                {
                    name: 'create_dashboard',
                    description: 'Create a new dashboard with queries and visualizations',
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
                                        description: 'Array of widget configurations',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                displayName: {
                                                    type: 'string',
                                                    description: 'Widget display name'
                                                },
                                                widgetType: {
                                                    type: 'string',
                                                    enum: ['LINE_CHART', 'BAR_CHART', 'PIE_CHART', 'TABLE', 'METRIC', 'TEXT'],
                                                    description: 'Type of visualization'
                                                },
                                                query: {
                                                    type: 'string',
                                                    description: 'Logan query for the widget'
                                                },
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
                    name: 'update_dashboard',
                    description: 'Update an existing dashboard',
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
                                items: {
                                    type: 'object'
                                }
                            },
                            removeWidgetIds: {
                                type: 'array',
                                description: 'IDs of widgets to remove',
                                items: {
                                    type: 'string'
                                }
                            }
                        },
                        required: ['dashboardId']
                    }
                },
                {
                    name: 'create_saved_search',
                    description: 'Create a saved search in Log Analytics',
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
                    name: 'list_saved_searches',
                    description: 'List saved searches from Log Analytics',
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
                                description: 'Maximum number of results',
                                default: 50
                            }
                        }
                    }
                },
                {
                    name: 'export_dashboard',
                    description: 'Export dashboard configuration as JSON',
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
                    name: 'import_dashboard',
                    description: 'Import dashboard from JSON configuration',
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
                {
                    name: 'execute_advanced_analytics',
                    description: 'Execute advanced analytics queries using OCI Log Analytics specialized commands',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            analyticsType: {
                                type: 'string',
                                description: 'Type of advanced analytics to perform',
                                enum: ['cluster', 'link', 'nlp', 'classify', 'outlier', 'sequence', 'geostats', 'timecluster']
                            },
                            baseQuery: {
                                type: 'string',
                                description: 'Base query to analyze (without analytics command)'
                            },
                            parameters: {
                                type: 'object',
                                description: 'Parameters specific to the analytics type',
                                properties: {
                                    groupBy: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        description: 'Fields to group by for clustering/linking'
                                    },
                                    threshold: {
                                        type: 'number',
                                        description: 'Threshold value for outlier detection'
                                    },
                                    maxClusters: {
                                        type: 'number',
                                        description: 'Maximum number of clusters to generate'
                                    },
                                    sequencePattern: {
                                        type: 'string',
                                        description: 'Pattern for sequence analysis'
                                    },
                                    geoFields: {
                                        type: 'object',
                                        properties: {
                                            latitude: { type: 'string' },
                                            longitude: { type: 'string' }
                                        },
                                        description: 'Geographic coordinate fields for geostats'
                                    }
                                }
                            },
                            timeRange: {
                                type: 'string',
                                description: 'Time range for analysis',
                                enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'],
                                default: '24h'
                            },
                            compartmentId: {
                                type: 'string',
                                description: 'OCI compartment ID (optional)'
                            }
                        },
                        required: ['analyticsType', 'baseQuery']
                    }
                },
                {
                    name: 'execute_statistical_analysis',
                    description: 'Execute statistical analysis using stats, timestats, and eventstats commands',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            statisticsType: {
                                type: 'string',
                                description: 'Type of statistical analysis',
                                enum: ['stats', 'timestats', 'eventstats', 'top', 'bottom', 'frequent', 'rare']
                            },
                            baseQuery: {
                                type: 'string',
                                description: 'Base query to analyze statistically'
                            },
                            aggregations: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        function: {
                                            type: 'string',
                                            enum: ['count', 'sum', 'avg', 'min', 'max', 'stdev', 'var', 'distinct_count']
                                        },
                                        field: {
                                            type: 'string',
                                            description: 'Field to aggregate (optional for count)'
                                        },
                                        alias: {
                                            type: 'string',
                                            description: 'Alias for the result field'
                                        }
                                    },
                                    required: ['function']
                                },
                                description: 'Statistical functions to apply'
                            },
                            groupBy: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Fields to group by'
                            },
                            timeInterval: {
                                type: 'string',
                                description: 'Time interval for timestats (e.g., "5m", "1h", "1d")',
                                examples: ['1m', '5m', '15m', '1h', '6h', '1d']
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of results for top/bottom/frequent/rare',
                                default: 10
                            },
                            timeRange: {
                                type: 'string',
                                description: 'Time range for analysis',
                                enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'],
                                default: '24h'
                            },
                            compartmentId: {
                                type: 'string',
                                description: 'OCI compartment ID (optional)'
                            }
                        },
                        required: ['statisticsType', 'baseQuery', 'aggregations']
                    }
                },
                {
                    name: 'execute_field_operations',
                    description: 'Execute field manipulation and transformation operations',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            operation: {
                                type: 'string',
                                description: 'Type of field operation',
                                enum: ['extract', 'eval', 'addfields', 'rename', 'fields', 'dedup', 'bucket']
                            },
                            baseQuery: {
                                type: 'string',
                                description: 'Base query to apply field operations to'
                            },
                            operationDetails: {
                                type: 'object',
                                description: 'Details specific to the operation type',
                                properties: {
                                    extractPattern: {
                                        type: 'string',
                                        description: 'Regex pattern for extract operation'
                                    },
                                    evalExpression: {
                                        type: 'string',
                                        description: 'Expression for eval operation (e.g., "newField = field1 + field2")'
                                    },
                                    fieldList: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        description: 'List of fields for fields/dedup operations'
                                    },
                                    renameMapping: {
                                        type: 'object',
                                        description: 'Field rename mappings (oldName -> newName)'
                                    },
                                    bucketField: {
                                        type: 'string',
                                        description: 'Field to bucket for bucket operation'
                                    },
                                    bucketRanges: {
                                        type: 'array',
                                        items: { type: 'number' },
                                        description: 'Bucket range values'
                                    },
                                    includeFields: {
                                        type: 'boolean',
                                        description: 'Include (true) or exclude (false) specified fields',
                                        default: true
                                    }
                                }
                            },
                            timeRange: {
                                type: 'string',
                                description: 'Time range for operation',
                                enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'],
                                default: '24h'
                            },
                            compartmentId: {
                                type: 'string',
                                description: 'OCI compartment ID (optional)'
                            }
                        },
                        required: ['operation', 'baseQuery', 'operationDetails']
                    }
                },
                {
                    name: 'search_log_patterns',
                    description: 'Search for specific log patterns using advanced filtering and regex capabilities',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            logSource: {
                                type: 'string',
                                description: 'Specific log source to search in (e.g., "Windows Sysmon Events", "OCI Audit Logs")'
                            },
                            pattern: {
                                type: 'string',
                                description: 'Search pattern or regex to find'
                            },
                            patternType: {
                                type: 'string',
                                description: 'Type of pattern search',
                                enum: ['wildcard', 'regex', 'exact', 'contains']
                            },
                            fields: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Specific fields to search within'
                            },
                            filterCriteria: {
                                type: 'object',
                                description: 'Additional filter criteria',
                                properties: {
                                    severity: {
                                        type: 'array',
                                        items: {
                                            type: 'string',
                                            enum: ['fatal', 'error', 'warning', 'info', 'debug', 'trace']
                                        },
                                        description: 'Log severity levels to include'
                                    },
                                    hostNames: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        description: 'Specific hosts to search'
                                    },
                                    ipAddresses: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        description: 'IP addresses to filter by'
                                    },
                                    excludePatterns: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        description: 'Patterns to exclude from results'
                                    }
                                }
                            },
                            timeRange: {
                                type: 'string',
                                description: 'Time range for search',
                                enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'],
                                default: '24h'
                            },
                            maxResults: {
                                type: 'number',
                                description: 'Maximum number of results to return',
                                default: 100
                            },
                            compartmentId: {
                                type: 'string',
                                description: 'OCI compartment ID (optional)'
                            }
                        },
                        required: ['pattern']
                    }
                },
                {
                    name: 'correlation_analysis',
                    description: 'Perform log correlation analysis to find related events across different log sources',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            correlationType: {
                                type: 'string',
                                description: 'Type of correlation analysis',
                                enum: ['temporal', 'entity_based', 'transaction_link', 'sequence_analysis']
                            },
                            primaryQuery: {
                                type: 'string',
                                description: 'Primary query to correlate from'
                            },
                            correlationFields: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Fields to use for correlation (e.g., user_id, ip_address, session_id)'
                            },
                            timeWindow: {
                                type: 'string',
                                description: 'Time window for correlation (e.g., "5m", "1h")',
                                examples: ['30s', '1m', '5m', '15m', '1h', '2h']
                            },
                            secondaryLogSources: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Additional log sources to correlate with'
                            },
                            threshold: {
                                type: 'number',
                                description: 'Minimum correlation score threshold (0.0-1.0)',
                                minimum: 0.0,
                                maximum: 1.0,
                                default: 0.7
                            },
                            timeRange: {
                                type: 'string',
                                description: 'Overall time range for analysis',
                                enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m'],
                                default: '24h'
                            },
                            compartmentId: {
                                type: 'string',
                                description: 'OCI compartment ID (optional)'
                            }
                        },
                        required: ['correlationType', 'primaryQuery', 'correlationFields']
                    }
                },
                {
                    name: 'list_log_sources',
                    description: 'List available log sources in OCI Logging Analytics',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            compartmentId: {
                                type: 'string',
                                description: 'OCI compartment ID (uses default if not provided)'
                            },
                            sourceType: {
                                type: 'string',
                                description: 'Filter by source type',
                                enum: ['ENTITY', 'SYSTEM', 'USER_DEFINED', 'all']
                            },
                            displayName: {
                                type: 'string',
                                description: 'Filter by display name (partial match)'
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of sources to return',
                                default: 100
                            }
                        }
                    }
                },
                {
                    name: 'get_log_source_details',
                    description: 'Get detailed information about a specific log source',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            sourceName: {
                                type: 'string',
                                description: 'Name of the log source to query'
                            },
                            compartmentId: {
                                type: 'string',
                                description: 'OCI compartment ID (optional)'
                            }
                        },
                        required: ['sourceName']
                    }
                },
                {
                    name: 'list_active_log_sources',
                    description: 'List all log sources with their actual log counts. Shows which sources have data and how many logs each contains. Combines Management API (for complete source list) with Query API (for log counts).',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            compartmentId: {
                                type: 'string',
                                description: 'OCI compartment ID (uses default from environment if not provided)'
                            },
                            timePeriodMinutes: {
                                type: 'number',
                                description: 'Time period to count logs (in minutes)',
                                default: 60
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of sources to return',
                                default: 100
                            }
                        }
                    }
                },
                {
                    name: 'list_log_fields',
                    description: 'List available fields in OCI Logging Analytics',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            fieldType: {
                                type: 'string',
                                description: 'Filter by field type',
                                enum: ['FACET', 'DIMENSION', 'METRIC', 'TABLE_FIELD', 'all'],
                                default: 'all'
                            },
                            isSystem: {
                                type: 'boolean',
                                description: 'Filter system vs user-defined fields'
                            },
                            fieldName: {
                                type: 'string',
                                description: 'Search by field name (partial match)'
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of fields to return',
                                default: 100
                            }
                        }
                    }
                },
                {
                    name: 'get_field_details',
                    description: 'Get detailed information about a specific field including data type and cardinality',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            fieldName: {
                                type: 'string',
                                description: 'Name of the field to query'
                            }
                        },
                        required: ['fieldName']
                    }
                },
                {
                    name: 'get_namespace_info',
                    description: 'Get information about the OCI Logging Analytics namespace',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            includeStorageStats: {
                                type: 'boolean',
                                description: 'Include storage usage statistics',
                                default: true
                            }
                        }
                    }
                },
                {
                    name: 'list_entities',
                    description: 'List entities (hosts, services, applications) in OCI Logging Analytics',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            compartmentId: {
                                type: 'string',
                                description: 'OCI compartment ID (uses default if not provided)'
                            },
                            entityType: {
                                type: 'string',
                                description: 'Filter by entity type',
                                enum: ['HOST', 'DATABASE', 'APPLICATION', 'WEBSERVER', 'all'],
                                default: 'all'
                            },
                            cloudResourceId: {
                                type: 'string',
                                description: 'Filter by cloud resource ID'
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of entities to return',
                                default: 100
                            }
                        }
                    }
                },
                {
                    name: 'get_storage_usage',
                    description: 'Get storage usage statistics for OCI Logging Analytics',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            compartmentId: {
                                type: 'string',
                                description: 'OCI compartment ID (uses default if not provided)'
                            },
                            timeRange: {
                                type: 'string',
                                description: 'Time range for usage statistics',
                                enum: ['7d', '30d', '90d'],
                                default: '30d'
                            }
                        }
                    }
                },
                {
                    name: 'list_parsers',
                    description: 'List available log parsers in OCI Logging Analytics',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            parserType: {
                                type: 'string',
                                description: 'Filter by parser type',
                                enum: ['REGEX', 'XML', 'JSON', 'DELIMITED', 'all'],
                                default: 'all'
                            },
                            displayName: {
                                type: 'string',
                                description: 'Search by parser name (partial match)'
                            },
                            isSystem: {
                                type: 'boolean',
                                description: 'Filter system vs user-defined parsers'
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of parsers to return',
                                default: 100
                            }
                        }
                    }
                },
                {
                    name: 'list_labels',
                    description: 'List available labels in OCI Logging Analytics for log categorization',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            labelType: {
                                type: 'string',
                                description: 'Filter by label type',
                                enum: ['PRIORITY', 'PROBLEM', 'all'],
                                default: 'all'
                            },
                            displayName: {
                                type: 'string',
                                description: 'Search by label name (partial match)'
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of labels to return',
                                default: 100
                            }
                        }
                    }
                },
                {
                    name: 'query_recent_uploads',
                    description: 'Query recent log uploads and their status in OCI Logging Analytics',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            compartmentId: {
                                type: 'string',
                                description: 'OCI compartment ID (uses default if not provided)'
                            },
                            status: {
                                type: 'string',
                                description: 'Filter by upload status',
                                enum: ['IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'all'],
                                default: 'all'
                            },
                            timeRange: {
                                type: 'string',
                                description: 'Time range to check',
                                enum: ['1h', '6h', '24h', '7d'],
                                default: '24h'
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of uploads to return',
                                default: 50
                            }
                        }
                    }
                }
            ]
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            // Global debug logging for all tool calls
            try {
                fs.writeFileSync('/tmp/mcp-tool-debug.log', JSON.stringify({
                    timestamp: new Date().toISOString(),
                    toolName: name,
                    args: args
                }, null, 2) + '\n', { flag: 'a' });
            }
            catch (e) {
                console.error('Failed to write tool debug log:', e);
            }
            try {
                switch (name) {
                    case 'execute_logan_query':
                        return await this.executeLoganQuery(args);
                    case 'search_security_events':
                        return await this.searchSecurityEvents(args);
                    case 'get_mitre_techniques':
                        return await this.getMitreTechniques(args);
                    case 'analyze_ip_activity':
                        return await this.analyzeIPActivity(args);
                    case 'get_logan_queries':
                        return await this.getLoganQueries(args);
                    case 'validate_query':
                        return await this.validateQuery(args);
                    case 'get_documentation':
                        return await this.getDocumentation(args);
                    case 'check_oci_connection':
                        return await this.checkOCIConnection(args);
                    case 'list_dashboards':
                        return await this.listDashboards(args);
                    case 'get_dashboard':
                        return await this.getDashboard(args);
                    case 'get_dashboard_tiles':
                        return await this.getDashboardTiles(args);
                    case 'create_dashboard':
                        return await this.createDashboard(args);
                    case 'update_dashboard':
                        return await this.updateDashboard(args);
                    case 'create_saved_search':
                        return await this.createSavedSearch(args);
                    case 'list_saved_searches':
                        return await this.listSavedSearches(args);
                    case 'export_dashboard':
                        return await this.exportDashboard(args);
                    case 'import_dashboard':
                        return await this.importDashboard(args);
                    case 'execute_advanced_analytics':
                        return await this.executeAdvancedAnalytics(args);
                    case 'execute_statistical_analysis':
                        return await this.executeStatisticalAnalysis(args);
                    case 'execute_field_operations':
                        return await this.executeFieldOperations(args);
                    case 'search_log_patterns':
                        return await this.searchLogPatterns(args);
                    case 'correlation_analysis':
                        return await this.correlationAnalysis(args);
                    case 'list_log_sources':
                        return await this.listLogSources(args);
                    case 'get_log_source_details':
                        return await this.getLogSourceDetails(args);
                    case 'list_active_log_sources':
                        return await this.listActiveLogSources(args);
                    case 'list_log_fields':
                        return await this.listLogFields(args);
                    case 'get_field_details':
                        return await this.getFieldDetails(args);
                    case 'get_namespace_info':
                        return await this.getNamespaceInfo(args);
                    case 'list_entities':
                        return await this.listEntities(args);
                    case 'get_storage_usage':
                        return await this.getStorageUsage(args);
                    case 'list_parsers':
                        return await this.listParsers(args);
                    case 'list_labels':
                        return await this.listLabels(args);
                    case 'query_recent_uploads':
                        return await this.queryRecentUploads(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ]
                };
            }
        });
    }
    parseTimeRange(timeRange) {
        const timeMap = {
            '1h': 60,
            '6h': 360,
            '12h': 720,
            '24h': 1440,
            '1d': 1440,
            '7d': 10080,
            '30d': 43200,
            '1w': 10080,
            '1m': 43200,
            '90d': 129600
        };
        return timeMap[timeRange] || 1440; // Default to 24 hours
    }
    buildTimeFilter(timeRange) {
        // Build time filter for OCI Logging Analytics queries
        // This adds the proper time filtering syntax to queries
        const now = new Date();
        const timeRangeValue = this.parseTimeRange(timeRange);
        const startTime = new Date(now.getTime() - (timeRangeValue * 60 * 1000));
        // Use OCI Logging Analytics time filter syntax
        // Format: and Time >= 'YYYY-MM-DDTHH:mm:ss.sssZ'
        const startTimeISO = startTime.toISOString();
        const endTimeISO = now.toISOString();
        return `and Time >= '${startTimeISO}' and Time <= '${endTimeISO}'`;
    }
    async executeLoganQuery(args) {
        const { query, queryName, timeRange = '24h', compartmentId: providedCompartmentId, environment } = args;
        // Debug logging
        console.error('MCP DEBUG: executeLoganQuery called with:', { query, timeRange, providedCompartmentId });
        // Write to debug file immediately
        try {
            fs.writeFileSync('/tmp/mcp-execute-debug.log', JSON.stringify({
                timestamp: new Date().toISOString(),
                method: 'executeLoganQuery',
                args: { query, queryName, timeRange, compartmentId: providedCompartmentId, environment }
            }, null, 2) + '\n', { flag: 'a' });
        }
        catch (e) {
            console.error('Failed to write execute debug log:', e);
        }
        // Handle compartment selection - use provided or default from environment
        const compartmentId = providedCompartmentId || DEFAULT_COMPARTMENT_ID;
        // Log which compartment we're using
        console.error('MCP DEBUG: Using compartment:', compartmentId, 'from', providedCompartmentId ? 'user' : 'environment');
        try {
            // Skip validation for debugging
            console.error('MCP DEBUG: Skipping validation for debugging...');
            console.error('MCP DEBUG: Using compartment:', compartmentId);
            // Execute query
            console.error('MCP DEBUG: About to call executeQuery on logAnalyticsClient');
            const results = await this.logAnalyticsClient.executeQuery({
                query,
                timeRange,
                compartmentId,
                environment
            });
            console.error('MCP DEBUG: executeQuery returned:', { success: results.success, totalCount: results.totalCount });
            // Ensure we only return real data from OCI - never mock data
            if (!results.success) {
                throw new Error(`Query failed: ${results.error || 'Unknown error from OCI Logging Analytics'}`);
            }
            // Calculate actual time period for accurate display
            const timeRangeMinutes = this.parseTimeRange(timeRange);
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - (timeRangeMinutes * 60 * 1000));
            const actualDays = Math.round(timeRangeMinutes / 60 / 24);
            // Determine appropriate time description
            let timeDescription;
            if (actualDays >= 30) {
                timeDescription = `Last ${actualDays} Days`;
            }
            else if (actualDays >= 7) {
                timeDescription = `Last ${actualDays} Days`;
            }
            else if (actualDays >= 1) {
                timeDescription = actualDays === 1 ? 'Last 24 Hours' : `Last ${actualDays} Days`;
            }
            else {
                const hours = Math.round(timeRangeMinutes / 60);
                timeDescription = `Last ${hours} Hours`;
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ **Real OCI Data Retrieved Successfully**\\n\\n**Query:** ${queryName || 'Custom Query'}\\n**Data Period:** ${timeDescription} (${startTime.toISOString().split('T')[0]} to ${endTime.toISOString().split('T')[0]})\\n**Time Range Requested:** ${timeRange}\\n**Compartment:** ${compartmentId}\\n**Total Records:** ${results.totalCount}\\n**Execution Time:** ${results.executionTime}ms\\n\\n**Live OCI Log Results (First 5 records):**\\n\`\`\`json\\n${JSON.stringify(results.data.slice(0, 5), null, 2)}\\n\`\`\`\\n\\n*Note: This data spans ${timeDescription.toLowerCase()} from Oracle Cloud Infrastructure Logging Analytics - no mock or sample data is used.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to execute query: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async searchSecurityEvents(args) {
        const { searchTerm, eventType = 'all', timeRange = '24h', limit = 100 } = args;
        try {
            // Use the internal security analyzer for searching
            const timeRangeMinutes = this.parseTimeRange(timeRange);
            // Calculate actual time period for accurate display
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - (timeRangeMinutes * 60 * 1000));
            const actualDays = Math.round(timeRangeMinutes / 60 / 24);
            // Determine appropriate time description
            let timeDescription;
            if (actualDays >= 30) {
                timeDescription = `Last ${actualDays} Days`;
            }
            else if (actualDays >= 7) {
                timeDescription = `Last ${actualDays} Days`;
            }
            else if (actualDays >= 1) {
                timeDescription = actualDays === 1 ? 'Last 24 Hours' : `Last ${actualDays} Days`;
            }
            else {
                const hours = Math.round(timeRangeMinutes / 60);
                timeDescription = `Last ${hours} Hours`;
            }
            // Call the security analyzer directly via spawn
            const { spawn } = await import('child_process');
            const path = await import('path');
            const __dirname = path.dirname(new URL(import.meta.url).pathname);
            const pythonScriptPath = path.resolve(__dirname, '../python/security_analyzer.py');
            const pythonArgs = [
                pythonScriptPath,
                'search',
                '--query', searchTerm,
                '--time-period', timeRangeMinutes.toString()
            ];
            return new Promise((resolve, reject) => {
                const pythonProcess = spawn('python3', pythonArgs, {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    cwd: path.resolve(__dirname, '../python')
                });
                let stdout = '';
                let stderr = '';
                pythonProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
                pythonProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                pythonProcess.on('close', (code) => {
                    if (code === 0) {
                        try {
                            const result = JSON.parse(stdout);
                            const events = result.results || [];
                            // Ensure we only return real security events from OCI
                            if (events.length === 0) {
                                resolve({
                                    content: [
                                        {
                                            type: 'text',
                                            text: `🔍 **Real OCI Security Analysis Complete**\\n\\n**Search Term:** ${searchTerm}\\n**Event Type:** ${eventType}\\n**Data Period:** ${timeDescription} (${startTime.toISOString().split('T')[0]} to ${endTime.toISOString().split('T')[0]})\\n**Results:** No security events found matching criteria\\n\\n*This search was performed against ${timeDescription.toLowerCase()} of live OCI Logging Analytics data - no mock events are ever returned.*`
                                        }
                                    ]
                                });
                            }
                            else {
                                resolve({
                                    content: [
                                        {
                                            type: 'text',
                                            text: `🔍 **Real OCI Security Events Found**\\n\\n**Search Term:** ${searchTerm}\\n**Event Type:** ${eventType}\\n**Data Period:** ${timeDescription} (${startTime.toISOString().split('T')[0]} to ${endTime.toISOString().split('T')[0]})\\n**Results:** ${events.length} security events found\\n\\n**Live Security Events (Top 10):**\\n\`\`\`json\\n${JSON.stringify(events.slice(0, 10), null, 2)}\\n\`\`\`\\n\\n*Note: These are real security events from ${timeDescription.toLowerCase()} of Oracle Cloud Infrastructure data - no mock or sample data is used.*`
                                        }
                                    ]
                                });
                            }
                        }
                        catch (parseError) {
                            reject(new Error(`Failed to parse security analyzer response: ${parseError}`));
                        }
                    }
                    else {
                        reject(new Error(`Security analyzer failed with code ${code}: ${stderr}`));
                    }
                });
            });
        }
        catch (error) {
            throw new Error(`Failed to search security events: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getMitreTechniques(args) {
        // Default to 30 days for Sysmon data as shown in Log Analytics
        const { techniqueId, category = 'all', timeRange = '30d' } = args;
        try {
            let query;
            // Build time filter for the query based on the specified time range
            const timeFilter = this.buildTimeFilter(timeRange);
            if (techniqueId && techniqueId !== 'all') {
                // Use the corrected syntax from the Log Explorer screenshot with time filtering
                query = `'Log Source' = 'Windows Sysmon Events' and Technique_id != ${techniqueId} ${timeFilter} | fields Technique_id, 'Destination IP', 'Source IP' | timestats count as logrecords by 'Log Source'`;
            }
            else if (category !== 'all') {
                const categoryQueries = await this.queryTransformer.getMitreCategoryQuery(category);
                query = categoryQueries;
            }
            else {
                // Updated general query using the corrected field syntax with time filtering
                query = `'Log Source' = 'Windows Sysmon Events' and Technique_id != '' ${timeFilter} | fields Technique_id, 'Destination IP', 'Source IP' | timestats count as logrecords by 'Log Source'`;
            }
            const results = await this.logAnalyticsClient.executeQuery({
                query,
                timeRange
            });
            // Ensure we only return real MITRE technique data from OCI
            if (!results.success) {
                throw new Error(`MITRE technique analysis failed: ${results.error || 'Unknown error from OCI'}`);
            }
            // Calculate actual time period for display
            const timeRangeMinutes = this.parseTimeRange(timeRange);
            const startTime = new Date(Date.now() - (timeRangeMinutes * 60 * 1000));
            const endTime = new Date();
            return {
                content: [
                    {
                        type: 'text',
                        text: `🎯 **Real OCI MITRE ATT&CK Analysis**\\n\\n**Technique:** ${techniqueId || 'All'}\\n**Category:** ${category}\\n**Time Range:** ${timeRange} (${startTime.toISOString()} to ${endTime.toISOString()})\\n**Data Period:** Last ${timeRangeMinutes} minutes (${Math.round(timeRangeMinutes / 60 / 24)} days)\\n**Techniques Found:** ${results.totalCount}\\n**Execution Time:** ${results.executionTime}ms\\n\\n**Live MITRE Technique Results:**\\n\`\`\`json\\n${JSON.stringify(results.data, null, 2)}\\n\`\`\`\\n\\n*Note: This MITRE ATT&CK analysis uses real Sysmon data from OCI Logging Analytics over the specified ${timeRange} period - no mock techniques are ever shown.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to get MITRE techniques: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async analyzeIPActivity(args) {
        const { ipAddress, analysisType = 'full', timeRange = '24h' } = args;
        try {
            // Calculate actual time period for accurate display
            const timeRangeMinutes = this.parseTimeRange(timeRange);
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - (timeRangeMinutes * 60 * 1000));
            const actualDays = Math.round(timeRangeMinutes / 60 / 24);
            // Determine appropriate time description
            let timeDescription;
            if (actualDays >= 30) {
                timeDescription = `Last ${actualDays} Days`;
            }
            else if (actualDays >= 7) {
                timeDescription = `Last ${actualDays} Days`;
            }
            else if (actualDays >= 1) {
                timeDescription = actualDays === 1 ? 'Last 24 Hours' : `Last ${actualDays} Days`;
            }
            else {
                const hours = Math.round(timeRangeMinutes / 60);
                timeDescription = `Last ${hours} Hours`;
            }
            const queries = await this.queryTransformer.getIPAnalysisQueries(ipAddress, analysisType);
            const results = [];
            for (const queryConfig of queries) {
                const queryResult = await this.logAnalyticsClient.executeQuery({
                    query: queryConfig.query,
                    timeRange
                });
                results.push({
                    type: queryConfig.type,
                    description: queryConfig.description,
                    count: queryResult.totalCount,
                    data: queryResult.data.slice(0, 10) // Limit to top 10 for readability
                });
            }
            // Ensure all results are from real OCI data
            const totalEvents = results.reduce((sum, result) => sum + result.count, 0);
            return {
                content: [
                    {
                        type: 'text',
                        text: `🌐 **Real OCI IP Activity Analysis**\\n\\n**IP Address:** ${ipAddress}\\n**Analysis Type:** ${analysisType}\\n**Data Period:** ${timeDescription} (${startTime.toISOString().split('T')[0]} to ${endTime.toISOString().split('T')[0]})\\n**Time Range Requested:** ${timeRange}\\n**Total Events:** ${totalEvents}\\n\\n**Live IP Activity Results:**\\n\`\`\`json\\n${JSON.stringify(results, null, 2)}\\n\`\`\`\\n\\n*Note: This IP analysis uses real network data from ${timeDescription.toLowerCase()} of OCI Logging Analytics - no mock activity is ever shown.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to analyze IP activity: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getLoganQueries(args) {
        const { category, queryName } = args;
        try {
            const queries = await this.queryTransformer.getLoganQueries(category, queryName);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Logan Security Dashboard Queries\\n\\n**Category:** ${category || 'All'}\\n**Query Name:** ${queryName || 'All'}\\n\\n**Available Queries:**\\n\`\`\`json\\n${JSON.stringify(queries, null, 2)}\\n\`\`\``
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to get Logan queries: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async validateQuery(args) {
        const { query, fix = false } = args;
        try {
            const validation = await this.queryValidator.validate(query);
            let result = `Query Validation Results\\n\\n**Valid:** ${validation.isValid}\\n`;
            if (!validation.isValid) {
                result += `**Errors:**\\n${validation.errors.map(e => `- ${e}`).join('\\n')}\\n\\n`;
                if (fix) {
                    const fixedQuery = await this.queryValidator.attemptFix(query);
                    if (fixedQuery) {
                        result += `**Suggested Fix:**\\n\`${fixedQuery}\`\\n`;
                    }
                }
            }
            else {
                result += '**Status:** Query syntax is valid\\n';
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: result
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to validate query: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getDocumentation(args) {
        const { topic, searchTerm } = args;
        try {
            const documentation = await this.documentationLookup.getDocumentation(topic, searchTerm);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Documentation: ${topic || 'Search Results'}\\n\\n${documentation}`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to get documentation: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async checkOCIConnection(args) {
        const { testQuery = true } = args;
        try {
            const connectionStatus = await this.logAnalyticsClient.checkConnection(testQuery);
            return {
                content: [
                    {
                        type: 'text',
                        text: `OCI Connection Status\\n\\n**Status:** ${connectionStatus.connected ? 'Connected' : 'Disconnected'}\\n**Authentication:** ${connectionStatus.authMethod}\\n**Region:** ${connectionStatus.region}\\n**Compartment:** ${connectionStatus.compartmentId}\\n\\n${connectionStatus.details}`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to check OCI connection: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async listDashboards(args) {
        const { compartmentId: providedCompartmentId, displayName, lifecycleState = 'ACTIVE', limit = 50 } = args;
        // Handle compartment selection with same default as queries
        const compartmentId = providedCompartmentId || '${EXAMPLE_COMPARTMENT_ID}';
        if (!providedCompartmentId) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❓ **Compartment Selection Required for Dashboards**

**Please specify which OCI compartment to list dashboards from.**

**Usage Example:**
\`\`\`json
{
  "compartmentId": "${EXAMPLE_COMPARTMENT_ID}",
  "lifecycleState": "ACTIVE",
  "limit": 50
}
\`\`\`

**Default Compartment Available:**
- Production Environment: \`${EXAMPLE_COMPARTMENT_ID}\`

*Different compartments may have different dashboards configured.*`
                    }
                ]
            };
        }
        try {
            const dashboards = await this.logAnalyticsClient.listDashboards({
                compartmentId,
                displayName,
                lifecycleState,
                limit
            });
            if (!dashboards.success) {
                throw new Error(`Failed to list dashboards: ${dashboards.error}`);
            }
            const dashboardCount = dashboards.data.length;
            const dashboardList = dashboards.data.map((dashboard) => ({
                id: dashboard.id,
                displayName: dashboard.displayName,
                description: dashboard.description,
                lifecycleState: dashboard.lifecycleState,
                timeCreated: dashboard.timeCreated,
                timeUpdated: dashboard.timeUpdated,
                createdBy: dashboard.createdBy,
                updatedBy: dashboard.updatedBy,
                dashboardGroupId: dashboard.dashboardGroupId,
                isOobDashboard: dashboard.isOobDashboard,
                isShowInDashboardGroup: dashboard.isShowInDashboardGroup,
                metadataVersion: dashboard.metadataVersion,
                screenImage: dashboard.screenImage ? 'Available' : 'Not available',
                nls: dashboard.nls,
                type: dashboard.type,
                featuresConfig: dashboard.featuresConfig
            }));
            return {
                content: [
                    {
                        type: 'text',
                        text: `📊 **OCI Dashboards Retrieved Successfully**

**Compartment:** ${compartmentId}
**Filter:** ${displayName || 'None'}
**Lifecycle State:** ${lifecycleState}
**Total Dashboards:** ${dashboardCount}

**Dashboard List:**
\`\`\`json
${JSON.stringify(dashboardList, null, 2)}
\`\`\`

*Note: These are real dashboards from your OCI tenant. Use get_dashboard to retrieve full details.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to list dashboards: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getDashboard(args) {
        const { dashboardId, compartmentId } = args;
        if (!dashboardId) {
            throw new Error('Dashboard ID is required');
        }
        try {
            const dashboard = await this.logAnalyticsClient.getDashboard({
                dashboardId,
                compartmentId
            });
            if (!dashboard.success) {
                throw new Error(`Failed to get dashboard: ${dashboard.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `📊 **Dashboard Details Retrieved Successfully**

**Dashboard ID:** ${dashboardId}
**Display Name:** ${dashboard.data.displayName}
**Description:** ${dashboard.data.description || 'No description'}
**Lifecycle State:** ${dashboard.data.lifecycleState}
**Created:** ${dashboard.data.timeCreated}
**Updated:** ${dashboard.data.timeUpdated}
**Type:** ${dashboard.data.type || 'Standard'}

**Configuration:**
\`\`\`json
${JSON.stringify(dashboard.data.config || {}, null, 2)}
\`\`\`

**Widgets/Tiles Count:** ${dashboard.data.widgets?.length || 0}

*Use get_dashboard_tiles to retrieve detailed widget information.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to get dashboard: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getDashboardTiles(args) {
        const { dashboardId, tileType = 'all' } = args;
        if (!dashboardId) {
            throw new Error('Dashboard ID is required');
        }
        try {
            const dashboard = await this.logAnalyticsClient.getDashboard({
                dashboardId
            });
            if (!dashboard.success) {
                throw new Error(`Failed to get dashboard: ${dashboard.error}`);
            }
            let tiles = dashboard.data.widgets || dashboard.data.tiles || [];
            // Filter by tile type if specified
            if (tileType !== 'all') {
                tiles = tiles.filter((tile) => tile.type?.toLowerCase() === tileType.toLowerCase() ||
                    tile.widgetType?.toLowerCase() === tileType.toLowerCase());
            }
            const tilesSummary = tiles.map((tile) => ({
                id: tile.id,
                displayName: tile.displayName || tile.title,
                type: tile.type || tile.widgetType,
                query: tile.query || tile.savedSearchId,
                visualization: tile.visualization || tile.visualizationType,
                position: {
                    row: tile.row,
                    column: tile.column,
                    height: tile.height,
                    width: tile.width
                },
                dataConfig: tile.dataConfig,
                viewConfig: tile.viewConfig
            }));
            return {
                content: [
                    {
                        type: 'text',
                        text: `📊 **Dashboard Tiles/Widgets Retrieved**

**Dashboard:** ${dashboard.data.displayName}
**Total Tiles:** ${tiles.length}
**Filter Type:** ${tileType}

**Tiles Configuration:**
\`\`\`json
${JSON.stringify(tilesSummary, null, 2)}
\`\`\`

*Each tile represents a visualization or query widget on the dashboard.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to get dashboard tiles: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async createDashboard(args) {
        const { displayName, description = '', compartmentId: providedCompartmentId, dashboardConfig = {} } = args;
        const compartmentId = providedCompartmentId || '${EXAMPLE_COMPARTMENT_ID}';
        if (!displayName) {
            throw new Error('Display name is required for creating a dashboard');
        }
        try {
            const dashboard = await this.logAnalyticsClient.createDashboard({
                displayName,
                description,
                compartmentId,
                dashboardConfig
            });
            if (!dashboard.success) {
                throw new Error(`Failed to create dashboard: ${dashboard.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ **Dashboard Created Successfully**

**Dashboard ID:** ${dashboard.data.id}
**Display Name:** ${displayName}
**Description:** ${description || 'No description'}
**Compartment:** ${compartmentId}
**Widgets:** ${dashboardConfig.widgets?.length || 0}
**Status:** ${dashboard.data.lifecycleState || 'ACTIVE'}

*Use the dashboard ID to update or retrieve this dashboard.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to create dashboard: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async updateDashboard(args) {
        const { dashboardId, displayName, description, addWidgets = [], removeWidgetIds = [] } = args;
        if (!dashboardId) {
            throw new Error('Dashboard ID is required for updates');
        }
        try {
            const updates = {
                dashboardId,
                ...(displayName && { displayName }),
                ...(description !== undefined && { description }),
                ...(addWidgets.length > 0 && { addWidgets }),
                ...(removeWidgetIds.length > 0 && { removeWidgetIds })
            };
            const result = await this.logAnalyticsClient.updateDashboard(updates);
            if (!result.success) {
                throw new Error(`Failed to update dashboard: ${result.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ **Dashboard Updated Successfully**

**Dashboard ID:** ${dashboardId}
**Updates Applied:**
${displayName ? `- Display Name: ${displayName}` : ''}
${description !== undefined ? `- Description: ${description}` : ''}
${addWidgets.length > 0 ? `- Added ${addWidgets.length} widgets` : ''}
${removeWidgetIds.length > 0 ? `- Removed ${removeWidgetIds.length} widgets` : ''}

**Status:** ${result.data.lifecycleState || 'ACTIVE'}
**Last Updated:** ${result.data.timeUpdated || new Date().toISOString()}`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to update dashboard: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async createSavedSearch(args) {
        const { displayName, query, description = '', compartmentId: providedCompartmentId, widgetType = 'SEARCH' } = args;
        const compartmentId = providedCompartmentId || '${EXAMPLE_COMPARTMENT_ID}';
        if (!displayName || !query) {
            throw new Error('Display name and query are required for creating a saved search');
        }
        try {
            const savedSearch = await this.logAnalyticsClient.createSavedSearch({
                displayName,
                query,
                description,
                compartmentId,
                widgetType
            });
            if (!savedSearch.success) {
                throw new Error(`Failed to create saved search: ${savedSearch.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ **Saved Search Created Successfully**

**Search ID:** ${savedSearch.data.id}
**Display Name:** ${displayName}
**Query:** \`${query}\`
**Widget Type:** ${widgetType}
**Description:** ${description || 'No description'}
**Compartment:** ${compartmentId}

*This saved search can now be used in dashboards or executed directly.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to create saved search: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async listSavedSearches(args) {
        const { compartmentId: providedCompartmentId, displayName, limit = 50 } = args;
        const compartmentId = providedCompartmentId || '${EXAMPLE_COMPARTMENT_ID}';
        try {
            const searches = await this.logAnalyticsClient.listSavedSearches({
                compartmentId,
                displayName,
                limit
            });
            if (!searches.success) {
                throw new Error(`Failed to list saved searches: ${searches.error}`);
            }
            const searchList = searches.data.map((search) => ({
                id: search.id,
                displayName: search.displayName,
                query: search.query,
                widgetType: search.widgetType,
                timeCreated: search.timeCreated,
                timeUpdated: search.timeUpdated
            }));
            return {
                content: [
                    {
                        type: 'text',
                        text: `📊 **Saved Searches Retrieved**

**Compartment:** ${compartmentId}
**Filter:** ${displayName || 'None'}
**Total Searches:** ${searchList.length}

**Saved Searches:**
\`\`\`json
${JSON.stringify(searchList, null, 2)}
\`\`\`

*Use these saved searches to build dashboards or run queries.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to list saved searches: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async exportDashboard(args) {
        const { dashboardId, includeQueries = true } = args;
        if (!dashboardId) {
            throw new Error('Dashboard ID is required for export');
        }
        try {
            const dashboard = await this.logAnalyticsClient.getDashboard({ dashboardId });
            if (!dashboard.success) {
                throw new Error(`Failed to get dashboard: ${dashboard.error}`);
            }
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                dashboard: {
                    displayName: dashboard.data.displayName,
                    description: dashboard.data.description,
                    type: dashboard.data.type,
                    widgets: dashboard.data.widgets || [],
                    config: dashboard.data.config || {}
                }
            };
            if (includeQueries) {
                exportData.dashboard.widgets = exportData.dashboard.widgets.map((widget) => ({
                    ...widget,
                    query: widget.query || widget.savedSearchId
                }));
            }
            const exportJson = JSON.stringify(exportData, null, 2);
            return {
                content: [
                    {
                        type: 'text',
                        text: `📤 **Dashboard Exported Successfully**

**Dashboard:** ${dashboard.data.displayName}
**Export Version:** 1.0
**Include Queries:** ${includeQueries ? 'Yes' : 'No'}
**Widget Count:** ${exportData.dashboard.widgets.length}

**Exported Configuration:**
\`\`\`json
${exportJson}
\`\`\`

*Save this JSON to import the dashboard later or share with others.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to export dashboard: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async importDashboard(args) {
        const { dashboardJson, compartmentId: providedCompartmentId, newDisplayName } = args;
        const compartmentId = providedCompartmentId || '${EXAMPLE_COMPARTMENT_ID}';
        if (!dashboardJson) {
            throw new Error('Dashboard JSON is required for import');
        }
        try {
            const importData = JSON.parse(dashboardJson);
            if (!importData.dashboard) {
                throw new Error('Invalid dashboard JSON format');
            }
            const dashboardConfig = {
                displayName: newDisplayName || importData.dashboard.displayName,
                description: importData.dashboard.description,
                compartmentId,
                dashboardConfig: {
                    widgets: importData.dashboard.widgets || [],
                    config: importData.dashboard.config || {}
                }
            };
            const result = await this.logAnalyticsClient.createDashboard(dashboardConfig);
            if (!result.success) {
                throw new Error(`Failed to import dashboard: ${result.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `📥 **Dashboard Imported Successfully**

**New Dashboard ID:** ${result.data.id}
**Display Name:** ${dashboardConfig.displayName}
**Compartment:** ${compartmentId}
**Widgets Imported:** ${dashboardConfig.dashboardConfig.widgets.length}
**Status:** ${result.data.lifecycleState || 'ACTIVE'}

*The dashboard has been imported and is ready to use.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to import dashboard: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async executeAdvancedAnalytics(args) {
        const { analyticsType, baseQuery, parameters = {}, timeRange = '24h', compartmentId } = args;
        try {
            let analyticsQuery = baseQuery;
            // Add time filter if not already present
            if (!baseQuery.includes('Time >') && !baseQuery.includes('dateRelative')) {
                const timeFilter = this.buildTimeFilter(timeRange);
                analyticsQuery = `${baseQuery} ${timeFilter}`;
            }
            // Build the analytics command based on type
            let analyticsCommand = '';
            switch (analyticsType) {
                case 'cluster':
                    const groupByFields = parameters.groupBy ? parameters.groupBy.join(', ') : '*';
                    const maxClusters = parameters.maxClusters || 10;
                    analyticsCommand = `cluster maxclusters=${maxClusters} t=0.8 field=${groupByFields}`;
                    break;
                case 'link':
                    const linkFields = parameters.groupBy ? parameters.groupBy.join(', ') : 'Host';
                    analyticsCommand = `link ${linkFields}`;
                    break;
                case 'nlp':
                    analyticsCommand = 'nlp';
                    break;
                case 'classify':
                    analyticsCommand = 'classify';
                    break;
                case 'outlier':
                    const threshold = parameters.threshold || 2;
                    analyticsCommand = `outlier threshold=${threshold}`;
                    break;
                case 'sequence':
                    const pattern = parameters.sequencePattern || 'default';
                    analyticsCommand = `sequence ${pattern}`;
                    break;
                case 'geostats':
                    const geoFields = parameters.geoFields || { latitude: 'lat', longitude: 'lon' };
                    analyticsCommand = `geostats latfield=${geoFields.latitude} longfield=${geoFields.longitude}`;
                    break;
                case 'timecluster':
                    analyticsCommand = 'timecluster';
                    break;
                default:
                    throw new Error(`Unsupported analytics type: ${analyticsType}`);
            }
            const fullQuery = `${analyticsQuery} | ${analyticsCommand}`;
            const results = await this.logAnalyticsClient.executeQuery({
                query: fullQuery,
                timeRange,
                compartmentId
            });
            if (!results.success) {
                throw new Error(`Advanced analytics failed: ${results.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `🔬 **Advanced Analytics Results**

**Analytics Type:** ${analyticsType}
**Base Query:** ${baseQuery}
**Time Range:** ${timeRange}
**Parameters:** ${JSON.stringify(parameters, null, 2)}
**Results Found:** ${results.totalCount}
**Execution Time:** ${results.executionTime}ms

**Analytics Results:**
\`\`\`json
${JSON.stringify(results.data, null, 2)}
\`\`\`

*Advanced analytics performed using OCI Log Analytics ${analyticsType} capabilities.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to execute advanced analytics: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async executeStatisticalAnalysis(args) {
        const { statisticsType, baseQuery, aggregations, groupBy = [], timeInterval, limit = 10, timeRange = '24h', compartmentId } = args;
        try {
            let statisticsQuery = baseQuery;
            // Add time filter if not already present
            if (!baseQuery.includes('Time >') && !baseQuery.includes('dateRelative')) {
                const timeFilter = this.buildTimeFilter(timeRange);
                statisticsQuery = `${baseQuery} ${timeFilter}`;
            }
            // Build aggregation functions
            const aggFunctions = aggregations.map((agg) => {
                const func = agg.function;
                const field = agg.field ? ` ${agg.field}` : '';
                const alias = agg.alias ? ` as '${agg.alias}'` : '';
                return `${func}(${field})${alias}`;
            }).join(', ');
            // Build statistical command
            let statsCommand = '';
            switch (statisticsType) {
                case 'stats':
                    const groupByClause = groupBy.length > 0 ? ` by ${groupBy.map(f => `'${f}'`).join(', ')}` : '';
                    statsCommand = `stats ${aggFunctions}${groupByClause}`;
                    break;
                case 'timestats':
                    const interval = timeInterval || '1h';
                    const groupByTime = groupBy.length > 0 ? `, ${groupBy.map(f => `'${f}'`).join(', ')}` : '';
                    statsCommand = `timestats ${interval} ${aggFunctions}${groupByTime}`;
                    break;
                case 'eventstats':
                    const eventGroupBy = groupBy.length > 0 ? ` by ${groupBy.map(f => `'${f}'`).join(', ')}` : '';
                    statsCommand = `eventstats ${aggFunctions}${eventGroupBy}`;
                    break;
                case 'top':
                case 'bottom':
                case 'frequent':
                case 'rare':
                    const field = groupBy[0] || aggregations[0]?.field || 'Host';
                    statsCommand = `${statisticsType} ${limit} '${field}'`;
                    break;
                default:
                    throw new Error(`Unsupported statistics type: ${statisticsType}`);
            }
            const fullQuery = `${statisticsQuery} | ${statsCommand}`;
            const results = await this.logAnalyticsClient.executeQuery({
                query: fullQuery,
                timeRange,
                compartmentId
            });
            if (!results.success) {
                throw new Error(`Statistical analysis failed: ${results.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `📊 **Statistical Analysis Results**

**Statistics Type:** ${statisticsType}
**Base Query:** ${baseQuery}
**Aggregations:** ${JSON.stringify(aggregations, null, 2)}
**Group By:** ${groupBy.join(', ') || 'None'}
**Time Range:** ${timeRange}
**Results Found:** ${results.totalCount}
**Execution Time:** ${results.executionTime}ms

**Statistical Results:**
\`\`\`json
${JSON.stringify(results.data, null, 2)}
\`\`\`

*Statistical analysis performed using OCI Log Analytics ${statisticsType} command.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to execute statistical analysis: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async executeFieldOperations(args) {
        const { operation, baseQuery, operationDetails, timeRange = '24h', compartmentId } = args;
        try {
            let operationQuery = baseQuery;
            // Add time filter if not already present
            if (!baseQuery.includes('Time >') && !baseQuery.includes('dateRelative')) {
                const timeFilter = this.buildTimeFilter(timeRange);
                operationQuery = `${baseQuery} ${timeFilter}`;
            }
            // Build operation command
            let operationCommand = '';
            switch (operation) {
                case 'extract':
                    const pattern = operationDetails.extractPattern;
                    operationCommand = `extract ${pattern}`;
                    break;
                case 'eval':
                    const expression = operationDetails.evalExpression;
                    operationCommand = `eval ${expression}`;
                    break;
                case 'addfields':
                    const addExpression = operationDetails.evalExpression || 'newField = 1';
                    operationCommand = `addfields ${addExpression}`;
                    break;
                case 'rename':
                    const renameMapping = operationDetails.renameMapping || {};
                    const renamePairs = Object.entries(renameMapping).map(([old, new_]) => `'${old}' AS '${new_}'`).join(', ');
                    operationCommand = `rename ${renamePairs}`;
                    break;
                case 'fields':
                    const fieldList = operationDetails.fieldList || [];
                    const include = operationDetails.includeFields !== false;
                    const fieldsStr = fieldList.map(f => `'${f}'`).join(', ');
                    operationCommand = `fields ${include ? '' : '- '}${fieldsStr}`;
                    break;
                case 'dedup':
                    const dedupFields = operationDetails.fieldList || ['Host'];
                    const dedupStr = dedupFields.map(f => `'${f}'`).join(', ');
                    operationCommand = `dedup ${dedupStr}`;
                    break;
                case 'bucket':
                    const bucketField = operationDetails.bucketField || 'value';
                    const ranges = operationDetails.bucketRanges || [0, 10, 100, 1000];
                    operationCommand = `bucket '${bucketField}' [${ranges.join(', ')}]`;
                    break;
                default:
                    throw new Error(`Unsupported field operation: ${operation}`);
            }
            const fullQuery = `${operationQuery} | ${operationCommand}`;
            const results = await this.logAnalyticsClient.executeQuery({
                query: fullQuery,
                timeRange,
                compartmentId
            });
            if (!results.success) {
                throw new Error(`Field operation failed: ${results.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `🔧 **Field Operation Results**

**Operation:** ${operation}
**Base Query:** ${baseQuery}
**Operation Details:** ${JSON.stringify(operationDetails, null, 2)}
**Time Range:** ${timeRange}
**Results Found:** ${results.totalCount}
**Execution Time:** ${results.executionTime}ms

**Operation Results:**
\`\`\`json
${JSON.stringify(results.data, null, 2)}
\`\`\`

*Field operation performed using OCI Log Analytics ${operation} command.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to execute field operation: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async searchLogPatterns(args) {
        const { logSource, pattern, patternType = 'contains', fields = [], filterCriteria = {}, timeRange = '24h', maxResults = 100, compartmentId } = args;
        try {
            // Build base query with log source filter
            let query = '';
            if (logSource) {
                query = `'Log Source' = '${logSource}'`;
            }
            // Add pattern search based on type
            let patternClause = '';
            switch (patternType) {
                case 'wildcard':
                    patternClause = fields.length > 0
                        ? fields.map(f => `'${f}' LIKE '${pattern}'`).join(' OR ')
                        : `* LIKE '${pattern}'`;
                    break;
                case 'regex':
                    patternClause = fields.length > 0
                        ? fields.map(f => `'${f}' matches '${pattern}'`).join(' OR ')
                        : `* matches '${pattern}'`;
                    break;
                case 'exact':
                    patternClause = fields.length > 0
                        ? fields.map(f => `'${f}' = '${pattern}'`).join(' OR ')
                        : `* = '${pattern}'`;
                    break;
                case 'contains':
                    patternClause = fields.length > 0
                        ? fields.map(f => `'${f}' LIKE '%${pattern}%'`).join(' OR ')
                        : `* LIKE '%${pattern}%'`;
                    break;
                default:
                    patternClause = `* LIKE '%${pattern}%'`;
            }
            // Combine query parts
            if (query && patternClause) {
                query = `${query} AND (${patternClause})`;
            }
            else if (patternClause) {
                query = patternClause;
            }
            // Add filter criteria
            const filters = [];
            if (filterCriteria.severity && filterCriteria.severity.length > 0) {
                const severityFilter = filterCriteria.severity.map(s => `'${s}'`).join(', ');
                filters.push(`Severity IN (${severityFilter})`);
            }
            if (filterCriteria.hostNames && filterCriteria.hostNames.length > 0) {
                const hostFilter = filterCriteria.hostNames.map(h => `'${h}'`).join(', ');
                filters.push(`'Host Name' IN (${hostFilter})`);
            }
            if (filterCriteria.ipAddresses && filterCriteria.ipAddresses.length > 0) {
                const ipFilter = filterCriteria.ipAddresses.map(ip => `'${ip}'`).join(', ');
                filters.push(`('Source IP' IN (${ipFilter}) OR 'Destination IP' IN (${ipFilter}))`);
            }
            if (filters.length > 0) {
                query = `${query} AND ${filters.join(' AND ')}`;
            }
            // Add exclude patterns
            if (filterCriteria.excludePatterns && filterCriteria.excludePatterns.length > 0) {
                const excludeFilters = filterCriteria.excludePatterns.map(p => `NOT (* LIKE '%${p}%')`).join(' AND ');
                query = `${query} AND ${excludeFilters}`;
            }
            // Add time filter
            const timeFilter = this.buildTimeFilter(timeRange);
            query = `${query} ${timeFilter}`;
            // Add head limit
            const fullQuery = `${query} | head ${maxResults}`;
            const results = await this.logAnalyticsClient.executeQuery({
                query: fullQuery,
                timeRange,
                compartmentId
            });
            if (!results.success) {
                throw new Error(`Pattern search failed: ${results.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `🔍 **Log Pattern Search Results**

**Pattern:** ${pattern}
**Pattern Type:** ${patternType}
**Log Source:** ${logSource || 'All Sources'}
**Search Fields:** ${fields.join(', ') || 'All Fields'}
**Time Range:** ${timeRange}
**Max Results:** ${maxResults}
**Results Found:** ${results.totalCount}
**Execution Time:** ${results.executionTime}ms

**Pattern Matches:**
\`\`\`json
${JSON.stringify(results.data, null, 2)}
\`\`\`

*Pattern search performed using OCI Log Analytics with ${patternType} matching.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to search log patterns: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async correlationAnalysis(args) {
        const { correlationType, primaryQuery, correlationFields, timeWindow = '5m', secondaryLogSources = [], threshold = 0.7, timeRange = '24h', compartmentId } = args;
        try {
            let correlationQuery = primaryQuery;
            // Add time filter if not already present
            if (!primaryQuery.includes('Time >') && !primaryQuery.includes('dateRelative')) {
                const timeFilter = this.buildTimeFilter(timeRange);
                correlationQuery = `${primaryQuery} ${timeFilter}`;
            }
            // Build correlation command based on type
            let correlationCommand = '';
            const fieldsList = correlationFields.map(f => `'${f}'`).join(', ');
            switch (correlationType) {
                case 'temporal':
                    correlationCommand = `link maxspan=${timeWindow} ${fieldsList}`;
                    break;
                case 'entity_based':
                    correlationCommand = `cluster field=${fieldsList} t=${threshold}`;
                    break;
                case 'transaction_link':
                    correlationCommand = `link startswith="${primaryQuery}" endswith="*" ${fieldsList}`;
                    break;
                case 'sequence_analysis':
                    correlationCommand = `sequence ${fieldsList}`;
                    break;
                default:
                    // Default to basic linking
                    correlationCommand = `link ${fieldsList}`;
            }
            const fullQuery = `${correlationQuery} | ${correlationCommand}`;
            const results = await this.logAnalyticsClient.executeQuery({
                query: fullQuery,
                timeRange,
                compartmentId
            });
            if (!results.success) {
                throw new Error(`Correlation analysis failed: ${results.error}`);
            }
            // If secondary log sources are specified, perform additional correlation
            let secondaryResults = null;
            if (secondaryLogSources.length > 0) {
                const secondaryQueries = secondaryLogSources.map(source => `'Log Source' = '${source}' AND (${correlationFields.map(f => `'${f}' != ''`).join(' OR ')})`);
                for (const secQuery of secondaryQueries) {
                    const secTimeFilter = this.buildTimeFilter(timeRange);
                    const secFullQuery = `${secQuery} ${secTimeFilter} | ${correlationCommand}`;
                    const secResult = await this.logAnalyticsClient.executeQuery({
                        query: secFullQuery,
                        timeRange,
                        compartmentId
                    });
                    if (secResult.success) {
                        secondaryResults = secResult;
                        break;
                    }
                }
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `🔗 **Correlation Analysis Results**

**Correlation Type:** ${correlationType}
**Primary Query:** ${primaryQuery}
**Correlation Fields:** ${correlationFields.join(', ')}
**Time Window:** ${timeWindow}
**Threshold:** ${threshold}
**Time Range:** ${timeRange}
**Primary Results:** ${results.totalCount}
**Secondary Results:** ${secondaryResults?.totalCount || 'N/A'}
**Execution Time:** ${results.executionTime}ms

**Primary Correlation Results:**
\`\`\`json
${JSON.stringify(results.data, null, 2)}
\`\`\`

${secondaryResults ? `**Secondary Correlation Results:**
\`\`\`json
${JSON.stringify(secondaryResults.data, null, 2)}
\`\`\`` : ''}

*Correlation analysis performed using OCI Log Analytics ${correlationType} capabilities.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to execute correlation analysis: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async listLogSources(args) {
        const { compartmentId, sourceType = 'all', displayName, limit = 100 } = args;
        try {
            const results = await this.logAnalyticsClient.listLogSources({
                compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID,
                sourceType,
                displayName,
                limit
            });
            if (!results.success) {
                throw new Error(`Failed to list log sources: ${results.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `📚 **OCI Log Sources**

**Total Sources:** ${results.totalCount}
**Source Type Filter:** ${sourceType}
**Compartment:** ${compartmentId || DEFAULT_COMPARTMENT_ID}

**Available Log Sources:**
\`\`\`json
${JSON.stringify(results.data, null, 2)}
\`\`\`

*These are the log sources available in your OCI Logging Analytics workspace.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to list log sources: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getLogSourceDetails(args) {
        const { sourceName, compartmentId } = args;
        try {
            const results = await this.logAnalyticsClient.getLogSourceDetails({
                sourceName,
                compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID
            });
            if (!results.success) {
                throw new Error(`Failed to get log source details: ${results.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `📋 **Log Source Details: ${sourceName}**

\`\`\`json
${JSON.stringify(results.data, null, 2)}
\`\`\`

*Detailed information about the ${sourceName} log source.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to get log source details: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async listActiveLogSources(args) {
        const { compartmentId, timePeriodMinutes = 60, limit = 100 } = args;
        try {
            const results = await this.logAnalyticsClient.listActiveLogSources({
                compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID,
                timePeriodMinutes,
                limit
            });
            if (!results.success) {
                throw new Error(`Failed to list active log sources: ${results.error}`);
            }
            // Separate sources with data from those without
            const activeSources = results.data.filter((s) => s.has_data);
            const inactiveSources = results.data.filter((s) => !s.has_data);
            return {
                content: [
                    {
                        type: 'text',
                        text: `📊 **OCI Log Sources with Activity**

**Time Period:** Last ${timePeriodMinutes} minutes
**Total Sources:** ${results.totalCount}
**Active Sources (with data):** ${activeSources.length}
**Inactive Sources (no data):** ${inactiveSources.length}
**Compartment:** ${compartmentId || DEFAULT_COMPARTMENT_ID}

## Active Sources (Sorted by Log Count)
${activeSources.length > 0 ? activeSources.map((s) => `- **${s.display_name || s.name}**: ${s.log_count.toLocaleString()} logs
  - Type: ${s.source_type}${s.is_system ? ' (System)' : ' (User)'}
  - Description: ${s.description || 'N/A'}`).join('\n') : '*No active sources in this time period*'}

${inactiveSources.length > 0 ? `
## Inactive Sources (No Data in Time Period)
${inactiveSources.slice(0, 10).map((s) => `- ${s.display_name || s.name} (${s.source_type})`).join('\n')}
${inactiveSources.length > 10 ? `\n*...and ${inactiveSources.length - 10} more inactive sources*` : ''}
` : ''}

*Data combined from OCI Management API and Query API*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to list active log sources: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async listLogFields(args) {
        const { fieldType = 'all', isSystem, fieldName, limit = 100 } = args;
        try {
            const results = await this.logAnalyticsClient.listLogFields({
                fieldType,
                isSystem,
                fieldName,
                limit
            });
            if (!results.success) {
                throw new Error(`Failed to list log fields: ${results.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `🏷️ **OCI Log Analytics Fields**

**Total Fields:** ${results.totalCount}
**Field Type Filter:** ${fieldType}
**System Fields:** ${isSystem !== undefined ? (isSystem ? 'Yes' : 'No') : 'All'}

**Available Fields:**
\`\`\`json
${JSON.stringify(results.data.slice(0, 50), null, 2)}
\`\`\`

*These are the fields available for querying in OCI Logging Analytics.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to list log fields: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getFieldDetails(args) {
        const { fieldName } = args;
        try {
            const results = await this.logAnalyticsClient.getFieldDetails({
                fieldName
            });
            if (!results.success) {
                throw new Error(`Failed to get field details: ${results.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `📊 **Field Details: ${fieldName}**

\`\`\`json
${JSON.stringify(results.data, null, 2)}
\`\`\`

*Detailed information including data type, cardinality, and usage statistics.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to get field details: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getNamespaceInfo(args) {
        const { includeStorageStats = true } = args;
        try {
            const results = await this.logAnalyticsClient.getNamespaceInfo({
                includeStorageStats
            });
            if (!results.success) {
                throw new Error(`Failed to get namespace info: ${results.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `🌐 **OCI Logging Analytics Namespace**

**Namespace:** ${results.data[0]?.namespace || 'N/A'}
**Region:** ${results.data[0]?.region || 'N/A'}
**Status:** ${results.data[0]?.status || 'ACTIVE'}
${includeStorageStats ? `**Storage Used:** ${results.data[0]?.storageUsed || 'N/A'}\n**Storage Quota:** ${results.data[0]?.storageQuota || 'N/A'}` : ''}

\`\`\`json
${JSON.stringify(results.data, null, 2)}
\`\`\`

*Information about your OCI Logging Analytics workspace.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to get namespace info: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async listEntities(args) {
        const { compartmentId, entityType = 'all', cloudResourceId, limit = 100 } = args;
        try {
            const results = await this.logAnalyticsClient.listEntities({
                compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID,
                entityType,
                cloudResourceId,
                limit
            });
            if (!results.success) {
                throw new Error(`Failed to list entities: ${results.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `🖥️ **OCI Log Analytics Entities**

**Total Entities:** ${results.totalCount}
**Entity Type Filter:** ${entityType}
**Compartment:** ${compartmentId || DEFAULT_COMPARTMENT_ID}

**Available Entities:**
\`\`\`json
${JSON.stringify(results.data.slice(0, 20), null, 2)}
\`\`\`

*These are the monitored entities (hosts, databases, applications) in your environment.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to list entities: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getStorageUsage(args) {
        const { compartmentId, timeRange = '30d' } = args;
        try {
            const results = await this.logAnalyticsClient.getStorageUsage({
                compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID,
                timeRange
            });
            if (!results.success) {
                throw new Error(`Failed to get storage usage: ${results.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `💾 **OCI Logging Analytics Storage Usage**

**Time Range:** ${timeRange}
**Compartment:** ${compartmentId || DEFAULT_COMPARTMENT_ID}
**Total Storage:** ${results.data[0]?.totalStorage || 'N/A'}
**Active Storage:** ${results.data[0]?.activeStorage || 'N/A'}
**Archived Storage:** ${results.data[0]?.archivedStorage || 'N/A'}
**Growth Rate:** ${results.data[0]?.growthRate || 'N/A'}

\`\`\`json
${JSON.stringify(results.data, null, 2)}
\`\`\`

*Storage usage statistics for your OCI Logging Analytics workspace.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to get storage usage: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async listParsers(args) {
        const { parserType = 'all', displayName, isSystem, limit = 100 } = args;
        try {
            const results = await this.logAnalyticsClient.listParsers({
                parserType,
                displayName,
                isSystem,
                limit
            });
            if (!results.success) {
                throw new Error(`Failed to list parsers: ${results.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `⚙️ **OCI Log Parsers**

**Total Parsers:** ${results.totalCount}
**Parser Type Filter:** ${parserType}
**System Parsers:** ${isSystem !== undefined ? (isSystem ? 'Yes' : 'No') : 'All'}

**Available Parsers:**
\`\`\`json
${JSON.stringify(results.data.slice(0, 20), null, 2)}
\`\`\`

*These are the log parsers available for processing log data.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to list parsers: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async listLabels(args) {
        const { labelType = 'all', displayName, limit = 100 } = args;
        try {
            const results = await this.logAnalyticsClient.listLabels({
                labelType,
                displayName,
                limit
            });
            if (!results.success) {
                throw new Error(`Failed to list labels: ${results.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `🏷️ **OCI Log Analytics Labels**

**Total Labels:** ${results.totalCount}
**Label Type Filter:** ${labelType}

**Available Labels:**
\`\`\`json
${JSON.stringify(results.data, null, 2)}
\`\`\`

*Labels are used to categorize and organize log data.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to list labels: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async queryRecentUploads(args) {
        const { compartmentId, status = 'all', timeRange = '24h', limit = 50 } = args;
        try {
            const results = await this.logAnalyticsClient.queryRecentUploads({
                compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID,
                status,
                timeRange,
                limit
            });
            if (!results.success) {
                throw new Error(`Failed to query recent uploads: ${results.error}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `📤 **Recent Log Uploads**

**Time Range:** ${timeRange}
**Status Filter:** ${status}
**Total Uploads:** ${results.totalCount}
**Successful:** ${results.data.filter((u) => u.status === 'SUCCESSFUL').length}
**Failed:** ${results.data.filter((u) => u.status === 'FAILED').length}
**In Progress:** ${results.data.filter((u) => u.status === 'IN_PROGRESS').length}

**Recent Uploads:**
\`\`\`json
${JSON.stringify(results.data, null, 2)}
\`\`\`

*Status of recent log upload operations in OCI Logging Analytics.*`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to query recent uploads: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('OCI Logan MCP server running on stdio');
    }
}
const server = new OCILoganMCPServer();
server.run().catch(console.error);
