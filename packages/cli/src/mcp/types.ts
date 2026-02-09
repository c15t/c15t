/**
 * MCP (Model Context Protocol) types
 */

import type { Instance } from '../types';

/**
 * MCP client configuration
 */
export interface MCPClientConfig {
	/** Base URL of the MCP server */
	baseUrl: string;
	/** Access token for authentication */
	accessToken: string;
	/** Client name */
	clientName?: string;
	/** Client version */
	clientVersion?: string;
	/** Request timeout in ms */
	timeout?: number;
}

/**
 * MCP connection state
 */
export interface MCPConnectionState {
	/** Whether connected to the server */
	connected: boolean;
	/** Server capabilities */
	capabilities?: MCPServerCapabilities;
	/** Error if connection failed */
	error?: string;
}

/**
 * MCP server capabilities
 */
export interface MCPServerCapabilities {
	/** Supported resources */
	resources?: string[];
	/** Supported tools */
	tools?: string[];
	/** Server version */
	version?: string;
}

/**
 * MCP tool call request
 */
export interface MCPToolCallRequest {
	/** Tool name */
	name: string;
	/** Tool arguments */
	arguments?: Record<string, unknown>;
}

/**
 * MCP tool call response
 */
export interface MCPToolCallResponse {
	/** Whether the call succeeded */
	success: boolean;
	/** Response content */
	content?: unknown;
	/** Error message if failed */
	error?: string;
}

/**
 * Instance list response
 */
export interface ListInstancesResponse {
	instances: Instance[];
	total: number;
}

/**
 * Create instance request
 */
export interface CreateInstanceRequest {
	/** Instance name */
	name: string;
	/** Instance configuration */
	config?: Record<string, unknown>;
}

/**
 * Create instance response
 */
export interface CreateInstanceResponse {
	instance: Instance;
}
