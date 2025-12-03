/**
 * Predefined OCI Logging Analytics Queries
 *
 * Organized by Oracle-defined Dashboard categories and security use cases.
 * All queries follow OCI LA syntax with proper field quoting and time filtering.
 *
 * Reference: https://docs.oracle.com/en-us/iaas/log-analytics/doc/command-reference.html
 */
export interface PredefinedQuery {
    id: string;
    name: string;
    query: string;
    category: string;
    subcategory?: string;
    description: string;
    tags: string[];
    /** Whether this query has been tested against real OCI LA */
    tested: boolean;
    /** Expected log sources for this query */
    logSources?: string[];
    /** Minimum recommended time range */
    minTimeRange?: string;
}
export interface QueryCategory {
    id: string;
    name: string;
    description: string;
    queries: PredefinedQuery[];
}
export declare const VCN_FLOW_QUERIES: PredefinedQuery[];
export declare const OCI_AUDIT_QUERIES: PredefinedQuery[];
export declare const DATABASE_QUERIES: PredefinedQuery[];
export declare const API_GATEWAY_QUERIES: PredefinedQuery[];
export declare const OBJECT_STORAGE_QUERIES: PredefinedQuery[];
export declare const SECURITY_QUERIES: PredefinedQuery[];
export declare const COMPUTE_QUERIES: PredefinedQuery[];
export declare const LOAD_BALANCER_QUERIES: PredefinedQuery[];
export declare const ALL_PREDEFINED_QUERIES: PredefinedQuery[];
export declare const QUERY_CATEGORIES: QueryCategory[];
/**
 * Get queries by category
 */
export declare function getQueriesByCategory(categoryId: string): PredefinedQuery[];
/**
 * Get queries by tag
 */
export declare function getQueriesByTag(tag: string): PredefinedQuery[];
/**
 * Search queries by name or description
 */
export declare function searchQueries(searchTerm: string): PredefinedQuery[];
/**
 * Get query by ID
 */
export declare function getQueryById(id: string): PredefinedQuery | undefined;
/**
 * Get all untested queries
 */
export declare function getUntestedQueries(): PredefinedQuery[];
/**
 * Get query statistics
 */
export declare function getQueryStats(): {
    total: number;
    tested: number;
    untested: number;
    byCategory: Record<string, number>;
};
