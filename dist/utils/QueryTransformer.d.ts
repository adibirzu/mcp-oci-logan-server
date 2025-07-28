export interface LoganQuery {
    id: string;
    name: string;
    query: string;
    category: string;
    description?: string;
    status?: string;
}
export interface IPAnalysisQuery {
    type: string;
    description: string;
    query: string;
}
export declare class QueryTransformer {
    private loganQueries;
    private loaded;
    constructor();
    private loadQueries;
    private loadFromLoganProject;
    private loadDefaultQueries;
    transformSearchToQuery(searchTerm: string, eventType: string): Promise<string>;
    getMitreCategoryQuery(category: string): Promise<string>;
    getIPAnalysisQueries(ipAddress: string, analysisType: string): Promise<IPAnalysisQuery[]>;
    getLoganQueries(category?: string, queryName?: string): Promise<LoganQuery[]>;
    buildQueryFromTemplate(templateId: string, parameters: {
        [key: string]: any;
    }): Promise<string>;
    convertNaturalLanguageToQuery(naturalQuery: string): string;
}
