#!/usr/bin/env node

/**
 * OCI Logan MCP Server
 *
 * An MCP server for Oracle Cloud Infrastructure Logging Analytics integration.
 * Following MCP best practices for tool definitions, validation, and error handling.
 *
 * Server name follows convention: {service}_mcp
 * Tool names follow convention: {service}_{action} -> oci_logan_{action}
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { startHTTPServer } from './transport/http.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { LogAnalyticsClient } from './oci/LogAnalyticsClient.js';
import { QueryValidator } from './utils/QueryValidator.js';
import { QueryTransformer } from './utils/QueryTransformer.js';
import { DocumentationLookup } from './utils/DocumentationLookup.js';
import { createLogger } from './utils/logger.js';
import { handleError, MCPError, Errors } from './errors/index.js';
import { getToolDefinitions, normalizeToolName, TOOL_NAME_MAPPING } from './tools/definitions.js';
import { validateToolInput } from './validators/schemas.js';
import { ToolResult, PaginatedResponse } from './types/index.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logger for this module
const logger = createLogger('MCPServer');

// Configuration constants
const DEFAULT_COMPARTMENT_ID = process.env.OCI_COMPARTMENT_ID;
const DEFAULT_REGION = process.env.OCI_REGION || 'us-ashburn-1';
const EXAMPLE_COMPARTMENT_ID = 'ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]';

// Server version - update with releases
const SERVER_VERSION = '3.0.0';

/**
 * OCI Logan MCP Server Class
 * Implements MCP best practices for tool organization and error handling
 */
class OCILoganMCPServer {
  private server: Server;
  private logAnalyticsClient: LogAnalyticsClient;
  private queryValidator: QueryValidator;
  private queryTransformer: QueryTransformer;
  private documentationLookup: DocumentationLookup;

  constructor() {
    // Server name follows MCP convention: {service}_mcp
    this.server = new Server(
      {
        name: 'oci_logan_mcp',
        version: SERVER_VERSION,
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
    this.server.onerror = (error) => {
      logger.error('MCP Server error', { error: error instanceof Error ? error.message : String(error) });
    };

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down...');
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down...');
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Setup tool handlers with validation and error handling
   */
  private setupToolHandlers() {
    // Return tool definitions with annotations
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: getToolDefinitions()
    }));

    // Handle tool calls with validation
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      const { name: rawName, arguments: args } = request.params;

      // Normalize tool name (support both old and new names for backward compatibility)
      const name = normalizeToolName(rawName);

      logger.toolCall(name, args as Record<string, unknown>);

      try {
        // Validate input if schema exists
        const validation = validateToolInput(name, args);
        if (!validation.success) {
          const errors = 'errors' in validation ? validation.errors : ['Unknown validation error'];
          throw new MCPError(
            `Validation failed: ${errors.join('; ')}`,
            'VALIDATION_ERROR',
            { errors }
          );
        }

        // Route to appropriate handler
        const result = await this.routeToolCall(name, validation.data);

        logger.toolResult(name, true, Date.now() - startTime);
        return result as { content: Array<{ type: string; text?: string }>; isError?: boolean };

      } catch (error) {
        logger.toolResult(name, false, Date.now() - startTime);
        return handleError(error) as { content: Array<{ type: string; text?: string }>; isError?: boolean };
      }
    });
  }

  /**
   * Route tool calls to their handlers
   */
  private async routeToolCall(name: string, args: unknown): Promise<ToolResult> {
    const typedArgs = args as Record<string, unknown>;

    switch (name) {
      // Query Execution Tools
      case 'oci_logan_execute_query':
        return await this.executeLoganQuery(typedArgs);
      case 'oci_logan_search_security_events':
        return await this.searchSecurityEvents(typedArgs);
      case 'oci_logan_get_mitre_techniques':
        return await this.getMitreTechniques(typedArgs);
      case 'oci_logan_analyze_ip_activity':
        return await this.analyzeIPActivity(typedArgs);

      // Utility Tools
      case 'oci_logan_get_queries':
        return await this.getLoganQueries(typedArgs);
      case 'oci_logan_validate_query':
        return await this.validateQuery(typedArgs);
      case 'oci_logan_get_documentation':
        return await this.getDocumentation(typedArgs);
      case 'oci_logan_usage_guide':
        return await this.usageGuide(typedArgs);
      case 'oci_logan_check_connection':
        return await this.checkOCIConnection(typedArgs);
      case 'oci_logan_health':
        return await this.healthCheck(typedArgs);

      // Dashboard Management Tools
      case 'oci_logan_list_dashboards':
        return await this.listDashboards(typedArgs);
      case 'oci_logan_get_dashboard':
        return await this.getDashboard(typedArgs);
      case 'oci_logan_get_dashboard_tiles':
        return await this.getDashboardTiles(typedArgs);
      case 'oci_logan_create_dashboard':
        return await this.createDashboard(typedArgs);
      case 'oci_logan_update_dashboard':
        return await this.updateDashboard(typedArgs);
      case 'oci_logan_create_saved_search':
        return await this.createSavedSearch(typedArgs);
      case 'oci_logan_list_saved_searches':
        return await this.listSavedSearches(typedArgs);
      case 'oci_logan_export_dashboard':
        return await this.exportDashboard(typedArgs);
      case 'oci_logan_import_dashboard':
        return await this.importDashboard(typedArgs);

      // Advanced Analytics Tools
      case 'oci_logan_execute_advanced_analytics':
        return await this.executeAdvancedAnalytics(typedArgs);
      case 'oci_logan_execute_statistical_analysis':
        return await this.executeStatisticalAnalysis(typedArgs);
      case 'oci_logan_execute_field_operations':
        return await this.executeFieldOperations(typedArgs);
      case 'oci_logan_search_log_patterns':
        return await this.searchLogPatterns(typedArgs);
      case 'oci_logan_correlation_analysis':
        return await this.correlationAnalysis(typedArgs);

      // Resource Management Tools
      case 'oci_logan_list_log_sources':
        return await this.listLogSources(typedArgs);
      case 'oci_logan_get_log_source_details':
        return await this.getLogSourceDetails(typedArgs);
      case 'oci_logan_list_active_log_sources':
        return await this.listActiveLogSources(typedArgs);
      case 'oci_logan_list_log_fields':
        return await this.listLogFields(typedArgs);
      case 'oci_logan_get_field_details':
        return await this.getFieldDetails(typedArgs);
      case 'oci_logan_get_namespace_info':
        return await this.getNamespaceInfo(typedArgs);
      case 'oci_logan_list_entities':
        return await this.listEntities(typedArgs);
      case 'oci_logan_get_storage_usage':
        return await this.getStorageUsage(typedArgs);
      case 'oci_logan_list_parsers':
        return await this.listParsers(typedArgs);
      case 'oci_logan_list_labels':
        return await this.listLabels(typedArgs);
      case 'oci_logan_query_recent_uploads':
        return await this.queryRecentUploads(typedArgs);

      default:
        throw Errors.notFound('Tool', name);
    }
  }

  // ============================================
  // Health / Status
  // ============================================

  private async healthCheck(args: Record<string, unknown>): Promise<ToolResult> {
    const { detail = false } = args as { detail?: boolean };
    const transportEnv = (process.env.MCP_TRANSPORT || 'stdio').toLowerCase();
    const info: Record<string, unknown> = {
      status: 'ok',
      server: 'oci_logan_mcp',
      version: SERVER_VERSION,
      transport: transportEnv,
      region: DEFAULT_REGION,
      defaultCompartment: DEFAULT_COMPARTMENT_ID || "unset"
    };
    if (detail) {
      info.timestamp = new Date().toISOString();
      info.nodeVersion = process.version;
    }
    return this.formatResponse('Health', info, 'json');
  }

  private async usageGuide(args: Record<string, unknown>): Promise<ToolResult> {
    const { format = 'markdown' } = args as { format?: string };
    const guide = {
      summary: 'OCI Logan MCP usage guide',
      transports: {
        preferred: 'http',
        fallback: 'stdio',
        env: {
          MCP_TRANSPORT: 'http|stdio',
          MCP_HTTP_HOST: 'default 0.0.0.0',
          MCP_HTTP_PORT: 'default 8000'
        }
      },
      inputs: {
        profile: 'use LOGAN_COMPARTMENT_ID / OCI_COMPARTMENT_ID and LOGAN_REGION / OCI_REGION',
        defaults: 'agent should pass compartment/region when multi-tenant'
      },
      bestPractices: [
        'Use cache-first where available; prefer concise queries',
        'Limit time ranges to reduce cost; default 24h unless specified',
        'Return markdown for chat UIs, json for programmatic use'
      ],
      references: [
        'https://mcpcat.io/blog/mcp-server-best-practices/',
        'https://modelcontextprotocol.info/docs/best-practices/',
        'https://github.com/microsoft/mcp-for-beginners/blob/main/08-BestPractices/README.md'
      ]
    };
    return this.formatResponse('Usage Guide', guide, format);
  }


  // ============================================
  // Helper Methods
  // ============================================

  private parseTimeRange(timeRange: string): number {
    const timeMap: Record<string, number> = {
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
    return timeMap[timeRange] || 1440;
  }

  private buildTimeFilter(timeRange: string): string {
    const now = new Date();
    const timeRangeValue = this.parseTimeRange(timeRange);
    const startTime = new Date(now.getTime() - (timeRangeValue * 60 * 1000));
    const startTimeISO = startTime.toISOString();
    const endTimeISO = now.toISOString();
    return `and Time >= '${startTimeISO}' and Time <= '${endTimeISO}'`;
  }

  private getTimeDescription(timeRangeMinutes: number): string {
    const actualDays = Math.round(timeRangeMinutes / 60 / 24);
    if (actualDays >= 30) return `Last ${actualDays} Days`;
    if (actualDays >= 7) return `Last ${actualDays} Days`;
    if (actualDays >= 1) return actualDays === 1 ? 'Last 24 Hours' : `Last ${actualDays} Days`;
    const hours = Math.round(timeRangeMinutes / 60);
    return `Last ${hours} Hours`;
  }

  private formatResponse(
    title: string,
    data: Record<string, unknown>,
    format: string = 'markdown'
  ): ToolResult {
    if (format === 'json') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    // Markdown format
    let text = `**${title}**\n\n`;
    for (const [key, value] of Object.entries(data)) {
      if (key === '_results' && Array.isArray(value)) {
        text += `\n**Results:**\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`;
      } else if (typeof value === 'object') {
        text += `**${key}:**\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`;
      } else {
        text += `**${key}:** ${value}\n`;
      }
    }
    return { content: [{ type: 'text', text }] };
  }

  private formatPaginatedResponse<T>(
    title: string,
    items: T[],
    total: number,
    offset: number,
    limit: number,
    format: string = 'markdown'
  ): ToolResult {
    const response: PaginatedResponse<T> = {
      total,
      count: items.length,
      offset,
      items,
      hasMore: offset + items.length < total,
      nextOffset: offset + items.length < total ? offset + items.length : null
    };

    if (format === 'json') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    }

    let text = `**${title}**\n\n`;
    text += `**Total:** ${total}\n`;
    text += `**Showing:** ${items.length} (offset: ${offset})\n`;
    text += `**Has More:** ${response.hasMore}\n`;
    if (response.nextOffset) {
      text += `**Next Offset:** ${response.nextOffset}\n`;
    }
    text += `\n**Items:**\n\`\`\`json\n${JSON.stringify(items, null, 2)}\n\`\`\`\n`;

    return { content: [{ type: 'text', text }] };
  }

  // ============================================
  // Query Execution Tools
  // ============================================

  private async executeLoganQuery(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      query,
      queryName,
      timeRange = '24h',
      compartmentId: providedCompartmentId,
      environment,
      format = 'markdown'
    } = args as {
      query: string;
      queryName?: string;
      timeRange?: string;
      compartmentId?: string;
      environment?: string;
      format?: string;
    };

    const compartmentId = providedCompartmentId || DEFAULT_COMPARTMENT_ID;

    logger.debug('Executing Logan query', { query: query.substring(0, 100), timeRange, compartmentId: compartmentId?.substring(0, 30) });

    const results = await this.logAnalyticsClient.executeQuery({
      query,
      timeRange: timeRange as string,
      compartmentId,
      environment
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Query execution failed');
    }

    const timeRangeMinutes = this.parseTimeRange(timeRange as string);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (timeRangeMinutes * 60 * 1000));

    return this.formatResponse('OCI Log Query Results', {
      queryName: queryName || 'Custom Query',
      dataPeriod: this.getTimeDescription(timeRangeMinutes),
      dateRange: `${startTime.toISOString().split('T')[0]} to ${endTime.toISOString().split('T')[0]}`,
      timeRange,
      compartment: compartmentId,
      totalRecords: results.totalCount,
      executionTime: `${results.executionTime}ms`,
      _results: results.data.slice(0, 10)
    }, format as string);
  }

  private async searchSecurityEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      searchTerm,
      eventType = 'all',
      timeRange = '24h',
      limit = 20,
      format = 'markdown'
    } = args as {
      searchTerm: string;
      eventType?: string;
      timeRange?: string;
      limit?: number;
      format?: string;
    };

    const timeRangeMinutes = this.parseTimeRange(timeRange);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (timeRangeMinutes * 60 * 1000));

    // Call security analyzer via Python
    const pythonScriptPath = path.resolve(__dirname, '../python/security_analyzer.py');

    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', [
        pythonScriptPath,
        'search',
        '--query', searchTerm,
        '--time-period', timeRangeMinutes.toString()
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.resolve(__dirname, '../python')
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => { stdout += data.toString(); });
      pythonProcess.stderr.on('data', (data) => { stderr += data.toString(); });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            const events = (result.results || []).slice(0, limit);

            resolve(this.formatResponse('Security Events Search', {
              searchTerm,
              eventType,
              dataPeriod: this.getTimeDescription(timeRangeMinutes),
              dateRange: `${startTime.toISOString().split('T')[0]} to ${endTime.toISOString().split('T')[0]}`,
              resultsFound: events.length,
              _results: events
            }, format));
          } catch (parseError) {
            resolve(handleError(Errors.internal(`Failed to parse response: ${parseError}`)));
          }
        } else {
          resolve(handleError(Errors.internal(`Security analyzer failed: ${stderr}`)));
        }
      });

      pythonProcess.on('error', (error) => {
        resolve(handleError(error));
      });
    });
  }

  private async getMitreTechniques(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      techniqueId,
      category = 'all',
      timeRange = '30d',
      format = 'markdown'
    } = args as {
      techniqueId?: string;
      category?: string;
      timeRange?: string;
      format?: string;
    };

    let query: string;
    const timeFilter = this.buildTimeFilter(timeRange);

    if (techniqueId && techniqueId !== 'all') {
      query = `'Log Source' = 'Windows Sysmon Events' and Technique_id != ${techniqueId} ${timeFilter} | fields Technique_id, 'Destination IP', 'Source IP' | timestats count as logrecords by 'Log Source'`;
    } else if (category !== 'all') {
      query = await this.queryTransformer.getMitreCategoryQuery(category);
    } else {
      query = `'Log Source' = 'Windows Sysmon Events' and Technique_id != '' ${timeFilter} | fields Technique_id, 'Destination IP', 'Source IP' | timestats count as logrecords by 'Log Source'`;
    }

    const results = await this.logAnalyticsClient.executeQuery({ query, timeRange });

    if (!results.success) {
      throw Errors.ociError(results.error || 'MITRE technique analysis failed');
    }

    const timeRangeMinutes = this.parseTimeRange(timeRange);

    return this.formatResponse('MITRE ATT&CK Analysis', {
      technique: techniqueId || 'All',
      category,
      timeRange,
      dataPeriod: this.getTimeDescription(timeRangeMinutes),
      techniquesFound: results.totalCount,
      executionTime: `${results.executionTime}ms`,
      _results: results.data
    }, format);
  }

  private async analyzeIPActivity(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      ipAddress,
      analysisType = 'full',
      timeRange = '24h',
      format = 'markdown'
    } = args as {
      ipAddress: string;
      analysisType?: string;
      timeRange?: string;
      format?: string;
    };

    const timeRangeMinutes = this.parseTimeRange(timeRange);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (timeRangeMinutes * 60 * 1000));

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
        data: queryResult.data.slice(0, 10)
      });
    }

    const totalEvents = results.reduce((sum, r) => sum + r.count, 0);

    return this.formatResponse('IP Activity Analysis', {
      ipAddress,
      analysisType,
      dataPeriod: this.getTimeDescription(timeRangeMinutes),
      dateRange: `${startTime.toISOString().split('T')[0]} to ${endTime.toISOString().split('T')[0]}`,
      totalEvents,
      _results: results
    }, format);
  }

  // ============================================
  // Utility Tools
  // ============================================

  private async getLoganQueries(args: Record<string, unknown>): Promise<ToolResult> {
    const { category, queryName, format = 'markdown' } = args as {
      category?: string;
      queryName?: string;
      format?: string;
    };

    const queries = await this.queryTransformer.getLoganQueries(category, queryName);

    return this.formatResponse('Logan Security Dashboard Queries', {
      category: category || 'All',
      queryName: queryName || 'All',
      _results: queries
    }, format);
  }

  private async validateQuery(args: Record<string, unknown>): Promise<ToolResult> {
    const { query, fix = false } = args as { query: string; fix?: boolean };

    const validation = await this.queryValidator.validate(query);

    const response: Record<string, unknown> = {
      valid: validation.isValid,
      query: query.substring(0, 200) + (query.length > 200 ? '...' : '')
    };

    if (!validation.isValid) {
      response.errors = validation.errors;

      if (fix) {
        const fixedQuery = await this.queryValidator.attemptFix(query);
        if (fixedQuery) {
          response.suggestedFix = fixedQuery;
        }
      }
    } else {
      response.status = 'Query syntax is valid';
    }

    return this.formatResponse('Query Validation', response, 'markdown');
  }

  private async getDocumentation(args: Record<string, unknown>): Promise<ToolResult> {
    const { topic, searchTerm } = args as { topic?: string; searchTerm?: string };

    const documentation = await this.documentationLookup.getDocumentation(topic, searchTerm);

    return {
      content: [{
        type: 'text',
        text: `**Documentation: ${topic || 'Search Results'}**\n\n${documentation}`
      }]
    };
  }

  private async checkOCIConnection(args: Record<string, unknown>): Promise<ToolResult> {
    const { testQuery = true } = args as { testQuery?: boolean };

    const connectionStatus = await this.logAnalyticsClient.checkConnection(testQuery);

    return this.formatResponse('OCI Connection Status', {
      connected: connectionStatus.connected,
      authentication: connectionStatus.authMethod,
      region: connectionStatus.region,
      compartment: connectionStatus.compartmentId,
      details: connectionStatus.details
    }, 'markdown');
  }

  // ============================================
  // Dashboard Management Tools
  // ============================================

  private async listDashboards(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      compartmentId: providedCompartmentId,
      displayName,
      lifecycleState = 'ACTIVE',
      limit = 20,
      offset = 0,
      format = 'markdown'
    } = args as {
      compartmentId?: string;
      displayName?: string;
      lifecycleState?: string;
      limit?: number;
      offset?: number;
      format?: string;
    };

    const compartmentId = providedCompartmentId || DEFAULT_COMPARTMENT_ID;

    if (!compartmentId) {
      throw Errors.validationFailed('compartmentId', 'Required. Set OCI_COMPARTMENT_ID or provide compartmentId');
    }

    const dashboards = await this.logAnalyticsClient.listDashboards({
      compartmentId,
      displayName,
      lifecycleState,
      limit: limit + offset // Fetch enough for pagination
    });

    if (!dashboards.success) {
      throw Errors.ociError(dashboards.error || 'Failed to list dashboards');
    }

    const paginatedItems = dashboards.data.slice(offset, offset + limit);

    return this.formatPaginatedResponse(
      'OCI Dashboards',
      paginatedItems,
      dashboards.data.length,
      offset,
      limit,
      format
    );
  }

  private async getDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    const { dashboardId, compartmentId, format = 'markdown' } = args as {
      dashboardId: string;
      compartmentId?: string;
      format?: string;
    };

    const dashboard = await this.logAnalyticsClient.getDashboard({ dashboardId, compartmentId });

    if (!dashboard.success) {
      throw Errors.notFound('Dashboard', dashboardId);
    }

    return this.formatResponse('Dashboard Details', {
      id: dashboardId,
      displayName: dashboard.data.displayName,
      description: dashboard.data.description || 'No description',
      lifecycleState: dashboard.data.lifecycleState,
      created: dashboard.data.timeCreated,
      updated: dashboard.data.timeUpdated,
      widgetCount: dashboard.data.widgets?.length || 0,
      config: dashboard.data.config || {}
    }, format);
  }

  private async getDashboardTiles(args: Record<string, unknown>): Promise<ToolResult> {
    const { dashboardId, tileType = 'all', format = 'markdown' } = args as {
      dashboardId: string;
      tileType?: string;
      format?: string;
    };

    const dashboard = await this.logAnalyticsClient.getDashboard({ dashboardId });

    if (!dashboard.success) {
      throw Errors.notFound('Dashboard', dashboardId);
    }

    let tiles = dashboard.data.widgets || dashboard.data.tiles || [];

    if (tileType !== 'all') {
      tiles = tiles.filter((tile: Record<string, unknown>) =>
        (tile.type as string)?.toLowerCase() === tileType.toLowerCase() ||
        (tile.widgetType as string)?.toLowerCase() === tileType.toLowerCase()
      );
    }

    return this.formatResponse('Dashboard Tiles', {
      dashboard: dashboard.data.displayName,
      totalTiles: tiles.length,
      filterType: tileType,
      _results: tiles.map((tile: Record<string, unknown>) => ({
        id: tile.id,
        displayName: tile.displayName || tile.title,
        type: tile.type || tile.widgetType,
        query: tile.query || tile.savedSearchId
      }))
    }, format);
  }

  private async createDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      displayName,
      description = '',
      compartmentId: providedCompartmentId,
      dashboardConfig = {}
    } = args as {
      displayName: string;
      description?: string;
      compartmentId?: string;
      dashboardConfig?: Record<string, unknown>;
    };

    const compartmentId = providedCompartmentId || DEFAULT_COMPARTMENT_ID;

    if (!compartmentId) {
      throw Errors.validationFailed('compartmentId', 'Required for creating dashboards');
    }

    const dashboard = await this.logAnalyticsClient.createDashboard({
      displayName,
      description,
      compartmentId,
      dashboardConfig
    });

    if (!dashboard.success) {
      throw Errors.ociError(dashboard.error || 'Failed to create dashboard');
    }

    return this.formatResponse('Dashboard Created', {
      id: dashboard.data.id,
      displayName,
      description: description || 'No description',
      compartment: compartmentId,
      widgets: (dashboardConfig as Record<string, unknown[]>).widgets?.length || 0,
      status: dashboard.data.lifecycleState || 'ACTIVE'
    }, 'markdown');
  }

  private async updateDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      dashboardId,
      displayName,
      description,
      addWidgets = [],
      removeWidgetIds = []
    } = args as {
      dashboardId: string;
      displayName?: string;
      description?: string;
      addWidgets?: unknown[];
      removeWidgetIds?: string[];
    };

    const result = await this.logAnalyticsClient.updateDashboard({
      dashboardId,
      ...(displayName && { displayName }),
      ...(description !== undefined && { description }),
      ...(addWidgets.length > 0 && { addWidgets }),
      ...(removeWidgetIds.length > 0 && { removeWidgetIds })
    });

    if (!result.success) {
      throw Errors.ociError(result.error || 'Failed to update dashboard');
    }

    return this.formatResponse('Dashboard Updated', {
      id: dashboardId,
      updatedFields: {
        displayName: displayName ? 'Updated' : 'Unchanged',
        description: description !== undefined ? 'Updated' : 'Unchanged',
        widgetsAdded: addWidgets.length,
        widgetsRemoved: removeWidgetIds.length
      },
      status: result.data.lifecycleState || 'ACTIVE'
    }, 'markdown');
  }

  private async createSavedSearch(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      displayName,
      query,
      description = '',
      compartmentId: providedCompartmentId,
      widgetType = 'SEARCH'
    } = args as {
      displayName: string;
      query: string;
      description?: string;
      compartmentId?: string;
      widgetType?: string;
    };

    const compartmentId = providedCompartmentId || DEFAULT_COMPARTMENT_ID;

    if (!compartmentId) {
      throw Errors.validationFailed('compartmentId', 'Required for creating saved searches');
    }

    const savedSearch = await this.logAnalyticsClient.createSavedSearch({
      displayName,
      query,
      description,
      compartmentId,
      widgetType
    });

    if (!savedSearch.success) {
      throw Errors.ociError(savedSearch.error || 'Failed to create saved search');
    }

    return this.formatResponse('Saved Search Created', {
      id: savedSearch.data.id,
      displayName,
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      widgetType,
      compartment: compartmentId
    }, 'markdown');
  }

  private async listSavedSearches(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      compartmentId: providedCompartmentId,
      displayName,
      limit = 20,
      offset = 0,
      format = 'markdown'
    } = args as {
      compartmentId?: string;
      displayName?: string;
      limit?: number;
      offset?: number;
      format?: string;
    };

    const compartmentId = providedCompartmentId || DEFAULT_COMPARTMENT_ID;

    if (!compartmentId) {
      throw Errors.validationFailed('compartmentId', 'Required for listing saved searches');
    }

    const searches = await this.logAnalyticsClient.listSavedSearches({
      compartmentId,
      displayName,
      limit: limit + offset
    });

    if (!searches.success) {
      throw Errors.ociError(searches.error || 'Failed to list saved searches');
    }

    const paginatedItems = searches.data.slice(offset, offset + limit);

    return this.formatPaginatedResponse(
      'Saved Searches',
      paginatedItems,
      searches.data.length,
      offset,
      limit,
      format
    );
  }

  private async exportDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    const { dashboardId, includeQueries = true } = args as {
      dashboardId: string;
      includeQueries?: boolean;
    };

    const dashboard = await this.logAnalyticsClient.getDashboard({ dashboardId });

    if (!dashboard.success) {
      throw Errors.notFound('Dashboard', dashboardId);
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

    return this.formatResponse('Dashboard Export', {
      dashboard: dashboard.data.displayName,
      version: '1.0',
      includeQueries,
      widgetCount: exportData.dashboard.widgets.length,
      exportData
    }, 'markdown');
  }

  private async importDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      dashboardJson,
      compartmentId: providedCompartmentId,
      newDisplayName
    } = args as {
      dashboardJson: string;
      compartmentId?: string;
      newDisplayName?: string;
    };

    const compartmentId = providedCompartmentId || DEFAULT_COMPARTMENT_ID;

    if (!compartmentId) {
      throw Errors.validationFailed('compartmentId', 'Required for importing dashboards');
    }

    const importData = JSON.parse(dashboardJson);

    if (!importData.dashboard) {
      throw Errors.validationFailed('dashboardJson', 'Invalid format: missing dashboard property');
    }

    const result = await this.logAnalyticsClient.createDashboard({
      displayName: newDisplayName || importData.dashboard.displayName,
      description: importData.dashboard.description,
      compartmentId,
      dashboardConfig: {
        widgets: importData.dashboard.widgets || [],
        config: importData.dashboard.config || {}
      }
    });

    if (!result.success) {
      throw Errors.ociError(result.error || 'Failed to import dashboard');
    }

    return this.formatResponse('Dashboard Imported', {
      id: result.data.id,
      displayName: newDisplayName || importData.dashboard.displayName,
      compartment: compartmentId,
      widgetsImported: importData.dashboard.widgets?.length || 0,
      status: result.data.lifecycleState || 'ACTIVE'
    }, 'markdown');
  }

  // ============================================
  // Advanced Analytics Tools
  // ============================================

  private async executeAdvancedAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      analyticsType,
      query: baseQuery = '*',
      field,
      parameters = {},
      timeRange = '24h',
      compartmentId,
      format = 'markdown'
    } = args as {
      analyticsType: string;
      query?: string;
      field?: string;
      parameters?: Record<string, unknown>;
      timeRange?: string;
      compartmentId?: string;
      format?: string;
    };

    let analyticsQuery = baseQuery;

    if (!baseQuery.includes('Time >') && !baseQuery.includes('dateRelative')) {
      const timeFilter = this.buildTimeFilter(timeRange);
      analyticsQuery = `${baseQuery} ${timeFilter}`;
    }

    // Build analytics command
    let analyticsCommand = '';
    const params = parameters as Record<string, unknown>;

    switch (analyticsType) {
      case 'cluster':
        analyticsCommand = `cluster maxclusters=${params.maxClusters || 10} t=0.8 field=${field || '*'}`;
        break;
      case 'link':
        analyticsCommand = `link ${field || 'Host'}`;
        break;
      case 'nlp':
        analyticsCommand = 'nlp';
        break;
      case 'classify':
        analyticsCommand = 'classify';
        break;
      case 'outlier':
        analyticsCommand = `outlier threshold=${params.threshold || 2}`;
        break;
      case 'sequence':
        analyticsCommand = `sequence ${params.pattern || 'default'}`;
        break;
      case 'geostats':
        analyticsCommand = `geostats latfield=${params.latField || 'lat'} longfield=${params.lonField || 'lon'}`;
        break;
      case 'timecluster':
        analyticsCommand = `timecluster span=${params.span || '1h'}`;
        break;
      default:
        throw Errors.validationFailed('analyticsType', `Unknown type: ${analyticsType}`);
    }

    const fullQuery = `${analyticsQuery} | ${analyticsCommand}`;
    const results = await this.logAnalyticsClient.executeQuery({
      query: fullQuery,
      timeRange,
      compartmentId
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Advanced analytics failed');
    }

    return this.formatResponse('Advanced Analytics Results', {
      analyticsType,
      query: fullQuery.substring(0, 200),
      timeRange,
      resultsCount: results.totalCount,
      executionTime: `${results.executionTime}ms`,
      _results: results.data
    }, format);
  }

  private async executeStatisticalAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      operation,
      fields,
      groupBy,
      query: baseQuery = '*',
      timeRange = '24h',
      compartmentId,
      format = 'markdown'
    } = args as {
      operation: string;
      fields: string[];
      groupBy?: string[];
      query?: string;
      timeRange?: string;
      compartmentId?: string;
      format?: string;
    };

    let analyticsQuery = baseQuery;
    if (!baseQuery.includes('Time >') && !baseQuery.includes('dateRelative')) {
      const timeFilter = this.buildTimeFilter(timeRange);
      analyticsQuery = `${baseQuery} ${timeFilter}`;
    }

    // Build stats command
    const fieldList = fields.map(f => `'${f}'`).join(', ');
    const groupByClause = groupBy?.length ? ` by ${groupBy.map(f => `'${f}'`).join(', ')}` : '';

    let statsCommand: string;
    switch (operation) {
      case 'stats':
        statsCommand = `stats count, avg(${fieldList}), sum(${fieldList})${groupByClause}`;
        break;
      case 'timestats':
        statsCommand = `timestats count${groupByClause}`;
        break;
      case 'eventstats':
        statsCommand = `eventstats count${groupByClause}`;
        break;
      case 'top':
        statsCommand = `top 10 ${fieldList}`;
        break;
      case 'bottom':
        statsCommand = `bottom 10 ${fieldList}`;
        break;
      case 'rare':
        statsCommand = `rare ${fieldList}`;
        break;
      case 'distinct':
        statsCommand = `stats distinct_count(${fieldList})${groupByClause}`;
        break;
      default:
        statsCommand = `stats count${groupByClause}`;
    }

    const fullQuery = `${analyticsQuery} | ${statsCommand}`;
    const results = await this.logAnalyticsClient.executeQuery({
      query: fullQuery,
      timeRange,
      compartmentId
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Statistical analysis failed');
    }

    return this.formatResponse('Statistical Analysis Results', {
      operation,
      fields,
      groupBy: groupBy || [],
      timeRange,
      resultsCount: results.totalCount,
      executionTime: `${results.executionTime}ms`,
      _results: results.data
    }, format);
  }

  private async executeFieldOperations(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      operation,
      sourceField,
      targetField,
      pattern,
      expression,
      query: baseQuery = '*',
      timeRange = '24h',
      compartmentId,
      format = 'markdown'
    } = args as {
      operation: string;
      sourceField: string;
      targetField?: string;
      pattern?: string;
      expression?: string;
      query?: string;
      timeRange?: string;
      compartmentId?: string;
      format?: string;
    };

    let analyticsQuery = baseQuery;
    if (!baseQuery.includes('Time >') && !baseQuery.includes('dateRelative')) {
      const timeFilter = this.buildTimeFilter(timeRange);
      analyticsQuery = `${baseQuery} ${timeFilter}`;
    }

    // Build field operation command
    let fieldCommand: string;
    const target = targetField || `${sourceField}_result`;

    switch (operation) {
      case 'extract':
        fieldCommand = `extract field='${sourceField}' '${pattern || "(.*)"}'`;
        break;
      case 'parse':
        fieldCommand = `parse '${sourceField}' '${pattern || "*"}'`;
        break;
      case 'rename':
        fieldCommand = `rename '${sourceField}' as '${target}'`;
        break;
      case 'eval':
        fieldCommand = `eval '${target}' = ${expression || `'${sourceField}'`}`;
        break;
      case 'split':
        fieldCommand = `split '${sourceField}' by '${pattern || ","}'`;
        break;
      case 'concat':
        fieldCommand = `eval '${target}' = concat('${sourceField}', '${expression || ""}')`;
        break;
      case 'replace':
        fieldCommand = `eval '${target}' = replace('${sourceField}', '${pattern || ""}', '${expression || ""}')`;
        break;
      default:
        fieldCommand = `fields '${sourceField}'`;
    }

    const fullQuery = `${analyticsQuery} | ${fieldCommand}`;
    const results = await this.logAnalyticsClient.executeQuery({
      query: fullQuery,
      timeRange,
      compartmentId
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Field operation failed');
    }

    return this.formatResponse('Field Operation Results', {
      operation,
      sourceField,
      targetField: target,
      timeRange,
      resultsCount: results.totalCount,
      executionTime: `${results.executionTime}ms`,
      _results: results.data.slice(0, 20)
    }, format);
  }

  private async searchLogPatterns(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      pattern,
      logSource,
      field,
      timeRange = '24h',
      limit = 20,
      compartmentId,
      format = 'markdown'
    } = args as {
      pattern: string;
      logSource?: string;
      field?: string;
      timeRange?: string;
      limit?: number;
      compartmentId?: string;
      format?: string;
    };

    let query = '*';
    if (logSource) {
      query = `'Log Source' = '${logSource}'`;
    }

    const timeFilter = this.buildTimeFilter(timeRange);
    query = `${query} ${timeFilter}`;

    if (field) {
      query = `${query} and '${field}' like '%${pattern}%'`;
    } else {
      query = `${query} and Message like '%${pattern}%'`;
    }

    query = `${query} | head ${limit}`;

    const results = await this.logAnalyticsClient.executeQuery({
      query,
      timeRange,
      compartmentId
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Pattern search failed');
    }

    return this.formatResponse('Log Pattern Search Results', {
      pattern,
      logSource: logSource || 'All',
      field: field || 'Message',
      timeRange,
      matchesFound: results.totalCount,
      _results: results.data
    }, format);
  }

  private async correlationAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      correlationType,
      primaryField,
      secondaryFields,
      timeWindow,
      query: baseQuery = '*',
      timeRange = '24h',
      compartmentId,
      format = 'markdown'
    } = args as {
      correlationType: string;
      primaryField: string;
      secondaryFields: string[];
      timeWindow?: string;
      query?: string;
      timeRange?: string;
      compartmentId?: string;
      format?: string;
    };

    let analyticsQuery = baseQuery;
    if (!baseQuery.includes('Time >') && !baseQuery.includes('dateRelative')) {
      const timeFilter = this.buildTimeFilter(timeRange);
      analyticsQuery = `${baseQuery} ${timeFilter}`;
    }

    // Build correlation command based on type
    const allFields = [primaryField, ...secondaryFields].map(f => `'${f}'`).join(', ');
    let correlationCommand: string;

    switch (correlationType) {
      case 'temporal':
        correlationCommand = `link span=${timeWindow || '5m'} ${allFields}`;
        break;
      case 'entity':
        correlationCommand = `stats count by ${allFields}`;
        break;
      case 'transaction':
        correlationCommand = `transaction '${primaryField}' maxpause=${timeWindow || '5m'}`;
        break;
      case 'session':
        correlationCommand = `stats count, first(Time) as start, last(Time) as end by '${primaryField}'`;
        break;
      default:
        correlationCommand = `stats count by ${allFields}`;
    }

    const fullQuery = `${analyticsQuery} | ${correlationCommand}`;
    const results = await this.logAnalyticsClient.executeQuery({
      query: fullQuery,
      timeRange,
      compartmentId
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Correlation analysis failed');
    }

    return this.formatResponse('Correlation Analysis Results', {
      correlationType,
      primaryField,
      secondaryFields,
      timeWindow: timeWindow || 'default',
      timeRange,
      correlationsFound: results.totalCount,
      executionTime: `${results.executionTime}ms`,
      _results: results.data
    }, format);
  }

  // ============================================
  // Resource Management Tools
  // ============================================

  private async listLogSources(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      compartmentId: providedCompartmentId,
      displayName,
      isSystem,
      limit = 20,
      offset = 0,
      format = 'markdown'
    } = args as {
      compartmentId?: string;
      displayName?: string;
      isSystem?: boolean;
      limit?: number;
      offset?: number;
      format?: string;
    };

    const compartmentId = providedCompartmentId || DEFAULT_COMPARTMENT_ID;

    // Query-based discovery
    let query = `* | stats count by 'Log Source'`;
    if (displayName) {
      query = `'Log Source' like '%${displayName}%' | stats count by 'Log Source'`;
    }

    const results = await this.logAnalyticsClient.executeQuery({
      query,
      timeRange: '7d',
      compartmentId
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Failed to list log sources');
    }

    let sources = results.data;
    if (typeof isSystem === 'boolean') {
      // Filter by system sources (heuristic based on naming)
      sources = sources.filter((s: Record<string, unknown>) => {
        const name = (s['Log Source'] || s.logSource || '') as string;
        const isSystemSource = name.startsWith('OCI') || name.includes('Oracle');
        return isSystem ? isSystemSource : !isSystemSource;
      });
    }

    const paginatedItems = sources.slice(offset, offset + limit);

    return this.formatPaginatedResponse(
      'Log Sources',
      paginatedItems,
      sources.length,
      offset,
      limit,
      format
    );
  }

  private async getLogSourceDetails(args: Record<string, unknown>): Promise<ToolResult> {
    const { logSourceName, compartmentId, format = 'markdown' } = args as {
      logSourceName: string;
      compartmentId?: string;
      format?: string;
    };

    const query = `'Log Source' = '${logSourceName}' | stats count, earliest(Time) as firstSeen, latest(Time) as lastSeen, dc('Host Name') as hostCount`;

    const results = await this.logAnalyticsClient.executeQuery({
      query,
      timeRange: '30d',
      compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID
    });

    if (!results.success || results.totalCount === 0) {
      throw Errors.notFound('Log Source', logSourceName);
    }

    return this.formatResponse('Log Source Details', {
      logSourceName,
      _results: results.data[0] || {}
    }, format);
  }

  private async listActiveLogSources(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      timeRange = '24h',
      compartmentId,
      limit = 20,
      format = 'markdown'
    } = args as {
      timeRange?: string;
      compartmentId?: string;
      limit?: number;
      format?: string;
    };

    const query = `* | stats count as events by 'Log Source' | sort -events | head ${limit}`;

    const results = await this.logAnalyticsClient.executeQuery({
      query,
      timeRange,
      compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Failed to list active log sources');
    }

    return this.formatResponse('Active Log Sources', {
      timeRange,
      sourcesFound: results.totalCount,
      _results: results.data
    }, format);
  }

  private async listLogFields(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      logSourceName,
      fieldType,
      isSystem,
      limit = 20,
      offset = 0,
      compartmentId,
      format = 'markdown'
    } = args as {
      logSourceName?: string;
      fieldType?: string;
      isSystem?: boolean;
      limit?: number;
      offset?: number;
      compartmentId?: string;
      format?: string;
    };

    let query = '*';
    if (logSourceName) {
      query = `'Log Source' = '${logSourceName}'`;
    }
    query = `${query} | head 1`;

    const results = await this.logAnalyticsClient.executeQuery({
      query,
      timeRange: '1h',
      compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Failed to list fields');
    }

    // Extract field names from result schema
    let fields: string[] = [];
    if (results.data.length > 0) {
      fields = Object.keys(results.data[0]);
    }

    const paginatedFields = fields.slice(offset, offset + limit);

    return this.formatPaginatedResponse(
      'Log Fields',
      paginatedFields.map(f => ({ fieldName: f })),
      fields.length,
      offset,
      limit,
      format
    );
  }

  private async getFieldDetails(args: Record<string, unknown>): Promise<ToolResult> {
    const { fieldName, compartmentId, format = 'markdown' } = args as {
      fieldName: string;
      compartmentId?: string;
      format?: string;
    };

    const query = `* | stats count, dc('${fieldName}') as distinctValues by '${fieldName}' | head 10`;

    const results = await this.logAnalyticsClient.executeQuery({
      query,
      timeRange: '24h',
      compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Failed to get field details');
    }

    return this.formatResponse('Field Details', {
      fieldName,
      sampleValues: results.data.slice(0, 10)
    }, format);
  }

  private async getNamespaceInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const { compartmentId, format = 'markdown' } = args as {
      compartmentId?: string;
      format?: string;
    };

    const connectionStatus = await this.logAnalyticsClient.checkConnection(false);

    return this.formatResponse('Namespace Information', {
      region: connectionStatus.region,
      compartment: compartmentId || DEFAULT_COMPARTMENT_ID || 'Not set',
      connected: connectionStatus.connected,
      authMethod: connectionStatus.authMethod
    }, format);
  }

  private async listEntities(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      entityType = 'all',
      compartmentId,
      limit = 20,
      offset = 0,
      format = 'markdown'
    } = args as {
      entityType?: string;
      compartmentId?: string;
      limit?: number;
      offset?: number;
      format?: string;
    };

    let query = `* | stats count by 'Entity Name', 'Entity Type'`;
    if (entityType !== 'all') {
      query = `'Entity Type' = '${entityType}' | stats count by 'Entity Name', 'Entity Type'`;
    }
    query = `${query} | sort -count | head ${limit + offset}`;

    const results = await this.logAnalyticsClient.executeQuery({
      query,
      timeRange: '7d',
      compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Failed to list entities');
    }

    const paginatedItems = results.data.slice(offset, offset + limit);

    return this.formatPaginatedResponse(
      'Entities',
      paginatedItems,
      results.data.length,
      offset,
      limit,
      format
    );
  }

  private async getStorageUsage(args: Record<string, unknown>): Promise<ToolResult> {
    const { compartmentId, timeRange = '24h', format = 'markdown' } = args as {
      compartmentId?: string;
      timeRange?: string;
      format?: string;
    };

    const query = `* | timestats count as records, sum(Size) as totalBytes by 'Log Source'`;

    const results = await this.logAnalyticsClient.executeQuery({
      query,
      timeRange,
      compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Failed to get storage usage');
    }

    return this.formatResponse('Storage Usage', {
      timeRange,
      _results: results.data
    }, format);
  }

  private async listParsers(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      parserType = 'all',
      compartmentId,
      limit = 20,
      offset = 0,
      format = 'markdown'
    } = args as {
      parserType?: string;
      compartmentId?: string;
      limit?: number;
      offset?: number;
      format?: string;
    };

    // Query-based discovery of parsers
    const query = `* | stats count by 'Parser Name', 'Parser Type' | sort -count | head ${limit + offset}`;

    const results = await this.logAnalyticsClient.executeQuery({
      query,
      timeRange: '7d',
      compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Failed to list parsers');
    }

    let parsers = results.data;
    if (parserType !== 'all') {
      parsers = parsers.filter((p: Record<string, unknown>) =>
        (p['Parser Type'] || '') === parserType
      );
    }

    const paginatedItems = parsers.slice(offset, offset + limit);

    return this.formatPaginatedResponse(
      'Parsers',
      paginatedItems,
      parsers.length,
      offset,
      limit,
      format
    );
  }

  private async listLabels(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      compartmentId,
      limit = 20,
      offset = 0,
      format = 'markdown'
    } = args as {
      compartmentId?: string;
      limit?: number;
      offset?: number;
      format?: string;
    };

    const query = `* | stats count by Label | sort -count | head ${limit + offset}`;

    const results = await this.logAnalyticsClient.executeQuery({
      query,
      timeRange: '7d',
      compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Failed to list labels');
    }

    const paginatedItems = results.data.slice(offset, offset + limit);

    return this.formatPaginatedResponse(
      'Labels',
      paginatedItems,
      results.data.length,
      offset,
      limit,
      format
    );
  }

  private async queryRecentUploads(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      timeRange = '24h',
      limit = 20,
      compartmentId,
      format = 'markdown'
    } = args as {
      timeRange?: string;
      limit?: number;
      compartmentId?: string;
      format?: string;
    };

    const query = `* | stats count as records, earliest(Time) as uploadStart, latest(Time) as uploadEnd by 'Upload Name', 'Log Source' | sort -uploadEnd | head ${limit}`;

    const results = await this.logAnalyticsClient.executeQuery({
      query,
      timeRange,
      compartmentId: compartmentId || DEFAULT_COMPARTMENT_ID
    });

    if (!results.success) {
      throw Errors.ociError(results.error || 'Failed to query recent uploads');
    }

    return this.formatResponse('Recent Uploads', {
      timeRange,
      uploadsFound: results.totalCount,
      _results: results.data
    }, format);
  }

  // ============================================
  // Server Lifecycle
  // ============================================

  /**
   * Get the internal MCP server instance (for transport setup)
   */
  getServer(): Server {
    return this.server;
  }

  async run() {
    const transportEnv = (process.env.MCP_TRANSPORT || 'stdio').toLowerCase();

    if (transportEnv === 'http') {
      // Use new HTTP transport with OAuth support
      await startHTTPServer(this.server, SERVER_VERSION);
      return;
    }

    // Default: stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info(`OCI Logan MCP Server v${SERVER_VERSION} running on stdio`);
  }
}

// Start server
const server = new OCILoganMCPServer();
server.run().catch((error) => {
  logger.error('Failed to start server', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
