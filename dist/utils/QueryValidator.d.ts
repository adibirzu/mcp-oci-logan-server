export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
export declare class QueryValidator {
    private readonly VALID_OPERATORS;
    private readonly VALID_FUNCTIONS;
    private readonly COMMON_FIELD_NAMES;
    validate(query: string): Promise<ValidationResult>;
    attemptFix(query: string): Promise<string | null>;
    private checkBasicSyntax;
    private checkFieldNames;
    private checkTimeFilters;
    private checkFunctions;
    private checkPerformance;
    private fixFieldNames;
    private fixTimeFilters;
    private fixOperators;
    private getSimilarFieldNames;
    private levenshteinDistance;
}
