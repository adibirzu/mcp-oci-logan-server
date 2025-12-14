/**
 * OCI Logan MCP Server - HTTP Transport with OAuth
 * Implements Streamable HTTP Transport with proper OAuth 2.0 authentication
 */
import { Server as HTTPServer } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { OAuthConfig, TokenInfo } from '../auth/oauth.js';
export interface HTTPTransportConfig {
    host: string;
    port: number;
    enableCors: boolean;
    corsOrigins: string[];
    enableHttps: boolean;
    httpsKeyPath?: string;
    httpsCertPath?: string;
    sessionTimeout: number;
    maxSessions: number;
    enableHealthEndpoint: boolean;
    enableMetricsEndpoint: boolean;
    oauth: OAuthConfig;
}
export declare function getHTTPTransportConfig(): HTTPTransportConfig;
interface Session {
    id: string;
    createdAt: number;
    lastActivity: number;
    tokenInfo?: TokenInfo;
    clientInfo?: {
        userAgent?: string;
        remoteAddress?: string;
    };
}
/**
 * Create and configure HTTP server with OAuth authentication
 */
export declare function createHTTPTransport(mcpServer: Server, serverVersion: string): Promise<{
    server: HTTPServer;
    transport: StreamableHTTPServerTransport;
    config: HTTPTransportConfig;
}>;
/**
 * Start HTTP server and listen on configured host/port
 */
export declare function startHTTPServer(mcpServer: Server, serverVersion: string): Promise<void>;
/**
 * Get current session statistics
 */
export declare function getSessionStats(): {
    total: number;
    active: number;
    sessions: Session[];
};
/**
 * Terminate a specific session
 */
export declare function terminateSession(sessionId: string): boolean;
export {};
