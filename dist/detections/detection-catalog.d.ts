/**
 * Detection Catalog Engine
 *
 * Runtime-loads detection rules from oci-log-analytics-detections/queries/.
 * Builds in-memory indexes for O(1) lookups by id, platform, level, MITRE, STIG.
 * Degrades gracefully to an empty catalog if the path is unavailable.
 */
import { DetectionRule, HuntingQuery, CatalogSummary, CompactRule, DetectionFilter } from './types.js';
export declare class DetectionCatalog {
    private rulesPath;
    private catalog;
    private loaded;
    private rulesById;
    private rulesByPlatform;
    private rulesByLevel;
    private rulesByTechnique;
    private rulesByTactic;
    private rulesByStigCategory;
    private huntingFiles;
    constructor();
    /** Load catalog.json and build indexes. Safe to call multiple times. */
    initialize(): Promise<void>;
    /** Infer platform from filename convention */
    private inferPlatform;
    /** Get a full detection rule by ID (reads from disk on demand) */
    getRule(id: string): DetectionRule | null;
    /** Get a full hunting query by ID (reads from disk on demand) */
    getHuntingQuery(id: string): HuntingQuery | null;
    /** Search rules by multiple filter criteria */
    searchRules(filter: DetectionFilter): CompactRule[];
    /** Compact list of all rules (~50 bytes/rule) */
    listRulesCompact(): CompactRule[];
    /** Compact list of hunting queries */
    listHuntingCompact(): CompactRule[];
    /** Get catalog summary for resource consumption */
    getSummary(): CatalogSummary;
    /** Get detailed stats for the detection_stats tool */
    getStats(): Record<string, unknown>;
    /** MITRE ATT&CK coverage matrix */
    getMitreCoverage(): Record<string, unknown>;
    /** STIG control mapping */
    getStigControls(): Record<string, unknown>;
    /** Whether the catalog is loaded and has rules */
    get isLoaded(): boolean;
    /** Total rule count */
    get ruleCount(): number;
    private toCompact;
    private loadRuleFile;
    private loadHuntingFile;
}
