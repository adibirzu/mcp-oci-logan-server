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
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { LogAnalyticsClient } from './oci/LogAnalyticsClient.js';
import { QueryValidator } from './utils/QueryValidator.js';
import { QueryTransformer } from './utils/QueryTransformer.js';
import { DocumentationLookup } from './utils/DocumentationLookup.js';
import { createLogger } from './utils/logger.js';
import { handleError, MCPError, Errors } from './errors/index.js';
import { getToolDefinitions, normalizeToolName } from './tools/definitions.js';
import { validateToolInput } from './validators/schemas.js';
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
const SERVER_VERSION = '2.0.0';
/**
 * OCI Logan MCP Server Class
 * Implements MCP best practices for tool organization and error handling
 */
class OCILoganMCPServer {
    server;
    logAnalyticsClient;
    queryValidator;
    queryTransformer;
    documentationLookup;
    constructor() {
        // Server name follows MCP convention: {service}_mcp
        this.server = new Server({
            name: 'oci_logan_mcp',
            version: SERVER_VERSION,
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
    setupToolHandlers() {
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
            logger.toolCall(name, args);
            try {
                // Validate input if schema exists
                const validation = validateToolInput(name, args);
                if (!validation.success) {
                    const errors = 'errors' in validation ? validation.errors : ['Unknown validation error'];
                    throw new MCPError(`Validation failed: ${errors.join('; ')}`, 'VALIDATION_ERROR', { errors });
                }
                // Route to appropriate handler
                const result = await this.routeToolCall(name, validation.data);
                logger.toolResult(name, true, Date.now() - startTime);
                return result;
            }
            catch (error) {
                logger.toolResult(name, false, Date.now() - startTime);
                return handleError(error);
            }
        });
    }
    /**
     * Route tool calls to their handlers
     */
    async routeToolCall(name, args) {
        const typedArgs = args;
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
            case 'oci_logan_check_connection':
                return await this.checkOCIConnection(typedArgs);
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
    // Helper Methods
    // ============================================
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
        return timeMap[timeRange] || 1440;
    }
    buildTimeFilter(timeRange) {
        const now = new Date();
        const timeRangeValue = this.parseTimeRange(timeRange);
        const startTime = new Date(now.getTime() - (timeRangeValue * 60 * 1000));
        const startTimeISO = startTime.toISOString();
        const endTimeISO = now.toISOString();
        return `and Time >= '${startTimeISO}' and Time <= '${endTimeISO}'`;
    }
    getTimeDescription(timeRangeMinutes) {
        const actualDays = Math.round(timeRangeMinutes / 60 / 24);
        if (actualDays >= 30)
            return `Last ${actualDays} Days`;
        if (actualDays >= 7)
            return `Last ${actualDays} Days`;
        if (actualDays >= 1)
            return actualDays === 1 ? 'Last 24 Hours' : `Last ${actualDays} Days`;
        const hours = Math.round(timeRangeMinutes / 60);
        return `Last ${hours} Hours`;
    }
    formatResponse(title, data, format = 'markdown') {
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
            }
            else if (typeof value === 'object') {
                text += `**${key}:**\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`;
            }
            else {
                text += `**${key}:** ${value}\n`;
            }
        }
        return { content: [{ type: 'text', text }] };
    }
    formatPaginatedResponse(title, items, total, offset, limit, format = 'markdown') {
        const response = {
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
    async executeLoganQuery(args) {
        const { query, queryName, timeRange = '24h', compartmentId: providedCompartmentId, environment, format = 'markdown' } = args;
        const compartmentId = providedCompartmentId || DEFAULT_COMPARTMENT_ID;
        logger.debug('Executing Logan query', { query: query.substring(0, 100), timeRange, compartmentId: compartmentId?.substring(0, 30) });
        const results = await this.logAnalyticsClient.executeQuery({
            query,
            timeRange: timeRange,
            compartmentId,
            environment
        });
        if (!results.success) {
            throw Errors.ociError(results.error || 'Query execution failed');
        }
        const timeRangeMinutes = this.parseTimeRange(timeRange);
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
        }, format);
    }
    async searchSecurityEvents(args) {
        const { searchTerm, eventType = 'all', timeRange = '24h', limit = 20, format = 'markdown' } = args;
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
                    }
                    catch (parseError) {
                        resolve(handleError(Errors.internal(`Failed to parse response: ${parseError}`)));
                    }
                }
                else {
                    resolve(handleError(Errors.internal(`Security analyzer failed: ${stderr}`)));
                }
            });
            pythonProcess.on('error', (error) => {
                resolve(handleError(error));
            });
        });
    }
    async getMitreTechniques(args) {
        const { techniqueId, category = 'all', timeRange = '30d', format = 'markdown' } = args;
        let query;
        const timeFilter = this.buildTimeFilter(timeRange);
        if (techniqueId && techniqueId !== 'all') {
            query = `'Log Source' = 'Windows Sysmon Events' and Technique_id != ${techniqueId} ${timeFilter} | fields Technique_id, 'Destination IP', 'Source IP' | timestats count as logrecords by 'Log Source'`;
        }
        else if (category !== 'all') {
            query = await this.queryTransformer.getMitreCategoryQuery(category);
        }
        else {
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
    async analyzeIPActivity(args) {
        const { ipAddress, analysisType = 'full', timeRange = '24h', format = 'markdown' } = args;
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
    async getLoganQueries(args) {
        const { category, queryName, format = 'markdown' } = args;
        const queries = await this.queryTransformer.getLoganQueries(category, queryName);
        return this.formatResponse('Logan Security Dashboard Queries', {
            category: category || 'All',
            queryName: queryName || 'All',
            _results: queries
        }, format);
    }
    async validateQuery(args) {
        const { query, fix = false } = args;
        const validation = await this.queryValidator.validate(query);
        const response = {
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
        }
        else {
            response.status = 'Query syntax is valid';
        }
        return this.formatResponse('Query Validation', response, 'markdown');
    }
    async getDocumentation(args) {
        const { topic, searchTerm } = args;
        const documentation = await this.documentationLookup.getDocumentation(topic, searchTerm);
        return {
            content: [{
                    type: 'text',
                    text: `**Documentation: ${topic || 'Search Results'}**\n\n${documentation}`
                }]
        };
    }
    async checkOCIConnection(args) {
        const { testQuery = true } = args;
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
    async listDashboards(args) {
        const { compartmentId: providedCompartmentId, displayName, lifecycleState = 'ACTIVE', limit = 20, offset = 0, format = 'markdown' } = args;
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
        return this.formatPaginatedResponse('OCI Dashboards', paginatedItems, dashboards.data.length, offset, limit, format);
    }
    async getDashboard(args) {
        const { dashboardId, compartmentId, format = 'markdown' } = args;
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
    async getDashboardTiles(args) {
        const { dashboardId, tileType = 'all', format = 'markdown' } = args;
        const dashboard = await this.logAnalyticsClient.getDashboard({ dashboardId });
        if (!dashboard.success) {
            throw Errors.notFound('Dashboard', dashboardId);
        }
        let tiles = dashboard.data.widgets || dashboard.data.tiles || [];
        if (tileType !== 'all') {
            tiles = tiles.filter((tile) => tile.type?.toLowerCase() === tileType.toLowerCase() ||
                tile.widgetType?.toLowerCase() === tileType.toLowerCase());
        }
        return this.formatResponse('Dashboard Tiles', {
            dashboard: dashboard.data.displayName,
            totalTiles: tiles.length,
            filterType: tileType,
            _results: tiles.map((tile) => ({
                id: tile.id,
                displayName: tile.displayName || tile.title,
                type: tile.type || tile.widgetType,
                query: tile.query || tile.savedSearchId
            }))
        }, format);
    }
    async createDashboard(args) {
        const { displayName, description = '', compartmentId: providedCompartmentId, dashboardConfig = {} } = args;
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
            widgets: dashboardConfig.widgets?.length || 0,
            status: dashboard.data.lifecycleState || 'ACTIVE'
        }, 'markdown');
    }
    async updateDashboard(args) {
        const { dashboardId, displayName, description, addWidgets = [], removeWidgetIds = [] } = args;
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
    async createSavedSearch(args) {
        const { displayName, query, description = '', compartmentId: providedCompartmentId, widgetType = 'SEARCH' } = args;
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
    async listSavedSearches(args) {
        const { compartmentId: providedCompartmentId, displayName, limit = 20, offset = 0, format = 'markdown' } = args;
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
        return this.formatPaginatedResponse('Saved Searches', paginatedItems, searches.data.length, offset, limit, format);
    }
    async exportDashboard(args) {
        const { dashboardId, includeQueries = true } = args;
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
    async importDashboard(args) {
        const { dashboardJson, compartmentId: providedCompartmentId, newDisplayName } = args;
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
    async executeAdvancedAnalytics(args) {
        const { analyticsType, query: baseQuery = '*', field, parameters = {}, timeRange = '24h', compartmentId, format = 'markdown' } = args;
        let analyticsQuery = baseQuery;
        if (!baseQuery.includes('Time >') && !baseQuery.includes('dateRelative')) {
            const timeFilter = this.buildTimeFilter(timeRange);
            analyticsQuery = `${baseQuery} ${timeFilter}`;
        }
        // Build analytics command
        let analyticsCommand = '';
        const params = parameters;
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
    async executeStatisticalAnalysis(args) {
        const { operation, fields, groupBy, query: baseQuery = '*', timeRange = '24h', compartmentId, format = 'markdown' } = args;
        let analyticsQuery = baseQuery;
        if (!baseQuery.includes('Time >') && !baseQuery.includes('dateRelative')) {
            const timeFilter = this.buildTimeFilter(timeRange);
            analyticsQuery = `${baseQuery} ${timeFilter}`;
        }
        // Build stats command
        const fieldList = fields.map(f => `'${f}'`).join(', ');
        const groupByClause = groupBy?.length ? ` by ${groupBy.map(f => `'${f}'`).join(', ')}` : '';
        let statsCommand;
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
    async executeFieldOperations(args) {
        const { operation, sourceField, targetField, pattern, expression, query: baseQuery = '*', timeRange = '24h', compartmentId, format = 'markdown' } = args;
        let analyticsQuery = baseQuery;
        if (!baseQuery.includes('Time >') && !baseQuery.includes('dateRelative')) {
            const timeFilter = this.buildTimeFilter(timeRange);
            analyticsQuery = `${baseQuery} ${timeFilter}`;
        }
        // Build field operation command
        let fieldCommand;
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
    async searchLogPatterns(args) {
        const { pattern, logSource, field, timeRange = '24h', limit = 20, compartmentId, format = 'markdown' } = args;
        let query = '*';
        if (logSource) {
            query = `'Log Source' = '${logSource}'`;
        }
        const timeFilter = this.buildTimeFilter(timeRange);
        query = `${query} ${timeFilter}`;
        if (field) {
            query = `${query} and '${field}' like '%${pattern}%'`;
        }
        else {
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
    async correlationAnalysis(args) {
        const { correlationType, primaryField, secondaryFields, timeWindow, query: baseQuery = '*', timeRange = '24h', compartmentId, format = 'markdown' } = args;
        let analyticsQuery = baseQuery;
        if (!baseQuery.includes('Time >') && !baseQuery.includes('dateRelative')) {
            const timeFilter = this.buildTimeFilter(timeRange);
            analyticsQuery = `${baseQuery} ${timeFilter}`;
        }
        // Build correlation command based on type
        const allFields = [primaryField, ...secondaryFields].map(f => `'${f}'`).join(', ');
        let correlationCommand;
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
    async listLogSources(args) {
        const { compartmentId: providedCompartmentId, displayName, isSystem, limit = 20, offset = 0, format = 'markdown' } = args;
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
            sources = sources.filter((s) => {
                const name = (s['Log Source'] || s.logSource || '');
                const isSystemSource = name.startsWith('OCI') || name.includes('Oracle');
                return isSystem ? isSystemSource : !isSystemSource;
            });
        }
        const paginatedItems = sources.slice(offset, offset + limit);
        return this.formatPaginatedResponse('Log Sources', paginatedItems, sources.length, offset, limit, format);
    }
    async getLogSourceDetails(args) {
        const { logSourceName, compartmentId, format = 'markdown' } = args;
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
    async listActiveLogSources(args) {
        const { timeRange = '24h', compartmentId, limit = 20, format = 'markdown' } = args;
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
    async listLogFields(args) {
        const { logSourceName, fieldType, isSystem, limit = 20, offset = 0, compartmentId, format = 'markdown' } = args;
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
        let fields = [];
        if (results.data.length > 0) {
            fields = Object.keys(results.data[0]);
        }
        const paginatedFields = fields.slice(offset, offset + limit);
        return this.formatPaginatedResponse('Log Fields', paginatedFields.map(f => ({ fieldName: f })), fields.length, offset, limit, format);
    }
    async getFieldDetails(args) {
        const { fieldName, compartmentId, format = 'markdown' } = args;
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
    async getNamespaceInfo(args) {
        const { compartmentId, format = 'markdown' } = args;
        const connectionStatus = await this.logAnalyticsClient.checkConnection(false);
        return this.formatResponse('Namespace Information', {
            region: connectionStatus.region,
            compartment: compartmentId || DEFAULT_COMPARTMENT_ID || 'Not set',
            connected: connectionStatus.connected,
            authMethod: connectionStatus.authMethod
        }, format);
    }
    async listEntities(args) {
        const { entityType = 'all', compartmentId, limit = 20, offset = 0, format = 'markdown' } = args;
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
        return this.formatPaginatedResponse('Entities', paginatedItems, results.data.length, offset, limit, format);
    }
    async getStorageUsage(args) {
        const { compartmentId, timeRange = '24h', format = 'markdown' } = args;
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
    async listParsers(args) {
        const { parserType = 'all', compartmentId, limit = 20, offset = 0, format = 'markdown' } = args;
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
            parsers = parsers.filter((p) => (p['Parser Type'] || '') === parserType);
        }
        const paginatedItems = parsers.slice(offset, offset + limit);
        return this.formatPaginatedResponse('Parsers', paginatedItems, parsers.length, offset, limit, format);
    }
    async listLabels(args) {
        const { compartmentId, limit = 20, offset = 0, format = 'markdown' } = args;
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
        return this.formatPaginatedResponse('Labels', paginatedItems, results.data.length, offset, limit, format);
    }
    async queryRecentUploads(args) {
        const { timeRange = '24h', limit = 20, compartmentId, format = 'markdown' } = args;
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
    async run() {
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
