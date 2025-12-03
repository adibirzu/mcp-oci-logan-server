/**
 * OCI Logan MCP Server - Tool Definitions
 * Following MCP best practices with tool annotations
 */
import { ToolDefinition, ToolAnnotations } from '../types/index.js';
export declare const TOOL_DEFINITIONS: ToolDefinition[];
/**
 * Get tool definitions formatted for MCP SDK
 */
export declare function getToolDefinitions(): {
    annotations: ToolAnnotations;
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}[];
/**
 * Map old tool names to new names for backward compatibility
 */
export declare const TOOL_NAME_MAPPING: Record<string, string>;
/**
 * Normalize tool name (supports both old and new names)
 */
export declare function normalizeToolName(name: string): string;
