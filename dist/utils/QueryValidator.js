export class QueryValidator {
    VALID_OPERATORS = [
        '=', '!=', '<', '>', '<=', '>=', 'like', 'not like', 'contains', 'not contains',
        'in', 'not in', 'is null', 'is not null', 'matches', 'not matches'
    ];
    VALID_FUNCTIONS = [
        'count', 'sum', 'avg', 'min', 'max', 'stats', 'timestats', 'sort', 'head', 'tail',
        'dateRelative', 'where', 'distinct', 'top', 'bottom', 'eval', 'join', 'lookup'
    ];
    COMMON_FIELD_NAMES = [
        'Event Name', 'User Name', 'Principal Name', 'IP Address', 'Source IP', 'Destination IP',
        'Log Source', 'Time', 'Compartment Name', 'Resource Name', 'Technique_id', 'Event_id',
        'Process Name', 'Command Line', 'File Path', 'Registry Key', 'Network Protocol'
    ];
    async validate(query) {
        const errors = [];
        const warnings = [];
        if (!query || query.trim().length === 0) {
            errors.push('Query cannot be empty');
            return { isValid: false, errors, warnings };
        }
        // Basic syntax checks
        this.checkBasicSyntax(query, errors);
        // Field name validation
        this.checkFieldNames(query, errors, warnings);
        // Time filter validation
        this.checkTimeFilters(query, warnings);
        // Function validation
        this.checkFunctions(query, errors);
        // Performance warnings
        this.checkPerformance(query, warnings);
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    async attemptFix(query) {
        let fixedQuery = query;
        try {
            // Fix common field name issues
            fixedQuery = this.fixFieldNames(fixedQuery);
            // Fix time filter issues
            fixedQuery = this.fixTimeFilters(fixedQuery);
            // Fix operator issues
            fixedQuery = this.fixOperators(fixedQuery);
            // Validate the fixed query
            const validation = await this.validate(fixedQuery);
            return validation.isValid ? fixedQuery : null;
        }
        catch (error) {
            return null;
        }
    }
    checkBasicSyntax(query, errors) {
        // Check for balanced quotes
        const singleQuotes = (query.match(/'/g) || []).length;
        const doubleQuotes = (query.match(/"/g) || []).length;
        if (singleQuotes % 2 !== 0) {
            errors.push('Unbalanced single quotes in query');
        }
        if (doubleQuotes % 2 !== 0) {
            errors.push('Unbalanced double quotes in query');
        }
        // Check for balanced parentheses
        let parenCount = 0;
        for (const char of query) {
            if (char === '(')
                parenCount++;
            if (char === ')')
                parenCount--;
            if (parenCount < 0) {
                errors.push('Unbalanced parentheses in query');
                break;
            }
        }
        if (parenCount > 0) {
            errors.push('Unbalanced parentheses in query');
        }
        // Check for pipe operations
        if (query.includes('|')) {
            const parts = query.split('|');
            for (let i = 1; i < parts.length; i++) {
                const part = parts[i].trim();
                if (!part) {
                    errors.push(`Empty pipe operation at position ${i}`);
                }
            }
        }
    }
    checkFieldNames(query, errors, warnings) {
        // Find potential field names (text in quotes)
        const fieldMatches = query.match(/'([^']+)'/g) || [];
        for (const match of fieldMatches) {
            const fieldName = match.slice(1, -1); // Remove quotes
            // Check if it's a known field
            const isKnownField = this.COMMON_FIELD_NAMES.some(known => known.toLowerCase() === fieldName.toLowerCase());
            if (!isKnownField && fieldName.length > 3) {
                // Check for common misspellings
                const suggestions = this.getSimilarFieldNames(fieldName);
                if (suggestions.length > 0) {
                    warnings.push(`Unknown field '${fieldName}'. Did you mean: ${suggestions.join(', ')}?`);
                }
            }
        }
        // Check for fields that should be quoted but aren't
        for (const knownField of this.COMMON_FIELD_NAMES) {
            if (knownField.includes(' ') && query.includes(knownField) && !query.includes(`'${knownField}'`)) {
                warnings.push(`Field name '${knownField}' should be quoted when it contains spaces`);
            }
        }
    }
    checkTimeFilters(query, warnings) {
        // Check if query has time filter
        const hasTimeFilter = query.toLowerCase().includes('time >') ||
            query.toLowerCase().includes('daterelative');
        if (!hasTimeFilter) {
            warnings.push('Query does not include a time filter. This may result in slow performance.');
        }
        // Check for lowercase 'time' instead of 'Time'
        if (query.includes('time >') && !query.includes('Time >')) {
            warnings.push("Use 'Time' (capitalized) instead of 'time' for time field");
        }
        // Validate dateRelative syntax
        const dateRelativeMatches = query.match(/dateRelative\\(([^)]+)\\)/g) || [];
        for (const match of dateRelativeMatches) {
            const timeValue = match.slice(13, -1); // Extract time value
            if (!timeValue.match(/^\\d+[hmdHMD]$/)) {
                warnings.push(`Invalid dateRelative format: ${match}. Use format like '24h', '7d', '30m'`);
            }
        }
    }
    checkFunctions(query, errors) {
        // Find function calls (word followed by parentheses or pipe)
        const functionMatches = query.match(/\b(\w+)\s*(?:\(|\s*\|)/g) || [];
        for (const match of functionMatches) {
            const funcName = match.replace(/\s*[\(\|].*/, '').trim();
            if (!this.VALID_FUNCTIONS.includes(funcName.toLowerCase()) &&
                !this.COMMON_FIELD_NAMES.some(field => field.toLowerCase() === funcName.toLowerCase())) {
                // It might be a valid function we don't know about, so just warn
                // errors.push(`Unknown function: ${funcName}`);
            }
        }
    }
    checkPerformance(query, warnings) {
        // Check for wildcard at the beginning
        if (query.trim().startsWith('*') && !query.includes('|')) {
            warnings.push('Starting with wildcard (*) without filters may be slow. Consider adding specific filters.');
        }
        // Check for missing limit
        if (!query.toLowerCase().includes('head') && !query.toLowerCase().includes('tail') &&
            !query.toLowerCase().includes('top') && !query.toLowerCase().includes('bottom')) {
            warnings.push('Consider adding a limit (e.g., | head 100) to improve query performance');
        }
        // Check for complex regex operations
        if (query.includes('matches') || query.includes('not matches')) {
            warnings.push('Regex operations (matches/not matches) can be slow on large datasets');
        }
    }
    fixFieldNames(query) {
        let fixedQuery = query;
        // Fix common field name case issues
        const fieldMappings = {
            'event name': 'Event Name',
            'user name': 'User Name',
            'principal name': 'Principal Name',
            'ip address': 'IP Address',
            'source ip': 'Source IP',
            'destination ip': 'Destination IP',
            'log source': 'Log Source',
            'compartment name': 'Compartment Name',
            'resource name': 'Resource Name'
        };
        for (const [incorrect, correct] of Object.entries(fieldMappings)) {
            // Replace unquoted versions
            fixedQuery = fixedQuery.replace(new RegExp(`\\b${incorrect}\\b`, 'gi'), `'${correct}'`);
            // Replace incorrectly quoted versions
            fixedQuery = fixedQuery.replace(new RegExp(`'${incorrect}'`, 'gi'), `'${correct}'`);
        }
        return fixedQuery;
    }
    fixTimeFilters(query) {
        let fixedQuery = query;
        // Fix lowercase 'time' to 'Time'
        fixedQuery = fixedQuery.replace(/\btime\s+>/gi, 'Time >');
        return fixedQuery;
    }
    fixOperators(query) {
        let fixedQuery = query;
        // Fix common operator issues
        const operatorFixes = {
            ' == ': ' = ',
            ' LIKE ': ' like ',
            ' CONTAINS ': ' contains ',
            ' IN ': ' in ',
            ' NOT IN ': ' not in '
        };
        for (const [incorrect, correct] of Object.entries(operatorFixes)) {
            fixedQuery = fixedQuery.replace(new RegExp(incorrect, 'g'), correct);
        }
        return fixedQuery;
    }
    getSimilarFieldNames(fieldName) {
        const suggestions = [];
        const lowerField = fieldName.toLowerCase();
        for (const knownField of this.COMMON_FIELD_NAMES) {
            const lowerKnown = knownField.toLowerCase();
            // Simple similarity check
            if (lowerKnown.includes(lowerField) || lowerField.includes(lowerKnown)) {
                suggestions.push(knownField);
            }
            else if (this.levenshteinDistance(lowerField, lowerKnown) <= 2) {
                suggestions.push(knownField);
            }
        }
        return suggestions.slice(0, 3); // Return max 3 suggestions
    }
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i++)
            matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++)
            matrix[j][0] = j;
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, // deletion
                matrix[j - 1][i] + 1, // insertion
                matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        return matrix[str2.length][str1.length];
    }
}
