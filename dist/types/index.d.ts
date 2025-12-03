/**
 * OCI Logan MCP Server - Type Definitions
 * Following MCP best practices for type safety
 */
export interface ToolResult {
    content: Array<{
        type: 'text' | 'image' | 'resource';
        text?: string;
        data?: string;
        mimeType?: string;
    }>;
    isError?: boolean;
}
export interface PaginatedRequest {
    limit?: number;
    offset?: number;
}
export interface PaginatedResponse<T> {
    total: number;
    count: number;
    offset: number;
    items: T[];
    hasMore: boolean;
    nextOffset: number | null;
}
export type ResponseFormat = 'markdown' | 'json';
export type ErrorCode = 'NOT_FOUND' | 'PERMISSION_DENIED' | 'RATE_LIMITED' | 'TIMEOUT' | 'VALIDATION_ERROR' | 'OCI_ERROR' | 'QUERY_SYNTAX_ERROR' | 'INTERNAL';
export interface OCICompartment {
    id: string;
    name?: string;
}
export interface QueryRequest {
    query: string;
    timeRange?: string;
    compartmentId?: string;
    environment?: string;
    limit?: number;
}
export interface QueryResult {
    success: boolean;
    data: Record<string, unknown>[];
    totalCount: number;
    executionTime: number;
    error?: string;
    arePartialResults?: boolean;
    queryUsed?: string;
}
export interface ToolAnnotations {
    title: string;
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
}
export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations?: ToolAnnotations;
}
export declare const TIME_RANGES: readonly ["1h", "6h", "12h", "24h", "1d", "7d", "30d", "1w", "1m", "90d"];
export type TimeRange = typeof TIME_RANGES[number];
export declare const ANALYSIS_TYPES: readonly ["full", "authentication", "network", "threat_intel", "communication_patterns"];
export type AnalysisType = typeof ANALYSIS_TYPES[number];
export declare const EVENT_TYPES: readonly ["login", "privilege_escalation", "privilege-escalation", "network_anomaly", "data_exfiltration", "malware", "all"];
export type EventType = typeof EVENT_TYPES[number];
export declare const MITRE_CATEGORIES: readonly ["initial_access", "execution", "persistence", "privilege_escalation", "privilege-escalation", "defense_evasion", "credential_access", "discovery", "lateral_movement", "collection", "command_and_control", "exfiltration", "impact", "all"];
export type MitreCategory = typeof MITRE_CATEGORIES[number];
export declare const QUERY_CATEGORIES: readonly ["mitre-attack", "security", "network", "authentication", "privilege_escalation", "privilege-escalation", "advanced_analytics", "statistical_analysis", "compliance_monitoring", "all"];
export type QueryCategory = typeof QUERY_CATEGORIES[number];
export declare const DOC_TOPICS: readonly ["query_syntax", "field_names", "functions", "time_filters", "operators", "mitre_mapping", "examples", "troubleshooting"];
export type DocTopic = typeof DOC_TOPICS[number];
export declare const LIFECYCLE_STATES: readonly ["CREATING", "UPDATING", "ACTIVE", "DELETING", "DELETED", "FAILED"];
export type LifecycleState = typeof LIFECYCLE_STATES[number];
export declare const WIDGET_TYPES: readonly ["LINE_CHART", "BAR_CHART", "PIE_CHART", "TABLE", "METRIC", "TEXT"];
export type WidgetType = typeof WIDGET_TYPES[number];
export declare const SAVED_SEARCH_TYPES: readonly ["SEARCH", "CHART", "TABLE", "METRIC"];
export type SavedSearchType = typeof SAVED_SEARCH_TYPES[number];
export declare const ANALYTICS_TYPES: readonly ["cluster", "link", "nlp", "classify", "outlier", "sequence", "geostats", "timecluster"];
export type AnalyticsType = typeof ANALYTICS_TYPES[number];
export declare const STAT_OPERATIONS: readonly ["stats", "timestats", "eventstats", "top", "bottom", "rare", "distinct"];
export type StatOperation = typeof STAT_OPERATIONS[number];
export declare const FIELD_OPERATIONS: readonly ["extract", "parse", "rename", "eval", "lookup", "split", "concat", "replace"];
export type FieldOperation = typeof FIELD_OPERATIONS[number];
export declare const CORRELATION_TYPES: readonly ["temporal", "entity", "transaction", "session", "custom"];
export type CorrelationType = typeof CORRELATION_TYPES[number];
export declare const ENTITY_TYPES: readonly ["HOST", "DATABASE", "APPLICATION", "WEBSERVER", "CONTAINER", "all"];
export type EntityType = typeof ENTITY_TYPES[number];
export declare const PARSER_TYPES: readonly ["REGEX", "XML", "JSON", "DELIMITED", "all"];
export type ParserType = typeof PARSER_TYPES[number];
export declare const TILE_TYPES: readonly ["all", "query", "visualization", "metric", "text"];
export type TileType = typeof TILE_TYPES[number];
