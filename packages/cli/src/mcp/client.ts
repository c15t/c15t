/**
 * MCP Client for c15t
 *
 * Wraps the MCP SDK to provide a typed interface for communicating
 * with the c15t MCP server using StreamableHTTPClientTransport.
 */

import { CLI_INFO, TIMEOUTS, URLS } from '../constants';
import { CliError } from '../core/errors';
import type { Instance } from '../types';
import type {
	CreateInstanceRequest,
	CreateInstanceResponse,
	ListInstancesResponse,
	MCPClientConfig,
	MCPConnectionState,
} from './types';

/**
 * MCP Client for c15t instances
 *
 * Uses the MCP SDK's StreamableHTTPClientTransport for communication.
 */
export class C15tMCPClient {
	private config: MCPClientConfig;
	private connected = false;
	private client: unknown = null;
	private transport: unknown = null;

	constructor(config: MCPClientConfig) {
		this.config = {
			clientName: CLI_INFO.MCP_CLIENT_NAME,
			clientVersion: CLI_INFO.VERSION,
			timeout: TIMEOUTS.MCP_CONNECTION,
			...config,
		};
	}

	/**
	 * Connect to the MCP server
	 */
	async connect(): Promise<MCPConnectionState> {
		try {
			// Dynamically import the MCP SDK
			const { Client } = await import(
				'@modelcontextprotocol/sdk/client/index.js'
			);
			const { StreamableHTTPClientTransport } = await import(
				'@modelcontextprotocol/sdk/client/streamableHttp.js'
			);

			// Create the client
			this.client = new Client(
				{
					name: this.config.clientName!,
					version: this.config.clientVersion!,
				},
				{
					capabilities: {},
				}
			);

			// Create the transport with auth header
			const mcpUrl = new URL(`${this.config.baseUrl}/mcp`);
			this.transport = new StreamableHTTPClientTransport(mcpUrl, {
				requestInit: {
					headers: {
						Authorization: `Bearer ${this.config.accessToken}`,
					},
				},
			});

			// Connect
			await (this.client as { connect: (t: unknown) => Promise<void> }).connect(
				this.transport
			);
			this.connected = true;

			return {
				connected: true,
				capabilities: {
					tools: ['listInstances', 'createInstance', 'getInstance'],
				},
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				connected: false,
				error: message,
			};
		}
	}

	/**
	 * Disconnect from the MCP server
	 */
	async close(): Promise<void> {
		if (this.client && this.connected) {
			try {
				await (this.client as { close: () => Promise<void> }).close();
			} catch {
				// Ignore close errors
			}
		}
		this.connected = false;
		this.client = null;
		this.transport = null;
	}

	/**
	 * Check if connected
	 */
	isConnected(): boolean {
		return this.connected;
	}

	/**
	 * Call an MCP tool
	 */
	private async callTool<T>(
		name: string,
		args?: Record<string, unknown>
	): Promise<T> {
		if (!this.connected || !this.client) {
			throw new CliError('MCP_CONNECTION_FAILED', {
				details: 'Not connected to MCP server',
			});
		}

		try {
			const result = await (
				this.client as {
					callTool: (req: {
						name: string;
						arguments?: Record<string, unknown>;
					}) => Promise<{
						content: Array<{ type: string; text?: string }>;
					}>;
				}
			).callTool({
				name,
				arguments: args,
			});

			// Parse the response
			const textContent = result.content.find((c) => c.type === 'text');
			if (textContent?.text) {
				return JSON.parse(textContent.text) as T;
			}

			throw new CliError('MCP_REQUEST_FAILED', {
				details: 'No text content in response',
			});
		} catch (error) {
			if (error instanceof CliError) {
				throw error;
			}
			throw new CliError('MCP_REQUEST_FAILED', {
				details: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * List all instances for the authenticated user
	 */
	async listInstances(): Promise<Instance[]> {
		const response =
			await this.callTool<ListInstancesResponse>('listInstances');
		return response.instances;
	}

	/**
	 * Get a specific instance by ID
	 */
	async getInstance(id: string): Promise<Instance> {
		const response = await this.callTool<{ instance: Instance }>(
			'getInstance',
			{
				id,
			}
		);
		return response.instance;
	}

	/**
	 * Create a new instance
	 */
	async createInstance(request: CreateInstanceRequest): Promise<Instance> {
		const response = await this.callTool<CreateInstanceResponse>(
			'createInstance',
			request as unknown as Record<string, unknown>
		);
		return response.instance;
	}

	/**
	 * Delete an instance
	 */
	async deleteInstance(id: string): Promise<void> {
		await this.callTool<void>('deleteInstance', { id });
	}
}

/**
 * Create and connect an MCP client
 */
export async function createMCPClient(
	accessToken: string,
	baseUrl: string = URLS.CONSENT_IO
): Promise<C15tMCPClient> {
	const client = new C15tMCPClient({
		baseUrl,
		accessToken,
	});

	const state = await client.connect();
	if (!state.connected) {
		throw new CliError('MCP_CONNECTION_FAILED', {
			details: state.error,
		});
	}

	return client;
}

/**
 * Create an MCP client from stored config
 */
export async function createMCPClientFromConfig(
	baseUrl: string = URLS.CONSENT_IO
): Promise<C15tMCPClient | null> {
	// Import here to avoid circular dependency
	const { getAccessToken } = await import('../auth/config-store');

	const accessToken = await getAccessToken();
	if (!accessToken) {
		return null;
	}

	return createMCPClient(accessToken, baseUrl);
}
