/**
 * OCI Logan MCP Server - Zod Validation Schemas
 * Following MCP best practices for input validation
 */
import { z } from 'zod';
import { TIME_RANGES, ANALYSIS_TYPES, EVENT_TYPES, MITRE_CATEGORIES, QUERY_CATEGORIES, DOC_TOPICS, LIFECYCLE_STATES, WIDGET_TYPES, SAVED_SEARCH_TYPES, ANALYTICS_TYPES, STAT_OPERATIONS, FIELD_OPERATIONS, CORRELATION_TYPES, ENTITY_TYPES, PARSER_TYPES, TILE_TYPES } from '../types/index.js';
// ============================================
// Common Schemas
// ============================================
/**
 * OCI OCID format validation
 * Format: ocid1.<resource-type>.<realm>.<region>.<unique-id>
 */
export const OCIDSchema = z.string()
    .regex(/^ocid1\.[a-z0-9]+\.(oc[0-9]+|oc1)\.[a-z0-9-]*\.[a-z0-9]+$/i, 'Invalid OCI OCID format. Expected: ocid1.<resource>.<realm>.<region>.<id>');
/**
 * Optional OCID - allows undefined or valid OCID
 */
export const OptionalOCIDSchema = z.string()
    .regex(/^ocid1\.[a-z0-9]+\.(oc[0-9]+|oc1)\.[a-z0-9-]*\.[a-z0-9]+$/i)
    .optional();
/**
 * Compartment ID schema
 */
export const CompartmentIdSchema = z.string()
    .regex(/^ocid1\.compartment\.(oc[0-9]+|oc1)\.[a-z0-9-]*\.[a-z0-9]+$/i, 'Invalid compartment OCID format')
    .optional()
    .describe('OCI compartment OCID');
/**
 * Dashboard ID schema
 */
export const DashboardIdSchema = z.string()
    .regex(/^ocid1\.dashboard\.(oc[0-9]+|oc1)\.[a-z0-9-]*\.[a-z0-9]+$/i, 'Invalid dashboard OCID format')
    .describe('OCI dashboard OCID');
/**
 * Time range schema
 */
export const TimeRangeSchema = z.enum(TIME_RANGES)
    .default('24h')
    .describe('Time range for the query');
/**
 * IP Address validation (IPv4 and IPv6)
 */
export const IPAddressSchema = z.string()
    .refine((ip) => {
    // IPv4
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    // IPv6 (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^([0-9a-fA-F]{1,4}:)*:[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}, { message: 'Invalid IP address format (IPv4 or IPv6)' })
    .describe('IP address to analyze');
/**
 * Query string validation
 */
export const QueryStringSchema = z.string()
    .min(1, 'Query cannot be empty')
    .max(10000, 'Query exceeds maximum length of 10000 characters')
    .describe('OCI Logging Analytics query');
/**
 * Display name validation
 */
export const DisplayNameSchema = z.string()
    .min(1, 'Display name cannot be empty')
    .max(255, 'Display name exceeds maximum length of 255 characters')
    .describe('Display name');
/**
 * Description validation
 */
export const DescriptionSchema = z.string()
    .max(1000, 'Description exceeds maximum length of 1000 characters')
    .optional()
    .describe('Description');
/**
 * Pagination schemas following best practices
 */
export const LimitSchema = z.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20)
    .describe('Maximum number of results (1-100)');
export const OffsetSchema = z.number()
    .int('Offset must be an integer')
    .min(0, 'Offset must be non-negative')
    .default(0)
    .describe('Number of items to skip');
/**
 * Response format schema
 */
export const ResponseFormatSchema = z.enum(['markdown', 'json'])
    .default('markdown')
    .describe('Response format');
// ============================================
// Tool Input Schemas
// ============================================
/**
 * execute_logan_query input schema
 */
export const ExecuteLoganQuerySchema = z.object({
    query: QueryStringSchema,
    queryName: z.string()
        .max(255)
        .optional()
        .describe('Name/identifier for the query'),
    timeRange: TimeRangeSchema,
    compartmentId: CompartmentIdSchema,
    environment: z.string()
        .max(100)
        .optional()
        .describe('Environment name for multi-tenant queries'),
    timeFilter: z.string()
        .regex(/^(dateRelative\([^)]+\)|toDate\([^)]+\))$/, 'Invalid time filter format')
        .optional()
        .describe('Custom time filter using dateRelative() or toDate() functions'),
    format: ResponseFormatSchema
}).strict();
/**
 * search_security_events input schema
 */
export const SearchSecurityEventsSchema = z.object({
    searchTerm: z.string()
        .min(1, 'Search term cannot be empty')
        .max(500, 'Search term exceeds maximum length')
        .describe('Natural language description or specific security event pattern'),
    eventType: z.enum(EVENT_TYPES)
        .default('all')
        .describe('Type of security event'),
    timeRange: TimeRangeSchema,
    limit: LimitSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * get_mitre_techniques input schema
 */
export const GetMitreTechniquesSchema = z.object({
    techniqueId: z.string()
        .regex(/^(T\d{4}(\.\d{3})?|all)$/i, 'Invalid MITRE technique ID format (e.g., T1003, T1003.001, or "all")')
        .optional()
        .describe('Specific MITRE technique ID or "all"'),
    category: z.enum(MITRE_CATEGORIES)
        .default('all')
        .describe('MITRE tactic category'),
    timeRange: z.enum(TIME_RANGES)
        .default('30d')
        .describe('Time range for the analysis'),
    format: ResponseFormatSchema
}).strict();
/**
 * analyze_ip_activity input schema
 */
export const AnalyzeIPActivitySchema = z.object({
    ipAddress: IPAddressSchema,
    analysisType: z.enum(ANALYSIS_TYPES)
        .default('full')
        .describe('Type of analysis to perform'),
    timeRange: TimeRangeSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * get_logan_queries input schema
 */
export const GetLoganQueriesSchema = z.object({
    category: z.enum(QUERY_CATEGORIES)
        .optional()
        .describe('Query category'),
    queryName: z.string()
        .max(255)
        .optional()
        .describe('Specific query name'),
    format: ResponseFormatSchema
}).strict();
/**
 * validate_query input schema
 */
export const ValidateQuerySchema = z.object({
    query: QueryStringSchema,
    fix: z.boolean()
        .default(false)
        .describe('Attempt to automatically fix common syntax errors')
}).strict();
/**
 * get_documentation input schema
 */
export const GetDocumentationSchema = z.object({
    topic: z.enum(DOC_TOPICS)
        .optional()
        .describe('Documentation topic'),
    searchTerm: z.string()
        .max(100)
        .optional()
        .describe('Specific term to search for in documentation')
}).strict();
/**
 * check_oci_connection input schema
 */
export const CheckOCIConnectionSchema = z.object({
    testQuery: z.boolean()
        .default(true)
        .describe('Run a test query to verify connectivity')
}).strict();
/**
 * list_dashboards input schema
 */
export const ListDashboardsSchema = z.object({
    compartmentId: CompartmentIdSchema,
    displayName: z.string()
        .max(255)
        .optional()
        .describe('Filter dashboards by display name (partial match)'),
    lifecycleState: z.enum(LIFECYCLE_STATES)
        .default('ACTIVE')
        .describe('Filter by lifecycle state'),
    limit: LimitSchema,
    offset: OffsetSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * get_dashboard input schema
 */
export const GetDashboardSchema = z.object({
    dashboardId: DashboardIdSchema,
    compartmentId: CompartmentIdSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * get_dashboard_tiles input schema
 */
export const GetDashboardTilesSchema = z.object({
    dashboardId: DashboardIdSchema,
    tileType: z.enum(TILE_TYPES)
        .default('all')
        .describe('Filter tiles by type'),
    format: ResponseFormatSchema
}).strict();
/**
 * Widget position schema
 */
const WidgetPositionSchema = z.object({
    row: z.number().int().min(0),
    column: z.number().int().min(0),
    height: z.number().int().min(1).max(12),
    width: z.number().int().min(1).max(12)
}).optional();
/**
 * Widget configuration schema
 */
const WidgetConfigSchema = z.object({
    displayName: DisplayNameSchema,
    widgetType: z.enum(WIDGET_TYPES),
    query: QueryStringSchema,
    position: WidgetPositionSchema
});
/**
 * create_dashboard input schema
 */
export const CreateDashboardSchema = z.object({
    displayName: DisplayNameSchema,
    description: DescriptionSchema,
    compartmentId: CompartmentIdSchema,
    dashboardConfig: z.object({
        widgets: z.array(WidgetConfigSchema).max(50, 'Maximum 50 widgets per dashboard')
    }).optional()
}).strict();
/**
 * update_dashboard input schema
 */
export const UpdateDashboardSchema = z.object({
    dashboardId: DashboardIdSchema,
    displayName: DisplayNameSchema.optional(),
    description: DescriptionSchema,
    addWidgets: z.array(WidgetConfigSchema)
        .max(50)
        .optional()
        .describe('Widgets to add'),
    removeWidgetIds: z.array(z.string())
        .max(50)
        .optional()
        .describe('Widget IDs to remove')
}).strict();
/**
 * create_saved_search input schema
 */
export const CreateSavedSearchSchema = z.object({
    displayName: DisplayNameSchema,
    query: QueryStringSchema,
    description: DescriptionSchema,
    compartmentId: CompartmentIdSchema,
    widgetType: z.enum(SAVED_SEARCH_TYPES)
        .default('SEARCH')
        .describe('Preferred visualization type')
}).strict();
/**
 * list_saved_searches input schema
 */
export const ListSavedSearchesSchema = z.object({
    compartmentId: CompartmentIdSchema,
    displayName: z.string()
        .max(255)
        .optional()
        .describe('Filter by display name'),
    limit: LimitSchema,
    offset: OffsetSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * export_dashboard input schema
 */
export const ExportDashboardSchema = z.object({
    dashboardId: DashboardIdSchema,
    includeQueries: z.boolean()
        .default(true)
        .describe('Include full query definitions')
}).strict();
/**
 * import_dashboard input schema
 */
export const ImportDashboardSchema = z.object({
    dashboardJson: z.string()
        .min(1)
        .refine((str) => {
        try {
            JSON.parse(str);
            return true;
        }
        catch {
            return false;
        }
    }, { message: 'dashboardJson must be valid JSON' })
        .describe('JSON string containing dashboard configuration'),
    compartmentId: CompartmentIdSchema,
    newDisplayName: DisplayNameSchema.optional()
}).strict();
/**
 * execute_advanced_analytics input schema
 */
export const ExecuteAdvancedAnalyticsSchema = z.object({
    analyticsType: z.enum(ANALYTICS_TYPES)
        .describe('Type of advanced analytics'),
    query: QueryStringSchema.optional(),
    field: z.string()
        .max(255)
        .optional()
        .describe('Field to analyze'),
    parameters: z.record(z.unknown())
        .optional()
        .describe('Additional analytics parameters'),
    timeRange: TimeRangeSchema,
    compartmentId: CompartmentIdSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * execute_statistical_analysis input schema
 */
export const ExecuteStatisticalAnalysisSchema = z.object({
    operation: z.enum(STAT_OPERATIONS)
        .describe('Statistical operation'),
    fields: z.array(z.string().max(255))
        .min(1, 'At least one field required')
        .max(20, 'Maximum 20 fields')
        .describe('Fields for statistical analysis'),
    groupBy: z.array(z.string().max(255))
        .max(10)
        .optional()
        .describe('Fields to group by'),
    query: QueryStringSchema.optional(),
    timeRange: TimeRangeSchema,
    compartmentId: CompartmentIdSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * execute_field_operations input schema
 */
export const ExecuteFieldOperationsSchema = z.object({
    operation: z.enum(FIELD_OPERATIONS)
        .describe('Field operation type'),
    sourceField: z.string()
        .min(1)
        .max(255)
        .describe('Source field name'),
    targetField: z.string()
        .max(255)
        .optional()
        .describe('Target field name'),
    pattern: z.string()
        .max(1000)
        .optional()
        .describe('Regex pattern for extraction'),
    expression: z.string()
        .max(1000)
        .optional()
        .describe('Expression for eval/replace'),
    query: QueryStringSchema.optional(),
    timeRange: TimeRangeSchema,
    compartmentId: CompartmentIdSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * search_log_patterns input schema
 */
export const SearchLogPatternsSchema = z.object({
    pattern: z.string()
        .min(1, 'Pattern cannot be empty')
        .max(1000, 'Pattern exceeds maximum length')
        .describe('Pattern to search for'),
    logSource: z.string()
        .max(255)
        .optional()
        .describe('Filter by log source'),
    field: z.string()
        .max(255)
        .optional()
        .describe('Field to search in'),
    timeRange: TimeRangeSchema,
    limit: LimitSchema,
    compartmentId: CompartmentIdSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * correlation_analysis input schema
 */
export const CorrelationAnalysisSchema = z.object({
    correlationType: z.enum(CORRELATION_TYPES)
        .describe('Type of correlation analysis'),
    primaryField: z.string()
        .min(1)
        .max(255)
        .describe('Primary field for correlation'),
    secondaryFields: z.array(z.string().max(255))
        .min(1)
        .max(10)
        .describe('Secondary fields to correlate'),
    timeWindow: z.string()
        .regex(/^\d+[smhd]$/, 'Invalid time window format (e.g., 5m, 1h, 1d)')
        .optional()
        .describe('Time window for correlation'),
    query: QueryStringSchema.optional(),
    timeRange: TimeRangeSchema,
    compartmentId: CompartmentIdSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * list_log_sources input schema
 */
export const ListLogSourcesSchema = z.object({
    compartmentId: CompartmentIdSchema,
    displayName: z.string()
        .max(255)
        .optional()
        .describe('Filter by display name'),
    isSystem: z.boolean()
        .optional()
        .describe('Filter by system sources'),
    limit: LimitSchema,
    offset: OffsetSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * get_log_source_details input schema
 */
export const GetLogSourceDetailsSchema = z.object({
    logSourceName: z.string()
        .min(1)
        .max(255)
        .describe('Log source name'),
    compartmentId: CompartmentIdSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * list_active_log_sources input schema
 */
export const ListActiveLogSourcesSchema = z.object({
    timeRange: TimeRangeSchema,
    compartmentId: CompartmentIdSchema,
    limit: LimitSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * list_log_fields input schema
 */
export const ListLogFieldsSchema = z.object({
    logSourceName: z.string()
        .max(255)
        .optional()
        .describe('Filter by log source'),
    fieldType: z.string()
        .max(50)
        .optional()
        .describe('Filter by field type'),
    isSystem: z.boolean()
        .optional()
        .describe('Filter by system fields'),
    limit: LimitSchema,
    offset: OffsetSchema,
    compartmentId: CompartmentIdSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * get_field_details input schema
 */
export const GetFieldDetailsSchema = z.object({
    fieldName: z.string()
        .min(1)
        .max(255)
        .describe('Field name'),
    compartmentId: CompartmentIdSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * get_namespace_info input schema
 */
export const GetNamespaceInfoSchema = z.object({
    compartmentId: CompartmentIdSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * list_entities input schema
 */
export const ListEntitiesSchema = z.object({
    entityType: z.enum(ENTITY_TYPES)
        .default('all')
        .describe('Entity type filter'),
    compartmentId: CompartmentIdSchema,
    limit: LimitSchema,
    offset: OffsetSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * get_storage_usage input schema
 */
export const GetStorageUsageSchema = z.object({
    compartmentId: CompartmentIdSchema,
    timeRange: TimeRangeSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * list_parsers input schema
 */
export const ListParsersSchema = z.object({
    parserType: z.enum(PARSER_TYPES)
        .default('all')
        .describe('Parser type filter'),
    compartmentId: CompartmentIdSchema,
    limit: LimitSchema,
    offset: OffsetSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * list_labels input schema
 */
export const ListLabelsSchema = z.object({
    compartmentId: CompartmentIdSchema,
    limit: LimitSchema,
    offset: OffsetSchema,
    format: ResponseFormatSchema
}).strict();
/**
 * query_recent_uploads input schema
 */
export const QueryRecentUploadsSchema = z.object({
    timeRange: z.enum(['1h', '6h', '24h', '7d'])
        .default('24h')
        .describe('Time range for upload history'),
    limit: LimitSchema,
    compartmentId: CompartmentIdSchema,
    format: ResponseFormatSchema
}).strict();
// ============================================
// Schema Registry
// ============================================
/**
 * Map of tool names to their validation schemas
 */
export const ToolSchemas = {
    'oci_logan_execute_query': ExecuteLoganQuerySchema,
    'oci_logan_search_security_events': SearchSecurityEventsSchema,
    'oci_logan_get_mitre_techniques': GetMitreTechniquesSchema,
    'oci_logan_analyze_ip_activity': AnalyzeIPActivitySchema,
    'oci_logan_get_queries': GetLoganQueriesSchema,
    'oci_logan_validate_query': ValidateQuerySchema,
    'oci_logan_get_documentation': GetDocumentationSchema,
    'oci_logan_check_connection': CheckOCIConnectionSchema,
    'oci_logan_list_dashboards': ListDashboardsSchema,
    'oci_logan_get_dashboard': GetDashboardSchema,
    'oci_logan_get_dashboard_tiles': GetDashboardTilesSchema,
    'oci_logan_create_dashboard': CreateDashboardSchema,
    'oci_logan_update_dashboard': UpdateDashboardSchema,
    'oci_logan_create_saved_search': CreateSavedSearchSchema,
    'oci_logan_list_saved_searches': ListSavedSearchesSchema,
    'oci_logan_export_dashboard': ExportDashboardSchema,
    'oci_logan_import_dashboard': ImportDashboardSchema,
    'oci_logan_execute_advanced_analytics': ExecuteAdvancedAnalyticsSchema,
    'oci_logan_execute_statistical_analysis': ExecuteStatisticalAnalysisSchema,
    'oci_logan_execute_field_operations': ExecuteFieldOperationsSchema,
    'oci_logan_search_log_patterns': SearchLogPatternsSchema,
    'oci_logan_correlation_analysis': CorrelationAnalysisSchema,
    'oci_logan_list_log_sources': ListLogSourcesSchema,
    'oci_logan_get_log_source_details': GetLogSourceDetailsSchema,
    'oci_logan_list_active_log_sources': ListActiveLogSourcesSchema,
    'oci_logan_list_log_fields': ListLogFieldsSchema,
    'oci_logan_get_field_details': GetFieldDetailsSchema,
    'oci_logan_get_namespace_info': GetNamespaceInfoSchema,
    'oci_logan_list_entities': ListEntitiesSchema,
    'oci_logan_get_storage_usage': GetStorageUsageSchema,
    'oci_logan_list_parsers': ListParsersSchema,
    'oci_logan_list_labels': ListLabelsSchema,
    'oci_logan_query_recent_uploads': QueryRecentUploadsSchema
};
/**
 * Validate tool input against schema
 */
export function validateToolInput(toolName, input) {
    const schema = ToolSchemas[toolName];
    if (!schema) {
        return { success: false, errors: [`Unknown tool: ${toolName}`] };
    }
    const result = schema.safeParse(input);
    if (result.success) {
        return { success: true, data: result.data };
    }
    const errors = result.error.errors.map(e => {
        const path = e.path.join('.');
        return path ? `${path}: ${e.message}` : e.message;
    });
    return { success: false, errors };
}
