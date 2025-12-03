/**
 * OCI Logan MCP Server - Type Definitions
 * Following MCP best practices for type safety
 */

// Tool result types
export interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// Pagination types following best practices
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

// Response format enum
export type ResponseFormat = 'markdown' | 'json';

// Error codes following best practices
export type ErrorCode =
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'VALIDATION_ERROR'
  | 'OCI_ERROR'
  | 'QUERY_SYNTAX_ERROR'
  | 'INTERNAL';

// OCI-specific types
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

// Tool annotation types following MCP best practices
export interface ToolAnnotations {
  title: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

// Tool definition with annotations
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: ToolAnnotations;
}

// Time range enum
export const TIME_RANGES = ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'] as const;
export type TimeRange = typeof TIME_RANGES[number];

// Analysis types
export const ANALYSIS_TYPES = ['full', 'authentication', 'network', 'threat_intel', 'communication_patterns'] as const;
export type AnalysisType = typeof ANALYSIS_TYPES[number];

// Event types
export const EVENT_TYPES = ['login', 'privilege_escalation', 'privilege-escalation', 'network_anomaly', 'data_exfiltration', 'malware', 'all'] as const;
export type EventType = typeof EVENT_TYPES[number];

// MITRE categories
export const MITRE_CATEGORIES = [
  'initial_access', 'execution', 'persistence', 'privilege_escalation', 'privilege-escalation',
  'defense_evasion', 'credential_access', 'discovery', 'lateral_movement',
  'collection', 'command_and_control', 'exfiltration', 'impact', 'all'
] as const;
export type MitreCategory = typeof MITRE_CATEGORIES[number];

// Query categories
export const QUERY_CATEGORIES = [
  'mitre-attack', 'security', 'network', 'authentication', 'privilege_escalation',
  'privilege-escalation', 'advanced_analytics', 'statistical_analysis', 'compliance_monitoring', 'all'
] as const;
export type QueryCategory = typeof QUERY_CATEGORIES[number];

// Documentation topics
export const DOC_TOPICS = [
  'query_syntax', 'field_names', 'functions', 'time_filters',
  'operators', 'mitre_mapping', 'examples', 'troubleshooting'
] as const;
export type DocTopic = typeof DOC_TOPICS[number];

// Dashboard lifecycle states
export const LIFECYCLE_STATES = ['CREATING', 'UPDATING', 'ACTIVE', 'DELETING', 'DELETED', 'FAILED'] as const;
export type LifecycleState = typeof LIFECYCLE_STATES[number];

// Widget types
export const WIDGET_TYPES = ['LINE_CHART', 'BAR_CHART', 'PIE_CHART', 'TABLE', 'METRIC', 'TEXT'] as const;
export type WidgetType = typeof WIDGET_TYPES[number];

// Saved search types
export const SAVED_SEARCH_TYPES = ['SEARCH', 'CHART', 'TABLE', 'METRIC'] as const;
export type SavedSearchType = typeof SAVED_SEARCH_TYPES[number];

// Analytics types
export const ANALYTICS_TYPES = ['cluster', 'link', 'nlp', 'classify', 'outlier', 'sequence', 'geostats', 'timecluster'] as const;
export type AnalyticsType = typeof ANALYTICS_TYPES[number];

// Statistical operations
export const STAT_OPERATIONS = ['stats', 'timestats', 'eventstats', 'top', 'bottom', 'rare', 'distinct'] as const;
export type StatOperation = typeof STAT_OPERATIONS[number];

// Field operations
export const FIELD_OPERATIONS = ['extract', 'parse', 'rename', 'eval', 'lookup', 'split', 'concat', 'replace'] as const;
export type FieldOperation = typeof FIELD_OPERATIONS[number];

// Correlation types
export const CORRELATION_TYPES = ['temporal', 'entity', 'transaction', 'session', 'custom'] as const;
export type CorrelationType = typeof CORRELATION_TYPES[number];

// Entity types
export const ENTITY_TYPES = ['HOST', 'DATABASE', 'APPLICATION', 'WEBSERVER', 'CONTAINER', 'all'] as const;
export type EntityType = typeof ENTITY_TYPES[number];

// Parser types
export const PARSER_TYPES = ['REGEX', 'XML', 'JSON', 'DELIMITED', 'all'] as const;
export type ParserType = typeof PARSER_TYPES[number];

// Tile types
export const TILE_TYPES = ['all', 'query', 'visualization', 'metric', 'text'] as const;
export type TileType = typeof TILE_TYPES[number];
