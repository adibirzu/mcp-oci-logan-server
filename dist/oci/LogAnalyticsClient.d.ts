import * as oci from 'oci-sdk';
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
    metadata?: any;
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
    private pythonEnvironment;
    constructor();
    private getPythonEnvironment;
    private ensurePythonAssets;
    private initializeClient;
    private loadOCIConfig;
    private initializeAuth;
    protected getInstancePrincipalsBuilder(): {
        new (): {
            build: () => Promise<any>;
        };
    } | null;
    protected buildInstancePrincipalsProvider(Builder: {
        new (): {
            build: () => Promise<any>;
        };
    }): Promise<any>;
    protected createConfigFileProvider(configurationFilePath: string, profile?: string): oci.common.ConfigFileAuthenticationDetailsProvider;
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
    listDashboards(request: {
        compartmentId?: string;
        displayName?: string;
        lifecycleState?: string;
        limit?: number;
    }): Promise<any>;
    getDashboard(request: {
        dashboardId: string;
        compartmentId?: string;
    }): Promise<any>;
    createDashboard(request: {
        displayName: string;
        description?: string;
        compartmentId?: string;
        dashboardConfig?: any;
    }): Promise<any>;
    updateDashboard(request: {
        dashboardId: string;
        displayName?: string;
        description?: string;
        addWidgets?: any[];
        removeWidgetIds?: string[];
    }): Promise<any>;
    createSavedSearch(request: {
        displayName: string;
        query: string;
        description?: string;
        compartmentId?: string;
        widgetType?: string;
    }): Promise<any>;
    listSavedSearches(request: {
        compartmentId?: string;
        displayName?: string;
        limit?: number;
    }): Promise<any>;
    listLogSources(request: {
        compartmentId: string;
        sourceType?: string;
        displayName?: string;
        limit?: number;
    }): Promise<QueryResult>;
    getLogSourceDetails(request: {
        sourceName: string;
        compartmentId: string;
    }): Promise<QueryResult>;
    listActiveLogSources(request: {
        compartmentId: string;
        timePeriodMinutes?: number;
        limit?: number;
    }): Promise<QueryResult>;
    listLogFields(request: {
        fieldType?: string;
        isSystem?: boolean;
        fieldName?: string;
        limit?: number;
    }): Promise<QueryResult>;
    getFieldDetails(request: {
        fieldName: string;
    }): Promise<QueryResult>;
    getNamespaceInfo(request: {
        includeStorageStats?: boolean;
    }): Promise<QueryResult>;
    listEntities(request: {
        compartmentId: string;
        entityType?: string;
        cloudResourceId?: string;
        limit?: number;
    }): Promise<QueryResult>;
    getStorageUsage(request: {
        compartmentId: string;
        timeRange?: string;
    }): Promise<QueryResult>;
    listParsers(request: {
        parserType?: string;
        displayName?: string;
        isSystem?: boolean;
        limit?: number;
    }): Promise<QueryResult>;
    listLabels(request: {
        labelType?: string;
        displayName?: string;
        limit?: number;
    }): Promise<QueryResult>;
    queryRecentUploads(request: {
        compartmentId: string;
        status?: string;
        timeRange?: string;
        limit?: number;
    }): Promise<QueryResult>;
}
