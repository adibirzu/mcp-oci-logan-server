/**
 * OCI Logan MCP Server - Zod Validation Schemas
 * Following MCP best practices for input validation
 */
import { z } from 'zod';
/**
 * OCI OCID format validation
 * Format: ocid1.<resource-type>.<realm>.<region>.<unique-id>
 */
export declare const OCIDSchema: z.ZodString;
/**
 * Optional OCID - allows undefined or valid OCID
 */
export declare const OptionalOCIDSchema: z.ZodOptional<z.ZodString>;
/**
 * Compartment ID schema
 */
export declare const CompartmentIdSchema: z.ZodOptional<z.ZodString>;
/**
 * Dashboard ID schema
 */
export declare const DashboardIdSchema: z.ZodString;
/**
 * Time range schema
 */
export declare const TimeRangeSchema: z.ZodDefault<z.ZodEnum<["1h", "6h", "12h", "24h", "1d", "7d", "30d", "1w", "1m", "90d"]>>;
/**
 * IP Address validation (IPv4 and IPv6)
 */
export declare const IPAddressSchema: z.ZodEffects<z.ZodString, string, string>;
/**
 * Query string validation
 */
export declare const QueryStringSchema: z.ZodString;
/**
 * Display name validation
 */
export declare const DisplayNameSchema: z.ZodString;
/**
 * Description validation
 */
export declare const DescriptionSchema: z.ZodOptional<z.ZodString>;
/**
 * Pagination schemas following best practices
 */
export declare const LimitSchema: z.ZodDefault<z.ZodNumber>;
export declare const OffsetSchema: z.ZodDefault<z.ZodNumber>;
/**
 * Response format schema
 */
export declare const ResponseFormatSchema: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
/**
 * execute_logan_query input schema
 */
export declare const ExecuteLoganQuerySchema: z.ZodObject<{
    query: z.ZodString;
    queryName: z.ZodOptional<z.ZodString>;
    timeRange: z.ZodDefault<z.ZodEnum<["1h", "6h", "12h", "24h", "1d", "7d", "30d", "1w", "1m", "90d"]>>;
    compartmentId: z.ZodOptional<z.ZodString>;
    environment: z.ZodOptional<z.ZodString>;
    timeFilter: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    query?: string;
    compartmentId?: string;
    queryName?: string;
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    environment?: string;
    timeFilter?: string;
    format?: "markdown" | "json";
}, {
    query?: string;
    compartmentId?: string;
    queryName?: string;
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    environment?: string;
    timeFilter?: string;
    format?: "markdown" | "json";
}>;
/**
 * search_security_events input schema
 */
export declare const SearchSecurityEventsSchema: z.ZodObject<{
    searchTerm: z.ZodString;
    eventType: z.ZodDefault<z.ZodEnum<["login", "privilege_escalation", "privilege-escalation", "network_anomaly", "data_exfiltration", "malware", "all"]>>;
    timeRange: z.ZodDefault<z.ZodEnum<["1h", "6h", "12h", "24h", "1d", "7d", "30d", "1w", "1m", "90d"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    searchTerm?: string;
    eventType?: "privilege-escalation" | "privilege_escalation" | "login" | "network_anomaly" | "malware" | "data_exfiltration" | "all";
    limit?: number;
}, {
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    searchTerm?: string;
    eventType?: "privilege-escalation" | "privilege_escalation" | "login" | "network_anomaly" | "malware" | "data_exfiltration" | "all";
    limit?: number;
}>;
/**
 * get_mitre_techniques input schema
 */
export declare const GetMitreTechniquesSchema: z.ZodObject<{
    techniqueId: z.ZodOptional<z.ZodString>;
    category: z.ZodDefault<z.ZodEnum<["initial_access", "execution", "persistence", "privilege_escalation", "privilege-escalation", "defense_evasion", "credential_access", "discovery", "lateral_movement", "collection", "command_and_control", "exfiltration", "impact", "all"]>>;
    timeRange: z.ZodDefault<z.ZodEnum<["1h", "6h", "12h", "24h", "1d", "7d", "30d", "1w", "1m", "90d"]>>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    category?: "privilege-escalation" | "privilege_escalation" | "exfiltration" | "initial_access" | "execution" | "persistence" | "defense_evasion" | "credential_access" | "discovery" | "lateral_movement" | "collection" | "command_and_control" | "impact" | "all";
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    techniqueId?: string;
}, {
    category?: "privilege-escalation" | "privilege_escalation" | "exfiltration" | "initial_access" | "execution" | "persistence" | "defense_evasion" | "credential_access" | "discovery" | "lateral_movement" | "collection" | "command_and_control" | "impact" | "all";
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    techniqueId?: string;
}>;
/**
 * analyze_ip_activity input schema
 */
export declare const AnalyzeIPActivitySchema: z.ZodObject<{
    ipAddress: z.ZodEffects<z.ZodString, string, string>;
    analysisType: z.ZodDefault<z.ZodEnum<["full", "authentication", "network", "threat_intel", "communication_patterns"]>>;
    timeRange: z.ZodDefault<z.ZodEnum<["1h", "6h", "12h", "24h", "1d", "7d", "30d", "1w", "1m", "90d"]>>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    ipAddress?: string;
    analysisType?: "network" | "authentication" | "full" | "threat_intel" | "communication_patterns";
}, {
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    ipAddress?: string;
    analysisType?: "network" | "authentication" | "full" | "threat_intel" | "communication_patterns";
}>;
/**
 * get_logan_queries input schema
 */
export declare const GetLoganQueriesSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodEnum<["mitre-attack", "security", "network", "authentication", "privilege_escalation", "privilege-escalation", "advanced_analytics", "statistical_analysis", "compliance_monitoring", "all"]>>;
    queryName: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    category?: "privilege-escalation" | "privilege_escalation" | "mitre-attack" | "security" | "network" | "authentication" | "advanced_analytics" | "statistical_analysis" | "compliance_monitoring" | "all";
    queryName?: string;
    format?: "markdown" | "json";
}, {
    category?: "privilege-escalation" | "privilege_escalation" | "mitre-attack" | "security" | "network" | "authentication" | "advanced_analytics" | "statistical_analysis" | "compliance_monitoring" | "all";
    queryName?: string;
    format?: "markdown" | "json";
}>;
/**
 * validate_query input schema
 */
export declare const ValidateQuerySchema: z.ZodObject<{
    query: z.ZodString;
    fix: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    query?: string;
    fix?: boolean;
}, {
    query?: string;
    fix?: boolean;
}>;
/**
 * get_documentation input schema
 */
export declare const GetDocumentationSchema: z.ZodObject<{
    topic: z.ZodOptional<z.ZodEnum<["query_syntax", "field_names", "functions", "time_filters", "operators", "mitre_mapping", "examples", "troubleshooting"]>>;
    searchTerm: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    searchTerm?: string;
    topic?: "query_syntax" | "field_names" | "functions" | "time_filters" | "operators" | "mitre_mapping" | "examples" | "troubleshooting";
}, {
    searchTerm?: string;
    topic?: "query_syntax" | "field_names" | "functions" | "time_filters" | "operators" | "mitre_mapping" | "examples" | "troubleshooting";
}>;
/**
 * check_oci_connection input schema
 */
export declare const CheckOCIConnectionSchema: z.ZodObject<{
    testQuery: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    testQuery?: boolean;
}, {
    testQuery?: boolean;
}>;
/**
 * list_dashboards input schema
 */
export declare const ListDashboardsSchema: z.ZodObject<{
    compartmentId: z.ZodOptional<z.ZodString>;
    displayName: z.ZodOptional<z.ZodString>;
    lifecycleState: z.ZodDefault<z.ZodEnum<["CREATING", "UPDATING", "ACTIVE", "DELETING", "DELETED", "FAILED"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    format?: "markdown" | "json";
    limit?: number;
    displayName?: string;
    lifecycleState?: "ACTIVE" | "CREATING" | "UPDATING" | "DELETING" | "DELETED" | "FAILED";
    offset?: number;
}, {
    compartmentId?: string;
    format?: "markdown" | "json";
    limit?: number;
    displayName?: string;
    lifecycleState?: "ACTIVE" | "CREATING" | "UPDATING" | "DELETING" | "DELETED" | "FAILED";
    offset?: number;
}>;
/**
 * get_dashboard input schema
 */
export declare const GetDashboardSchema: z.ZodObject<{
    dashboardId: z.ZodString;
    compartmentId: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    format?: "markdown" | "json";
    dashboardId?: string;
}, {
    compartmentId?: string;
    format?: "markdown" | "json";
    dashboardId?: string;
}>;
/**
 * get_dashboard_tiles input schema
 */
export declare const GetDashboardTilesSchema: z.ZodObject<{
    dashboardId: z.ZodString;
    tileType: z.ZodDefault<z.ZodEnum<["all", "query", "visualization", "metric", "text"]>>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    format?: "markdown" | "json";
    dashboardId?: string;
    tileType?: "text" | "query" | "all" | "visualization" | "metric";
}, {
    format?: "markdown" | "json";
    dashboardId?: string;
    tileType?: "text" | "query" | "all" | "visualization" | "metric";
}>;
/**
 * create_dashboard input schema
 */
export declare const CreateDashboardSchema: z.ZodObject<{
    displayName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    compartmentId: z.ZodOptional<z.ZodString>;
    dashboardConfig: z.ZodOptional<z.ZodObject<{
        widgets: z.ZodArray<z.ZodObject<{
            displayName: z.ZodString;
            widgetType: z.ZodEnum<["LINE_CHART", "BAR_CHART", "PIE_CHART", "TABLE", "METRIC", "TEXT"]>;
            query: z.ZodString;
            position: z.ZodOptional<z.ZodObject<{
                row: z.ZodNumber;
                column: z.ZodNumber;
                height: z.ZodNumber;
                width: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                row?: number;
                column?: number;
                height?: number;
                width?: number;
            }, {
                row?: number;
                column?: number;
                height?: number;
                width?: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            query?: string;
            displayName?: string;
            widgetType?: "TABLE" | "LINE_CHART" | "PIE_CHART" | "BAR_CHART" | "METRIC" | "TEXT";
            position?: {
                row?: number;
                column?: number;
                height?: number;
                width?: number;
            };
        }, {
            query?: string;
            displayName?: string;
            widgetType?: "TABLE" | "LINE_CHART" | "PIE_CHART" | "BAR_CHART" | "METRIC" | "TEXT";
            position?: {
                row?: number;
                column?: number;
                height?: number;
                width?: number;
            };
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        widgets?: {
            query?: string;
            displayName?: string;
            widgetType?: "TABLE" | "LINE_CHART" | "PIE_CHART" | "BAR_CHART" | "METRIC" | "TEXT";
            position?: {
                row?: number;
                column?: number;
                height?: number;
                width?: number;
            };
        }[];
    }, {
        widgets?: {
            query?: string;
            displayName?: string;
            widgetType?: "TABLE" | "LINE_CHART" | "PIE_CHART" | "BAR_CHART" | "METRIC" | "TEXT";
            position?: {
                row?: number;
                column?: number;
                height?: number;
                width?: number;
            };
        }[];
    }>>;
}, "strict", z.ZodTypeAny, {
    description?: string;
    compartmentId?: string;
    displayName?: string;
    dashboardConfig?: {
        widgets?: {
            query?: string;
            displayName?: string;
            widgetType?: "TABLE" | "LINE_CHART" | "PIE_CHART" | "BAR_CHART" | "METRIC" | "TEXT";
            position?: {
                row?: number;
                column?: number;
                height?: number;
                width?: number;
            };
        }[];
    };
}, {
    description?: string;
    compartmentId?: string;
    displayName?: string;
    dashboardConfig?: {
        widgets?: {
            query?: string;
            displayName?: string;
            widgetType?: "TABLE" | "LINE_CHART" | "PIE_CHART" | "BAR_CHART" | "METRIC" | "TEXT";
            position?: {
                row?: number;
                column?: number;
                height?: number;
                width?: number;
            };
        }[];
    };
}>;
/**
 * update_dashboard input schema
 */
export declare const UpdateDashboardSchema: z.ZodObject<{
    dashboardId: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    addWidgets: z.ZodOptional<z.ZodArray<z.ZodObject<{
        displayName: z.ZodString;
        widgetType: z.ZodEnum<["LINE_CHART", "BAR_CHART", "PIE_CHART", "TABLE", "METRIC", "TEXT"]>;
        query: z.ZodString;
        position: z.ZodOptional<z.ZodObject<{
            row: z.ZodNumber;
            column: z.ZodNumber;
            height: z.ZodNumber;
            width: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            row?: number;
            column?: number;
            height?: number;
            width?: number;
        }, {
            row?: number;
            column?: number;
            height?: number;
            width?: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        query?: string;
        displayName?: string;
        widgetType?: "TABLE" | "LINE_CHART" | "PIE_CHART" | "BAR_CHART" | "METRIC" | "TEXT";
        position?: {
            row?: number;
            column?: number;
            height?: number;
            width?: number;
        };
    }, {
        query?: string;
        displayName?: string;
        widgetType?: "TABLE" | "LINE_CHART" | "PIE_CHART" | "BAR_CHART" | "METRIC" | "TEXT";
        position?: {
            row?: number;
            column?: number;
            height?: number;
            width?: number;
        };
    }>, "many">>;
    removeWidgetIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    description?: string;
    displayName?: string;
    dashboardId?: string;
    addWidgets?: {
        query?: string;
        displayName?: string;
        widgetType?: "TABLE" | "LINE_CHART" | "PIE_CHART" | "BAR_CHART" | "METRIC" | "TEXT";
        position?: {
            row?: number;
            column?: number;
            height?: number;
            width?: number;
        };
    }[];
    removeWidgetIds?: string[];
}, {
    description?: string;
    displayName?: string;
    dashboardId?: string;
    addWidgets?: {
        query?: string;
        displayName?: string;
        widgetType?: "TABLE" | "LINE_CHART" | "PIE_CHART" | "BAR_CHART" | "METRIC" | "TEXT";
        position?: {
            row?: number;
            column?: number;
            height?: number;
            width?: number;
        };
    }[];
    removeWidgetIds?: string[];
}>;
/**
 * create_saved_search input schema
 */
export declare const CreateSavedSearchSchema: z.ZodObject<{
    displayName: z.ZodString;
    query: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    compartmentId: z.ZodOptional<z.ZodString>;
    widgetType: z.ZodDefault<z.ZodEnum<["SEARCH", "CHART", "TABLE", "METRIC"]>>;
}, "strict", z.ZodTypeAny, {
    description?: string;
    query?: string;
    compartmentId?: string;
    displayName?: string;
    widgetType?: "SEARCH" | "TABLE" | "METRIC" | "CHART";
}, {
    description?: string;
    query?: string;
    compartmentId?: string;
    displayName?: string;
    widgetType?: "SEARCH" | "TABLE" | "METRIC" | "CHART";
}>;
/**
 * list_saved_searches input schema
 */
export declare const ListSavedSearchesSchema: z.ZodObject<{
    compartmentId: z.ZodOptional<z.ZodString>;
    displayName: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    format?: "markdown" | "json";
    limit?: number;
    displayName?: string;
    offset?: number;
}, {
    compartmentId?: string;
    format?: "markdown" | "json";
    limit?: number;
    displayName?: string;
    offset?: number;
}>;
/**
 * export_dashboard input schema
 */
export declare const ExportDashboardSchema: z.ZodObject<{
    dashboardId: z.ZodString;
    includeQueries: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    dashboardId?: string;
    includeQueries?: boolean;
}, {
    dashboardId?: string;
    includeQueries?: boolean;
}>;
/**
 * import_dashboard input schema
 */
export declare const ImportDashboardSchema: z.ZodObject<{
    dashboardJson: z.ZodEffects<z.ZodString, string, string>;
    compartmentId: z.ZodOptional<z.ZodString>;
    newDisplayName: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    dashboardJson?: string;
    newDisplayName?: string;
}, {
    compartmentId?: string;
    dashboardJson?: string;
    newDisplayName?: string;
}>;
/**
 * execute_advanced_analytics input schema
 */
export declare const ExecuteAdvancedAnalyticsSchema: z.ZodObject<{
    analyticsType: z.ZodEnum<["cluster", "link", "nlp", "classify", "outlier", "sequence", "geostats", "timecluster"]>;
    query: z.ZodOptional<z.ZodString>;
    field: z.ZodOptional<z.ZodString>;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    timeRange: z.ZodDefault<z.ZodEnum<["1h", "6h", "12h", "24h", "1d", "7d", "30d", "1w", "1m", "90d"]>>;
    compartmentId: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    query?: string;
    compartmentId?: string;
    field?: string;
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    analyticsType?: "link" | "cluster" | "nlp" | "classify" | "outlier" | "sequence" | "geostats" | "timecluster";
    parameters?: Record<string, unknown>;
}, {
    query?: string;
    compartmentId?: string;
    field?: string;
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    analyticsType?: "link" | "cluster" | "nlp" | "classify" | "outlier" | "sequence" | "geostats" | "timecluster";
    parameters?: Record<string, unknown>;
}>;
/**
 * execute_statistical_analysis input schema
 */
export declare const ExecuteStatisticalAnalysisSchema: z.ZodObject<{
    operation: z.ZodEnum<["stats", "timestats", "eventstats", "top", "bottom", "rare", "distinct"]>;
    fields: z.ZodArray<z.ZodString, "many">;
    groupBy: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    query: z.ZodOptional<z.ZodString>;
    timeRange: z.ZodDefault<z.ZodEnum<["1h", "6h", "12h", "24h", "1d", "7d", "30d", "1w", "1m", "90d"]>>;
    compartmentId: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    query?: string;
    compartmentId?: string;
    operation?: "stats" | "timestats" | "distinct" | "top" | "bottom" | "eventstats" | "rare";
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    fields?: string[];
    groupBy?: string[];
}, {
    query?: string;
    compartmentId?: string;
    operation?: "stats" | "timestats" | "distinct" | "top" | "bottom" | "eventstats" | "rare";
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    fields?: string[];
    groupBy?: string[];
}>;
/**
 * execute_field_operations input schema
 */
export declare const ExecuteFieldOperationsSchema: z.ZodObject<{
    operation: z.ZodEnum<["extract", "parse", "rename", "eval", "lookup", "split", "concat", "replace"]>;
    sourceField: z.ZodString;
    targetField: z.ZodOptional<z.ZodString>;
    pattern: z.ZodOptional<z.ZodString>;
    expression: z.ZodOptional<z.ZodString>;
    query: z.ZodOptional<z.ZodString>;
    timeRange: z.ZodDefault<z.ZodEnum<["1h", "6h", "12h", "24h", "1d", "7d", "30d", "1w", "1m", "90d"]>>;
    compartmentId: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    query?: string;
    compartmentId?: string;
    operation?: "concat" | "replace" | "split" | "eval" | "lookup" | "extract" | "parse" | "rename";
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    sourceField?: string;
    targetField?: string;
    pattern?: string;
    expression?: string;
}, {
    query?: string;
    compartmentId?: string;
    operation?: "concat" | "replace" | "split" | "eval" | "lookup" | "extract" | "parse" | "rename";
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    sourceField?: string;
    targetField?: string;
    pattern?: string;
    expression?: string;
}>;
/**
 * search_log_patterns input schema
 */
export declare const SearchLogPatternsSchema: z.ZodObject<{
    pattern: z.ZodString;
    logSource: z.ZodOptional<z.ZodString>;
    field: z.ZodOptional<z.ZodString>;
    timeRange: z.ZodDefault<z.ZodEnum<["1h", "6h", "12h", "24h", "1d", "7d", "30d", "1w", "1m", "90d"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    compartmentId: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    field?: string;
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    limit?: number;
    pattern?: string;
    logSource?: string;
}, {
    compartmentId?: string;
    field?: string;
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    limit?: number;
    pattern?: string;
    logSource?: string;
}>;
/**
 * correlation_analysis input schema
 */
export declare const CorrelationAnalysisSchema: z.ZodObject<{
    correlationType: z.ZodEnum<["temporal", "entity", "transaction", "session", "custom"]>;
    primaryField: z.ZodString;
    secondaryFields: z.ZodArray<z.ZodString, "many">;
    timeWindow: z.ZodOptional<z.ZodString>;
    query: z.ZodOptional<z.ZodString>;
    timeRange: z.ZodDefault<z.ZodEnum<["1h", "6h", "12h", "24h", "1d", "7d", "30d", "1w", "1m", "90d"]>>;
    compartmentId: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    query?: string;
    compartmentId?: string;
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    correlationType?: "session" | "temporal" | "entity" | "transaction" | "custom";
    primaryField?: string;
    secondaryFields?: string[];
    timeWindow?: string;
}, {
    query?: string;
    compartmentId?: string;
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    correlationType?: "session" | "temporal" | "entity" | "transaction" | "custom";
    primaryField?: string;
    secondaryFields?: string[];
    timeWindow?: string;
}>;
/**
 * list_log_sources input schema
 */
export declare const ListLogSourcesSchema: z.ZodObject<{
    compartmentId: z.ZodOptional<z.ZodString>;
    displayName: z.ZodOptional<z.ZodString>;
    isSystem: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    format?: "markdown" | "json";
    limit?: number;
    displayName?: string;
    offset?: number;
    isSystem?: boolean;
}, {
    compartmentId?: string;
    format?: "markdown" | "json";
    limit?: number;
    displayName?: string;
    offset?: number;
    isSystem?: boolean;
}>;
/**
 * get_log_source_details input schema
 */
export declare const GetLogSourceDetailsSchema: z.ZodObject<{
    logSourceName: z.ZodString;
    compartmentId: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    format?: "markdown" | "json";
    logSourceName?: string;
}, {
    compartmentId?: string;
    format?: "markdown" | "json";
    logSourceName?: string;
}>;
/**
 * list_active_log_sources input schema
 */
export declare const ListActiveLogSourcesSchema: z.ZodObject<{
    timeRange: z.ZodDefault<z.ZodEnum<["1h", "6h", "12h", "24h", "1d", "7d", "30d", "1w", "1m", "90d"]>>;
    compartmentId: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    limit?: number;
}, {
    compartmentId?: string;
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
    limit?: number;
}>;
/**
 * list_log_fields input schema
 */
export declare const ListLogFieldsSchema: z.ZodObject<{
    logSourceName: z.ZodOptional<z.ZodString>;
    fieldType: z.ZodOptional<z.ZodString>;
    isSystem: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    compartmentId: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    format?: "markdown" | "json";
    limit?: number;
    offset?: number;
    isSystem?: boolean;
    logSourceName?: string;
    fieldType?: string;
}, {
    compartmentId?: string;
    format?: "markdown" | "json";
    limit?: number;
    offset?: number;
    isSystem?: boolean;
    logSourceName?: string;
    fieldType?: string;
}>;
/**
 * get_field_details input schema
 */
export declare const GetFieldDetailsSchema: z.ZodObject<{
    fieldName: z.ZodString;
    compartmentId: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    format?: "markdown" | "json";
    fieldName?: string;
}, {
    compartmentId?: string;
    format?: "markdown" | "json";
    fieldName?: string;
}>;
/**
 * get_namespace_info input schema
 */
export declare const GetNamespaceInfoSchema: z.ZodObject<{
    compartmentId: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    format?: "markdown" | "json";
}, {
    compartmentId?: string;
    format?: "markdown" | "json";
}>;
/**
 * list_entities input schema
 */
export declare const ListEntitiesSchema: z.ZodObject<{
    entityType: z.ZodDefault<z.ZodEnum<["HOST", "DATABASE", "APPLICATION", "WEBSERVER", "CONTAINER", "all"]>>;
    compartmentId: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    format?: "markdown" | "json";
    limit?: number;
    offset?: number;
    entityType?: "all" | "HOST" | "DATABASE" | "APPLICATION" | "WEBSERVER" | "CONTAINER";
}, {
    compartmentId?: string;
    format?: "markdown" | "json";
    limit?: number;
    offset?: number;
    entityType?: "all" | "HOST" | "DATABASE" | "APPLICATION" | "WEBSERVER" | "CONTAINER";
}>;
/**
 * get_storage_usage input schema
 */
export declare const GetStorageUsageSchema: z.ZodObject<{
    compartmentId: z.ZodOptional<z.ZodString>;
    timeRange: z.ZodDefault<z.ZodEnum<["1h", "6h", "12h", "24h", "1d", "7d", "30d", "1w", "1m", "90d"]>>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
}, {
    compartmentId?: string;
    timeRange?: "24h" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1w" | "1m" | "90d";
    format?: "markdown" | "json";
}>;
/**
 * list_parsers input schema
 */
export declare const ListParsersSchema: z.ZodObject<{
    parserType: z.ZodDefault<z.ZodEnum<["REGEX", "XML", "JSON", "DELIMITED", "all"]>>;
    compartmentId: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    format?: "markdown" | "json";
    limit?: number;
    offset?: number;
    parserType?: "all" | "REGEX" | "XML" | "JSON" | "DELIMITED";
}, {
    compartmentId?: string;
    format?: "markdown" | "json";
    limit?: number;
    offset?: number;
    parserType?: "all" | "REGEX" | "XML" | "JSON" | "DELIMITED";
}>;
/**
 * list_labels input schema
 */
export declare const ListLabelsSchema: z.ZodObject<{
    compartmentId: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    format?: "markdown" | "json";
    limit?: number;
    offset?: number;
}, {
    compartmentId?: string;
    format?: "markdown" | "json";
    limit?: number;
    offset?: number;
}>;
/**
 * query_recent_uploads input schema
 */
export declare const QueryRecentUploadsSchema: z.ZodObject<{
    timeRange: z.ZodDefault<z.ZodEnum<["1h", "6h", "24h", "7d"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    compartmentId: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
}, "strict", z.ZodTypeAny, {
    compartmentId?: string;
    timeRange?: "24h" | "1h" | "6h" | "7d";
    format?: "markdown" | "json";
    limit?: number;
}, {
    compartmentId?: string;
    timeRange?: "24h" | "1h" | "6h" | "7d";
    format?: "markdown" | "json";
    limit?: number;
}>;
/**
 * Map of tool names to their validation schemas
 */
export declare const ToolSchemas: Record<string, z.ZodObject<z.ZodRawShape>>;
/**
 * Validate tool input against schema
 */
export declare function validateToolInput<T>(toolName: string, input: unknown): {
    success: true;
    data: T;
} | {
    success: false;
    errors: string[];
};
