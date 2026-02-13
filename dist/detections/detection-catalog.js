/**
 * Detection Catalog Engine
 *
 * Runtime-loads detection rules from oci-log-analytics-detections/queries/.
 * Builds in-memory indexes for O(1) lookups by id, platform, level, MITRE, STIG.
 * Degrades gracefully to an empty catalog if the path is unavailable.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createLogger } from '../utils/logger.js';
import { PLATFORMS, } from './types.js';
const logger = createLogger('DetectionCatalog');
const DEFAULT_RULES_PATH = path.join(os.homedir(), 'dev', 'oci-log-analytics-detections', 'queries');
export class DetectionCatalog {
    rulesPath;
    catalog = null;
    loaded = false;
    // In-memory indexes (populated on initialize)
    rulesById = new Map();
    rulesByPlatform = new Map();
    rulesByLevel = new Map();
    rulesByTechnique = new Map();
    rulesByTactic = new Map();
    rulesByStigCategory = new Map();
    // Hunting query tracking
    huntingFiles = new Set();
    constructor() {
        this.rulesPath = process.env.DETECTION_RULES_PATH || DEFAULT_RULES_PATH;
    }
    /** Load catalog.json and build indexes. Safe to call multiple times. */
    async initialize() {
        if (this.loaded)
            return;
        const catalogPath = path.join(this.rulesPath, 'catalog.json');
        try {
            if (!fs.existsSync(catalogPath)) {
                logger.warn('Detection catalog not found', { path: catalogPath });
                this.loaded = true;
                return;
            }
            const raw = fs.readFileSync(catalogPath, 'utf8');
            this.catalog = JSON.parse(raw);
            // Discover hunting query files
            const huntingDir = path.join(this.rulesPath, 'hunting');
            if (fs.existsSync(huntingDir)) {
                for (const f of fs.readdirSync(huntingDir)) {
                    if (f.endsWith('.json')) {
                        this.huntingFiles.add(f);
                    }
                }
            }
            // Build indexes
            for (const entry of this.catalog.rules) {
                const id = entry.file.replace(/\.json$/, '');
                this.rulesById.set(id, entry);
                // Platform index
                const platform = entry.platform || this.inferPlatform(entry.file);
                const byPlatform = this.rulesByPlatform.get(platform) || [];
                byPlatform.push(entry);
                this.rulesByPlatform.set(platform, byPlatform);
                // Level index
                const byLevel = this.rulesByLevel.get(entry.level) || [];
                byLevel.push(entry);
                this.rulesByLevel.set(entry.level, byLevel);
                // MITRE technique index
                for (const tech of entry.mitre_techniques || []) {
                    const byTech = this.rulesByTechnique.get(tech) || [];
                    byTech.push(entry);
                    this.rulesByTechnique.set(tech, byTech);
                }
                // MITRE tactic index
                for (const tactic of entry.mitre_tactics || []) {
                    const byTactic = this.rulesByTactic.get(tactic) || [];
                    byTactic.push(entry);
                    this.rulesByTactic.set(tactic, byTactic);
                }
                // STIG category index
                if (entry.stig_category) {
                    const byStig = this.rulesByStigCategory.get(entry.stig_category) || [];
                    byStig.push(entry);
                    this.rulesByStigCategory.set(entry.stig_category, byStig);
                }
            }
            this.loaded = true;
            logger.info('Detection catalog loaded', {
                rules: this.catalog.rules.length,
                hunting: this.huntingFiles.size,
                platforms: Object.keys(this.catalog.platforms).join(', '),
            });
        }
        catch (error) {
            logger.error('Failed to load detection catalog', {
                error: error instanceof Error ? error.message : String(error),
            });
            this.loaded = true; // mark loaded to prevent retry loops
        }
    }
    /** Infer platform from filename convention */
    inferPlatform(filename) {
        if (filename.startsWith('oci_') || filename.startsWith('cloud_guard_'))
            return 'oci';
        if (filename.startsWith('linux_') || filename.startsWith('suspicious_usage_'))
            return 'linux';
        if (filename.startsWith('win_') || filename.startsWith('windows_'))
            return 'windows';
        return 'oci';
    }
    // ============================================
    // O(1) Lookups
    // ============================================
    /** Get a full detection rule by ID (reads from disk on demand) */
    getRule(id) {
        const entry = this.rulesById.get(id);
        if (!entry)
            return null;
        return this.loadRuleFile(entry.file);
    }
    /** Get a full hunting query by ID (reads from disk on demand) */
    getHuntingQuery(id) {
        const filename = `${id}.json`;
        if (!this.huntingFiles.has(filename))
            return null;
        return this.loadHuntingFile(filename);
    }
    // ============================================
    // Search & Filter
    // ============================================
    /** Search rules by multiple filter criteria */
    searchRules(filter) {
        let candidates;
        // Start with the most selective index
        if (filter.mitreTechnique) {
            candidates = this.rulesByTechnique.get(filter.mitreTechnique) || [];
        }
        else if (filter.mitreTactic) {
            candidates = this.rulesByTactic.get(filter.mitreTactic) || [];
        }
        else if (filter.platform) {
            candidates = this.rulesByPlatform.get(filter.platform) || [];
        }
        else if (filter.level) {
            candidates = this.rulesByLevel.get(filter.level) || [];
        }
        else if (filter.stigCategory) {
            candidates = this.rulesByStigCategory.get(filter.stigCategory) || [];
        }
        else {
            candidates = this.catalog?.rules || [];
        }
        // Apply remaining filters
        let results = candidates;
        if (filter.platform && !filter.mitreTechnique && !filter.mitreTactic) {
            // Already filtered by platform as primary
        }
        else if (filter.platform) {
            results = results.filter(r => (r.platform || this.inferPlatform(r.file)) === filter.platform);
        }
        if (filter.level && candidates !== this.rulesByLevel.get(filter.level)) {
            results = results.filter(r => r.level === filter.level);
        }
        if (filter.stigCategory && candidates !== this.rulesByStigCategory.get(filter.stigCategory)) {
            results = results.filter(r => r.stig_category === filter.stigCategory);
        }
        if (filter.keyword) {
            const kw = filter.keyword.toLowerCase();
            results = results.filter(r => r.title.toLowerCase().includes(kw) ||
                r.description.toLowerCase().includes(kw));
        }
        return results.map(r => this.toCompact(r));
    }
    /** Compact list of all rules (~50 bytes/rule) */
    listRulesCompact() {
        if (!this.catalog)
            return [];
        return this.catalog.rules.map(r => this.toCompact(r));
    }
    /** Compact list of hunting queries */
    listHuntingCompact() {
        const results = [];
        for (const filename of this.huntingFiles) {
            const id = filename.replace(/\.json$/, '');
            const query = this.loadHuntingFile(filename);
            if (query) {
                results.push({
                    id,
                    title: query.title,
                    level: query.level,
                    platform: query.logsource?.product || 'oci',
                });
            }
        }
        return results;
    }
    // ============================================
    // Summary & Stats
    // ============================================
    /** Get catalog summary for resource consumption */
    getSummary() {
        if (!this.catalog) {
            return {
                version: '0.0',
                totalRules: 0,
                totalHunting: 0,
                platforms: {},
                severities: {},
                mitreTechniques: 0,
                mitreTactics: 0,
                stigControls: 0,
                loaded: false,
            };
        }
        return {
            version: this.catalog.version,
            totalRules: this.catalog.total_rules,
            totalHunting: this.catalog.total_hunting,
            platforms: this.catalog.platforms,
            severities: this.catalog.severities,
            mitreTechniques: this.catalog.mitre_techniques.length,
            mitreTactics: this.catalog.mitre_tactics.length,
            stigControls: this.catalog.stig_controls.length,
            loaded: true,
        };
    }
    /** Get detailed stats for the detection_stats tool */
    getStats() {
        if (!this.catalog) {
            return { loaded: false, message: 'Detection catalog not available' };
        }
        return {
            loaded: true,
            version: this.catalog.version,
            totalRules: this.catalog.total_rules,
            totalHunting: this.huntingFiles.size,
            platforms: this.catalog.platforms,
            severities: this.catalog.severities,
            mitreTechniques: this.catalog.mitre_techniques,
            mitreTactics: this.catalog.mitre_tactics,
            stigControls: this.catalog.stig_controls,
            indexSizes: {
                byId: this.rulesById.size,
                byPlatform: Object.fromEntries([...this.rulesByPlatform.entries()].map(([k, v]) => [k, v.length])),
                byLevel: Object.fromEntries([...this.rulesByLevel.entries()].map(([k, v]) => [k, v.length])),
                byTechnique: this.rulesByTechnique.size,
                byTactic: this.rulesByTactic.size,
            },
        };
    }
    /** MITRE ATT&CK coverage matrix */
    getMitreCoverage() {
        if (!this.catalog)
            return { loaded: false };
        const coverage = {};
        for (const [tactic, entries] of this.rulesByTactic.entries()) {
            const techniques = new Set();
            for (const entry of entries) {
                for (const tech of entry.mitre_techniques || []) {
                    techniques.add(tech);
                }
            }
            coverage[tactic] = [...techniques].sort();
        }
        return {
            totalTactics: this.catalog.mitre_tactics.length,
            totalTechniques: this.catalog.mitre_techniques.length,
            coverage,
        };
    }
    /** STIG control mapping */
    getStigControls() {
        if (!this.catalog)
            return { loaded: false };
        const controls = {};
        for (const entry of this.catalog.rules) {
            for (const stigId of entry.stig_ids || []) {
                if (!controls[stigId]) {
                    controls[stigId] = { count: 0, category: entry.stig_category || '', rules: [] };
                }
                controls[stigId].count++;
                controls[stigId].rules.push(entry.file.replace(/\.json$/, ''));
            }
        }
        return {
            totalControls: this.catalog.stig_controls.length,
            controls,
        };
    }
    /** Whether the catalog is loaded and has rules */
    get isLoaded() {
        return this.loaded && this.catalog !== null;
    }
    /** Total rule count */
    get ruleCount() {
        return this.catalog?.total_rules || 0;
    }
    // ============================================
    // Private helpers
    // ============================================
    toCompact(entry) {
        const validPlatforms = [...PLATFORMS];
        const platform = entry.platform || this.inferPlatform(entry.file);
        return {
            id: entry.file.replace(/\.json$/, ''),
            title: entry.title,
            level: entry.level,
            platform: validPlatforms.includes(platform)
                ? platform
                : 'oci',
        };
    }
    loadRuleFile(filename) {
        try {
            const filePath = path.join(this.rulesPath, filename);
            if (!fs.existsSync(filePath))
                return null;
            const raw = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    loadHuntingFile(filename) {
        try {
            const filePath = path.join(this.rulesPath, 'hunting', filename);
            if (!fs.existsSync(filePath))
                return null;
            const raw = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
}
