/**
 * OCI Logan MCP Server - OAuth 2.0 Authentication
 * Implements OAuth 2.1 best practices for MCP HTTP transport
 */
import { createLogger } from '../utils/logger.js';
const logger = createLogger('OAuth');
export function getOAuthConfig() {
    return {
        enabled: process.env.MCP_OAUTH_ENABLED === 'true',
        issuerUrl: process.env.MCP_OAUTH_ISSUER_URL || '',
        introspectionUrl: process.env.MCP_OAUTH_INTROSPECTION_URL || '',
        clientId: process.env.MCP_OAUTH_CLIENT_ID || '',
        clientSecret: process.env.MCP_OAUTH_CLIENT_SECRET || '',
        requiredScopes: (process.env.MCP_OAUTH_REQUIRED_SCOPES || 'mcp:tools').split(',').map(s => s.trim()),
        resourceServerUrl: process.env.MCP_OAUTH_RESOURCE_URL || '',
        audience: process.env.MCP_OAUTH_AUDIENCE || '',
        tokenCacheEnabled: process.env.MCP_OAUTH_TOKEN_CACHE !== 'false',
        tokenCacheTtl: parseInt(process.env.MCP_OAUTH_TOKEN_CACHE_TTL || '300', 10), // 5 minutes default
    };
}
// Simple in-memory token cache
const tokenCache = new Map();
/**
 * Clear expired cache entries periodically
 */
function cleanCache() {
    const now = Date.now();
    for (const [token, entry] of tokenCache.entries()) {
        if (entry.expiresAt <= now) {
            tokenCache.delete(token);
        }
    }
}
// Clean cache every 60 seconds
setInterval(cleanCache, 60000);
/**
 * Hash token for cache key (don't store raw tokens in memory)
 */
async function hashToken(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return null;
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return null;
    }
    return parts[1];
}
/**
 * Introspect token with the authorization server
 */
async function introspectToken(token, config) {
    if (!config.introspectionUrl) {
        throw new Error('OAuth introspection URL not configured');
    }
    const body = new URLSearchParams({
        token,
        token_type_hint: 'access_token',
    });
    const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    const response = await fetch(config.introspectionUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authHeader}`,
        },
        body: body.toString(),
    });
    if (!response.ok) {
        throw new Error(`Token introspection failed: ${response.status}`);
    }
    return await response.json();
}
/**
 * Validate token against required scopes and audience
 */
function validateTokenClaims(tokenInfo, config) {
    // Check if token is active
    if (!tokenInfo.active) {
        logger.debug('Token is not active');
        return false;
    }
    // Check expiration
    if (tokenInfo.exp && tokenInfo.exp * 1000 < Date.now()) {
        logger.debug('Token has expired');
        return false;
    }
    // Check not-before
    if (tokenInfo.nbf && tokenInfo.nbf * 1000 > Date.now()) {
        logger.debug('Token not yet valid (nbf)');
        return false;
    }
    // Check audience if configured
    if (config.audience) {
        const audiences = Array.isArray(tokenInfo.aud) ? tokenInfo.aud : [tokenInfo.aud];
        if (!audiences.includes(config.audience)) {
            logger.debug('Token audience mismatch');
            return false;
        }
    }
    // Check required scopes
    if (config.requiredScopes.length > 0 && tokenInfo.scope) {
        const tokenScopes = tokenInfo.scope.split(' ');
        const hasAllScopes = config.requiredScopes.every(s => tokenScopes.includes(s));
        if (!hasAllScopes) {
            logger.debug('Token missing required scopes');
            return false;
        }
    }
    return true;
}
/**
 * Verify and validate a token
 */
export async function verifyToken(token, config) {
    try {
        // Check cache first
        if (config.tokenCacheEnabled) {
            const cacheKey = await hashToken(token);
            const cached = tokenCache.get(cacheKey);
            if (cached && cached.expiresAt > Date.now()) {
                if (validateTokenClaims(cached.tokenInfo, config)) {
                    return cached.tokenInfo;
                }
                tokenCache.delete(cacheKey);
            }
        }
        // Introspect token
        const tokenInfo = await introspectToken(token, config);
        // Validate claims
        if (!validateTokenClaims(tokenInfo, config)) {
            return null;
        }
        // Cache the result
        if (config.tokenCacheEnabled && tokenInfo.active) {
            const cacheKey = await hashToken(token);
            const ttl = Math.min(config.tokenCacheTtl * 1000, tokenInfo.exp ? (tokenInfo.exp * 1000 - Date.now()) : config.tokenCacheTtl * 1000);
            tokenCache.set(cacheKey, {
                tokenInfo,
                expiresAt: Date.now() + ttl,
            });
        }
        return tokenInfo;
    }
    catch (error) {
        logger.error('Token verification failed', { error: error instanceof Error ? error.message : String(error) });
        return null;
    }
}
/**
 * Send 401 Unauthorized response with WWW-Authenticate header
 */
export function sendUnauthorized(res, config, message) {
    const realm = 'OCI Logan MCP Server';
    const scope = config.requiredScopes.join(' ');
    let wwwAuth = `Bearer realm="${realm}"`;
    if (config.resourceServerUrl) {
        wwwAuth += `, resource_metadata="${config.resourceServerUrl}/.well-known/oauth-protected-resource"`;
    }
    if (scope) {
        wwwAuth += `, scope="${scope}"`;
    }
    if (message) {
        wwwAuth += `, error="invalid_token", error_description="${message}"`;
    }
    res.writeHead(401, {
        'WWW-Authenticate': wwwAuth,
        'Content-Type': 'application/json',
    });
    res.end(JSON.stringify({
        error: 'unauthorized',
        message: message || 'Authentication required',
    }));
}
/**
 * Send 403 Forbidden response
 */
export function sendForbidden(res, message) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        error: 'forbidden',
        message: message || 'Access denied',
    }));
}
/**
 * OAuth authentication middleware
 */
export async function oauthMiddleware(req, res, config) {
    // Skip auth if not enabled
    if (!config.enabled) {
        return { active: true };
    }
    // Extract token
    const token = extractBearerToken(req);
    if (!token) {
        sendUnauthorized(res, config, 'Missing access token');
        return null;
    }
    // Verify token
    const tokenInfo = await verifyToken(token, config);
    if (!tokenInfo) {
        sendUnauthorized(res, config, 'Invalid or expired token');
        return null;
    }
    return tokenInfo;
}
/**
 * Create OAuth Protected Resource Metadata endpoint response
 */
export function getProtectedResourceMetadata(config) {
    return {
        resource: config.resourceServerUrl || config.audience,
        authorization_servers: config.issuerUrl ? [config.issuerUrl] : [],
        bearer_methods_supported: ['header'],
        scopes_supported: config.requiredScopes,
        resource_documentation: 'https://github.com/oracle/mcp-oci-logan-server',
    };
}
