/**
 * Prompt Message Builders
 *
 * Each function returns MCP prompt messages[] for a specific workflow.
 * Messages use role: 'user' to prime the agent with structured instructions.
 */
interface PromptMessage {
    role: 'user' | 'assistant';
    content: {
        type: 'text';
        text: string;
    };
}
export declare function buildSecurityTriage(args: Record<string, string>): PromptMessage[];
export declare function buildThreatHunt(args: Record<string, string>): PromptMessage[];
export declare function buildIncidentInvestigation(args: Record<string, string>): PromptMessage[];
export declare function buildComplianceCheck(args: Record<string, string>): PromptMessage[];
export declare function buildDetectionCoverageGap(args: Record<string, string>): PromptMessage[];
export declare function buildDailySecurityBrief(args: Record<string, string>): PromptMessage[];
export {};
