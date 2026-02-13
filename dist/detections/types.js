/**
 * Detection Catalog Types
 * Matches the JSON schema from oci-log-analytics-detections/queries/
 */
// Detection severity levels
export const DETECTION_LEVELS = ['critical', 'high', 'medium', 'low', 'informational'];
// Supported platforms
export const PLATFORMS = ['oci', 'linux', 'windows'];
// Hunting query methodology types
export const HUNTING_TYPES = [
    'frequency_analysis', 'rare_value', 'scoring', 'temporal',
    'anomaly', 'field_analysis', 'grouping', 'combined'
];
// Cookbook methods
export const COOKBOOK_METHODS = ['sorting_stacking', 'combined', 'correlation'];
