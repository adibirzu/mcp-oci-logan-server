/**
 * OCI Logan MCP Server - Type Definitions
 * Following MCP best practices for type safety
 */
// Time range enum
export const TIME_RANGES = ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'];
// Analysis types
export const ANALYSIS_TYPES = ['full', 'authentication', 'network', 'threat_intel', 'communication_patterns'];
// Event types
export const EVENT_TYPES = ['login', 'privilege_escalation', 'privilege-escalation', 'network_anomaly', 'data_exfiltration', 'malware', 'all'];
// MITRE categories
export const MITRE_CATEGORIES = [
    'initial_access', 'execution', 'persistence', 'privilege_escalation', 'privilege-escalation',
    'defense_evasion', 'credential_access', 'discovery', 'lateral_movement',
    'collection', 'command_and_control', 'exfiltration', 'impact', 'all'
];
// Query categories
export const QUERY_CATEGORIES = [
    'mitre-attack', 'security', 'network', 'authentication', 'privilege_escalation',
    'privilege-escalation', 'advanced_analytics', 'statistical_analysis', 'compliance_monitoring', 'all'
];
// Documentation topics
export const DOC_TOPICS = [
    'query_syntax', 'field_names', 'functions', 'time_filters',
    'operators', 'mitre_mapping', 'examples', 'troubleshooting'
];
// Dashboard lifecycle states
export const LIFECYCLE_STATES = ['CREATING', 'UPDATING', 'ACTIVE', 'DELETING', 'DELETED', 'FAILED'];
// Widget types
export const WIDGET_TYPES = ['LINE_CHART', 'BAR_CHART', 'PIE_CHART', 'TABLE', 'METRIC', 'TEXT'];
// Saved search types
export const SAVED_SEARCH_TYPES = ['SEARCH', 'CHART', 'TABLE', 'METRIC'];
// Analytics types
export const ANALYTICS_TYPES = ['cluster', 'link', 'nlp', 'classify', 'outlier', 'sequence', 'geostats', 'timecluster'];
// Statistical operations
export const STAT_OPERATIONS = ['stats', 'timestats', 'eventstats', 'top', 'bottom', 'rare', 'distinct'];
// Field operations
export const FIELD_OPERATIONS = ['extract', 'parse', 'rename', 'eval', 'lookup', 'split', 'concat', 'replace'];
// Correlation types
export const CORRELATION_TYPES = ['temporal', 'entity', 'transaction', 'session', 'custom'];
// Entity types
export const ENTITY_TYPES = ['HOST', 'DATABASE', 'APPLICATION', 'WEBSERVER', 'CONTAINER', 'all'];
// Parser types
export const PARSER_TYPES = ['REGEX', 'XML', 'JSON', 'DELIMITED', 'all'];
// Tile types
export const TILE_TYPES = ['all', 'query', 'visualization', 'metric', 'text'];
