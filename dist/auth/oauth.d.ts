/**
 * OCI Logan MCP Server - OAuth 2.0 Authentication
 * Implements OAuth 2.1 best practices for MCP HTTP transport
 */
import { IncomingMessage, ServerResponse } from 'node:http';
export interface OAuthConfig {
    enabled: boolean;
    issuerUrl: string;
    introspectionUrl: string;
    clientId: string;
    clientSecret: string;
    requiredScopes: string[];
    resourceServerUrl: string;
    audience: string;
    tokenCacheEnabled: boolean;
    tokenCacheTtl: number;
}
export declare function getOAuthConfig(): OAuthConfig;
export interface TokenInfo {
    active: boolean;
    scope?: string;
    clientId?: string;
    username?: string;
    tokenType?: string;
    exp?: number;
    iat?: number;
    nbf?: number;
    sub?: string;
    aud?: string | string[];
    iss?: string;
    jti?: string;
}
/**
 * Extract Bearer token from Authorization header
 */
export declare function extractBearerToken(req: IncomingMessage): string | null;
/**
 * Verify and validate a token
 */
export declare function verifyToken(token: string, config: OAuthConfig): Promise<TokenInfo | null>;
/**
 * Send 401 Unauthorized response with WWW-Authenticate header
 */
export declare function sendUnauthorized(res: ServerResponse, config: OAuthConfig, message?: string): void;
/**
 * Send 403 Forbidden response
 */
export declare function sendForbidden(res: ServerResponse, message?: string): void;
/**
 * OAuth authentication middleware
 */
export declare function oauthMiddleware(req: IncomingMessage, res: ServerResponse, config: OAuthConfig): Promise<TokenInfo | null>;
/**
 * Create OAuth Protected Resource Metadata endpoint response
 */
export declare function getProtectedResourceMetadata(config: OAuthConfig): Record<string, unknown>;
