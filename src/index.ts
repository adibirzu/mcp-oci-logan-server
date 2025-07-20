#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { LogAnalyticsClient } from './oci/LogAnalyticsClient.js';
import { QueryValidator } from './utils/QueryValidator.js';
import { QueryTransformer } from './utils/QueryTransformer.js';
import { DocumentationLookup } from './utils/DocumentationLookup.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
                description: 'Time range for the query (e.g., "24h", "7d", "30d")',
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
                description: 'Time range for the analysis',
                default: '7d'
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
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

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

  private async executeLoganQuery(args: any) {
    const { query, queryName, timeRange = '24h', compartmentId, environment } = args;

    try {
      // Validate query syntax
      const validation = await this.queryValidator.validate(query);
      if (!validation.isValid) {
        return {
          content: [
            {
              type: 'text',
              text: `Query validation failed:\\n${validation.errors.join('\\n')}`
            }
          ]
        };
      }

      // Execute query
      const results = await this.logAnalyticsClient.executeQuery({
        query,
        timeRange,
        compartmentId,
        environment
      });

      return {
        content: [
          {
            type: 'text',
            text: `Query executed successfully!\\n\\n**Query:** ${queryName || 'Custom Query'}\\n**Time Range:** ${timeRange}\\n**Results:** ${results.totalCount} records\\n\\n**Sample Results:**\\n\`\`\`json\\n${JSON.stringify(results.data.slice(0, 5), null, 2)}\\n\`\`\``
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
      // Transform natural language to OCI query
      const query = await this.queryTransformer.transformSearchToQuery(searchTerm, eventType);
      
      const results = await this.logAnalyticsClient.executeQuery({
        query,
        timeRange,
        limit
      });

      return {
        content: [
          {
            type: 'text',
            text: `Security Event Search Results\\n\\n**Search Term:** ${searchTerm}\\n**Event Type:** ${eventType}\\n**Generated Query:** \`${query}\`\\n**Results:** ${results.totalCount} events found\\n\\n**Top Events:**\\n\`\`\`json\\n${JSON.stringify(results.data.slice(0, 10), null, 2)}\\n\`\`\``
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to search security events: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getMitreTechniques(args: any) {
    const { techniqueId, category = 'all', timeRange = '7d' } = args;

    try {
      let query: string;
      
      if (techniqueId && techniqueId !== 'all') {
        query = `'Log Source' = 'Windows Sysmon Events' and 'Technique_id' like '${techniqueId}*' and Time > dateRelative(${timeRange}) | timestats count as events by 'Technique_id', 'Event Name' | sort -events`;
      } else if (category !== 'all') {
        const categoryQueries = await this.queryTransformer.getMitreCategoryQuery(category);
        query = categoryQueries;
      } else {
        query = `'Log Source' = 'Windows Sysmon Events' and 'Technique_id' is not null and Time > dateRelative(${timeRange}) | timestats count as events by 'Technique_id' | sort -events | head 50`;
      }

      const results = await this.logAnalyticsClient.executeQuery({
        query,
        timeRange
      });

      return {
        content: [
          {
            type: 'text',
            text: `MITRE ATT&CK Technique Analysis\\n\\n**Technique:** ${techniqueId || 'All'}\\n**Category:** ${category}\\n**Time Range:** ${timeRange}\\n**Techniques Found:** ${results.totalCount}\\n\\n**Results:**\\n\`\`\`json\\n${JSON.stringify(results.data, null, 2)}\\n\`\`\``
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

      return {
        content: [
          {
            type: 'text',
            text: `IP Activity Analysis for ${ipAddress}\\n\\n**Analysis Type:** ${analysisType}\\n**Time Range:** ${timeRange}\\n\\n**Results:**\\n\`\`\`json\\n${JSON.stringify(results, null, 2)}\\n\`\`\``
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

  public async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('OCI Logan MCP server running on stdio');
  }
}

const server = new OCILoganMCPServer();
server.run().catch(console.error);