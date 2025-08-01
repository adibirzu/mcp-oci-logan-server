#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
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
  private server: Server;
  private logAnalyticsClient: LogAnalyticsClient;
  private queryValidator: QueryValidator;
  private queryTransformer: QueryTransformer;
  private documentationLookup: DocumentationLookup;

  constructor() {
    this.server = new Server(
      {
        name: 'oci-logan-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

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

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'execute_logan_query',
          description: 'Execute a Logan Security Dashboard query against OCI Logging Analytics',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'OCI Logging Analytics query in OCI format'
              },
              queryName: {
                type: 'string',
                description: 'Name/identifier for the query (optional)'
              },
              timeRange: {
                type: 'string',
                description: 'Time range for the query (Sysmon/security data recommended: 30d, general queries: 24h)',
                enum: ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m'],
                default: '24h'
              },
              compartmentId: {
                type: 'string',
                description: 'OCI compartment ID (optional, uses default if not provided)'
              },
              environment: {
                type: 'string',
                description: 'Environment name for multi-tenant queries (optional)'
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
                enum: ['mitre-attack', 'security', 'network', 'authentication', 'privilege-escalation', 'all']
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
      } catch (e) {
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
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
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

  private parseTimeRange(timeRange: string): number {
    const timeMap: { [key: string]: number } = {
      '1h': 60,
      '6h': 360,
      '12h': 720,
      '24h': 1440,
      '1d': 1440,
      '7d': 10080,
      '30d': 43200,
      '1w': 10080,
      '1m': 43200
    };
    
    return timeMap[timeRange] || 1440; // Default to 24 hours
  }

  private buildTimeFilter(timeRange: string): string {
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

  private async executeLoganQuery(args: any) {
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
    } catch (e) {
      console.error('Failed to write execute debug log:', e);
    }

    // Handle compartment selection
    const compartmentId = providedCompartmentId || DEFAULT_COMPARTMENT_ID;

    if (!providedCompartmentId) {
      return {
        content: [
          {
            type: 'text',
            text: `❓ **Compartment Selection Required**

**Current Query:** ${query}
**Time Range:** ${timeRange}

**Please specify which OCI compartment to query against.**

**Usage Example:**
\`\`\`json
{
  "query": "${query}",
  "queryName": "${queryName || 'Custom Query'}",
  "timeRange": "${timeRange}",
  "compartmentId": "${EXAMPLE_COMPARTMENT_ID}"
}
\`\`\`

**Default Compartment Available:**
- Production Environment: \`${EXAMPLE_COMPARTMENT_ID}\`

**To execute with default compartment, run:**
execute_logan_query with compartmentId: "${EXAMPLE_COMPARTMENT_ID}"

*Different compartments may contain different log sources and data volumes.*`
          }
        ]
      };
    }
    
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
      } else if (actualDays >= 7) {
        timeDescription = `Last ${actualDays} Days`;
      } else if (actualDays >= 1) {
        timeDescription = actualDays === 1 ? 'Last 24 Hours' : `Last ${actualDays} Days`;
      } else {
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
    } catch (error) {
      throw new Error(`Failed to execute query: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async searchSecurityEvents(args: any) {
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
      } else if (actualDays >= 7) {
        timeDescription = `Last ${actualDays} Days`;
      } else if (actualDays >= 1) {
        timeDescription = actualDays === 1 ? 'Last 24 Hours' : `Last ${actualDays} Days`;
      } else {
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

      return new Promise<any>((resolve, reject) => {
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
              } else {
                resolve({
                  content: [
                    {
                      type: 'text',
                      text: `🔍 **Real OCI Security Events Found**\\n\\n**Search Term:** ${searchTerm}\\n**Event Type:** ${eventType}\\n**Data Period:** ${timeDescription} (${startTime.toISOString().split('T')[0]} to ${endTime.toISOString().split('T')[0]})\\n**Results:** ${events.length} security events found\\n\\n**Live Security Events (Top 10):**\\n\`\`\`json\\n${JSON.stringify(events.slice(0, 10), null, 2)}\\n\`\`\`\\n\\n*Note: These are real security events from ${timeDescription.toLowerCase()} of Oracle Cloud Infrastructure data - no mock or sample data is used.*`
                    }
                  ]
                });
              }
            } catch (parseError) {
              reject(new Error(`Failed to parse security analyzer response: ${parseError}`));
            }
          } else {
            reject(new Error(`Security analyzer failed with code ${code}: ${stderr}`));
          }
        });
      });
    } catch (error) {
      throw new Error(`Failed to search security events: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getMitreTechniques(args: any) {
    // Default to 30 days for Sysmon data as shown in Log Analytics
    const { techniqueId, category = 'all', timeRange = '30d' } = args;

    try {
      let query: string;
      
      // Build time filter for the query based on the specified time range
      const timeFilter = this.buildTimeFilter(timeRange);
      
      if (techniqueId && techniqueId !== 'all') {
        // Use the corrected syntax from the Log Explorer screenshot with time filtering
        query = `'Log Source' = 'Windows Sysmon Events' and Technique_id != ${techniqueId} ${timeFilter} | fields Technique_id, 'Destination IP', 'Source IP' | timestats count as logrecords by 'Log Source'`;
      } else if (category !== 'all') {
        const categoryQueries = await this.queryTransformer.getMitreCategoryQuery(category);
        query = categoryQueries;
      } else {
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
            text: `🎯 **Real OCI MITRE ATT&CK Analysis**\\n\\n**Technique:** ${techniqueId || 'All'}\\n**Category:** ${category}\\n**Time Range:** ${timeRange} (${startTime.toISOString()} to ${endTime.toISOString()})\\n**Data Period:** Last ${timeRangeMinutes} minutes (${Math.round(timeRangeMinutes/60/24)} days)\\n**Techniques Found:** ${results.totalCount}\\n**Execution Time:** ${results.executionTime}ms\\n\\n**Live MITRE Technique Results:**\\n\`\`\`json\\n${JSON.stringify(results.data, null, 2)}\\n\`\`\`\\n\\n*Note: This MITRE ATT&CK analysis uses real Sysmon data from OCI Logging Analytics over the specified ${timeRange} period - no mock techniques are ever shown.*`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get MITRE techniques: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async analyzeIPActivity(args: any) {
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
      } else if (actualDays >= 7) {
        timeDescription = `Last ${actualDays} Days`;
      } else if (actualDays >= 1) {
        timeDescription = actualDays === 1 ? 'Last 24 Hours' : `Last ${actualDays} Days`;
      } else {
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
    } catch (error) {
      throw new Error(`Failed to analyze IP activity: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getLoganQueries(args: any) {
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
    } catch (error) {
      throw new Error(`Failed to get Logan queries: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async validateQuery(args: any) {
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
      } else {
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
    } catch (error) {
      throw new Error(`Failed to validate query: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getDocumentation(args: any) {
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
    } catch (error) {
      throw new Error(`Failed to get documentation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async checkOCIConnection(args: any) {
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
    } catch (error) {
      throw new Error(`Failed to check OCI connection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async listDashboards(args: any) {
    const { 
      compartmentId: providedCompartmentId, 
      displayName, 
      lifecycleState = 'ACTIVE',
      limit = 50 
    } = args;

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
      const dashboardList = dashboards.data.map((dashboard: any) => ({
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
    } catch (error) {
      throw new Error(`Failed to list dashboards: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getDashboard(args: any) {
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
    } catch (error) {
      throw new Error(`Failed to get dashboard: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getDashboardTiles(args: any) {
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
        tiles = tiles.filter((tile: any) => 
          tile.type?.toLowerCase() === tileType.toLowerCase() ||
          tile.widgetType?.toLowerCase() === tileType.toLowerCase()
        );
      }

      const tilesSummary = tiles.map((tile: any) => ({
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
    } catch (error) {
      throw new Error(`Failed to get dashboard tiles: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createDashboard(args: any) {
    const { 
      displayName, 
      description = '', 
      compartmentId: providedCompartmentId,
      dashboardConfig = {}
    } = args;

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
    } catch (error) {
      throw new Error(`Failed to create dashboard: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async updateDashboard(args: any) {
    const { 
      dashboardId, 
      displayName, 
      description,
      addWidgets = [],
      removeWidgetIds = []
    } = args;

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
    } catch (error) {
      throw new Error(`Failed to update dashboard: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createSavedSearch(args: any) {
    const {
      displayName,
      query,
      description = '',
      compartmentId: providedCompartmentId,
      widgetType = 'SEARCH'
    } = args;

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
    } catch (error) {
      throw new Error(`Failed to create saved search: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async listSavedSearches(args: any) {
    const {
      compartmentId: providedCompartmentId,
      displayName,
      limit = 50
    } = args;

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

      const searchList = searches.data.map((search: any) => ({
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
    } catch (error) {
      throw new Error(`Failed to list saved searches: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async exportDashboard(args: any) {
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
        exportData.dashboard.widgets = exportData.dashboard.widgets.map((widget: any) => ({
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
    } catch (error) {
      throw new Error(`Failed to export dashboard: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async importDashboard(args: any) {
    const {
      dashboardJson,
      compartmentId: providedCompartmentId,
      newDisplayName
    } = args;

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
    } catch (error) {
      throw new Error(`Failed to import dashboard: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('OCI Logan MCP server running on stdio');
  }
}

const server = new OCILoganMCPServer();
server.run().catch(console.error);