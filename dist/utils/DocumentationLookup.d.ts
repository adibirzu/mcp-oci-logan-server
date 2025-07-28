export declare class DocumentationLookup {
    private documentation;
    constructor();
    private initializeDocumentation;
    getDocumentation(topic?: string, searchTerm?: string): Promise<string>;
    private getTopicDescription;
    getQuickReference(): string;
}
