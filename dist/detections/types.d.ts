/**
 * Detection Catalog Types
 * Matches the JSON schema from oci-log-analytics-detections/queries/
 */
export declare const DETECTION_LEVELS: readonly ["critical", "high", "medium", "low", "informational"];
export type DetectionLevel = typeof DETECTION_LEVELS[number];
export declare const PLATFORMS: readonly ["oci", "linux", "windows"];
export type Platform = typeof PLATFORMS[number];
export declare const HUNTING_TYPES: readonly ["frequency_analysis", "rare_value", "scoring", "temporal", "anomaly", "field_analysis", "grouping", "combined"];
export type HuntingType = typeof HUNTING_TYPES[number];
export declare const COOKBOOK_METHODS: readonly ["sorting_stacking", "combined", "correlation"];
export type CookbookMethod = typeof COOKBOOK_METHODS[number];
/** MITRE ATT&CK mapping embedded in each rule */
export interface MitreAttack {
    tactics: string[];
    techniques: string[];
}
/** Log source metadata */
export interface LogSource {
    product: string;
    service: string;
}
/** Full detection rule as stored in individual JSON files */
export interface DetectionRule {
    title: string;
    description: string;
    query: string;
    sigma_id?: string;
    level: DetectionLevel;
    stig_category?: string;
    tags: string[];
    mitre_attack: MitreAttack;
    logsource: LogSource;
    stig_ids?: string[];
    falsepositives: string[];
}
/** Hunting query extends detection rule with hunting-specific fields */
export interface HuntingQuery extends DetectionRule {
    hunting_type: HuntingType;
    cookbook_method: CookbookMethod;
}
/** Compact rule entry from catalog.json */
export interface CatalogEntry {
    title: string;
    description: string;
    level: DetectionLevel;
    platform: Platform;
    mitre_techniques: string[];
    mitre_tactics: string[];
    stig_ids: string[];
    stig_category?: string;
    file: string;
}
/** catalog.json top-level structure */
export interface CatalogManifest {
    version: string;
    total_rules: number;
    total_hunting: number;
    platforms: Record<string, number>;
    severities: Record<string, number>;
    mitre_techniques: string[];
    mitre_tactics: string[];
    stig_controls: string[];
    rules: CatalogEntry[];
}
/** Summary returned by the catalog for resource consumption */
export interface CatalogSummary {
    version: string;
    totalRules: number;
    totalHunting: number;
    platforms: Record<string, number>;
    severities: Record<string, number>;
    mitreTechniques: number;
    mitreTactics: number;
    stigControls: number;
    loaded: boolean;
}
/** Compact rule representation for list operations (~50 bytes/rule) */
export interface CompactRule {
    id: string;
    title: string;
    level: DetectionLevel;
    platform: Platform;
}
/** Filter criteria for searching rules */
export interface DetectionFilter {
    platform?: Platform;
    level?: DetectionLevel;
    mitreTechnique?: string;
    mitreTactic?: string;
    stigCategory?: string;
    keyword?: string;
}
