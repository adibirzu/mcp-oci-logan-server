export interface QueryRequest {
    query: string;
    timeRange?: string;
    compartmentId?: string;
    environment?: string;
    limit?: number;
}
export interface QueryResult {
    totalCount: number;
    data: any[];
    executionTime: number;
    queryId?: string;
    success: boolean;
    error?: string;
    queryUsed?: string;
    arePartialResults?: boolean;
}
export interface ConnectionStatus {
    connected: boolean;
    authMethod: string;
    region: string;
    compartmentId: string;
    details: string;
}
export declare class LogAnalyticsClient {
    private client;
    private provider;
    private config;
    private namespace;
    constructor();
    private initializeClient;
    private loadOCIConfig;
    private initializeAuth;
    private isRunningOnOCI;
    /**
     * Execute query by calling the standalone Python client
     */
    executeQuery(request: QueryRequest): Promise<QueryResult>;
    /**
     * Check if query already has time filtering
     */
    private hasTimeFilter;
    /**
     * Fix common OCI Logging Analytics query syntax issues
     * This mirrors the _fix_query_syntax method from logan_client.py
     */
    private fixQuerySyntax;
    /**
     * Parse time range string to minutes
     */
    private parseTimeRange;
    private getNamespace;
    checkConnection(testQuery?: boolean): Promise<ConnectionStatus>;
    getAvailableLogSources(): Promise<string[]>;
    getAvailableFields(logSource?: string): Promise<string[]>;
}
