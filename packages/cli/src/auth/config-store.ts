/**
 * Configuration store for c15t CLI credentials
 *
 * Stores authentication credentials and preferences in ~/.c15t/config.json
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PATHS } from '../constants';
import type { AuthState, C15tConfig } from './types';

/**
 * Get the path to the c15t config directory
 */
export function getConfigDir(): string {
	return path.join(os.homedir(), PATHS.CONFIG_DIR);
}

/**
 * Get the path to the config file
 */
export function getConfigPath(): string {
	return path.join(getConfigDir(), PATHS.CONFIG_FILE);
}

/**
 * Ensure the config directory exists
 */
async function ensureConfigDir(): Promise<void> {
	const configDir = getConfigDir();
	await fs.mkdir(configDir, { recursive: true });
}

/**
 * Load the stored configuration
 */
export async function loadConfig(): Promise<C15tConfig | null> {
	try {
		const configPath = getConfigPath();
		const content = await fs.readFile(configPath, 'utf-8');
		const config = JSON.parse(content) as C15tConfig;

		// Validate the config has required fields
		if (!config.accessToken) {
			return null;
		}

		return config;
	} catch (error) {
		// File doesn't exist or is invalid
		return null;
	}
}

/**
 * Save configuration to the store
 */
export async function saveConfig(config: C15tConfig): Promise<void> {
	await ensureConfigDir();

	const configPath = getConfigPath();
	const content = JSON.stringify(config, null, 2);

	await fs.writeFile(configPath, content, {
		mode: 0o600, // Read/write for owner only
	});
}

/**
 * Update specific fields in the configuration
 */
export async function updateConfig(
	updates: Partial<C15tConfig>
): Promise<C15tConfig | null> {
	const existing = await loadConfig();
	if (!existing) {
		return null;
	}

	const updated = { ...existing, ...updates };
	await saveConfig(updated);
	return updated;
}

/**
 * Clear the stored configuration (logout)
 */
export async function clearConfig(): Promise<void> {
	try {
		const configPath = getConfigPath();
		await fs.unlink(configPath);
	} catch {
		// Ignore if file doesn't exist
	}
}

/**
 * Check if the stored token is expired
 */
export function isTokenExpired(config: C15tConfig): boolean {
	if (!config.expiresAt) {
		// If no expiration, assume it's valid
		return false;
	}

	// Add a 5-minute buffer
	const buffer = 5 * 60 * 1000;
	return Date.now() > config.expiresAt - buffer;
}

/**
 * Get the current auth state
 */
export async function getAuthState(): Promise<AuthState> {
	const config = await loadConfig();

	if (!config) {
		return {
			isLoggedIn: false,
			config: null,
			isExpired: false,
		};
	}

	return {
		isLoggedIn: true,
		config,
		isExpired: isTokenExpired(config),
	};
}

/**
 * Check if the user is logged in
 */
export async function isLoggedIn(): Promise<boolean> {
	const state = await getAuthState();
	return state.isLoggedIn && !state.isExpired;
}

/**
 * Get the stored access token
 */
export async function getAccessToken(): Promise<string | null> {
	const config = await loadConfig();
	if (!config || isTokenExpired(config)) {
		return null;
	}
	return config.accessToken;
}

/**
 * Get the selected instance ID
 */
export async function getSelectedInstanceId(): Promise<string | null> {
	const config = await loadConfig();
	return config?.selectedInstanceId || null;
}

/**
 * Set the selected instance ID
 */
export async function setSelectedInstanceId(instanceId: string): Promise<void> {
	await updateConfig({ selectedInstanceId: instanceId });
}

/**
 * Store tokens from a token response
 */
export async function storeTokens(
	accessToken: string,
	options?: {
		refreshToken?: string;
		expiresIn?: number;
		email?: string;
	}
): Promise<void> {
	const config: C15tConfig = {
		accessToken,
		refreshToken: options?.refreshToken,
		expiresAt: options?.expiresIn
			? Date.now() + options.expiresIn * 1000
			: undefined,
		email: options?.email,
		lastLogin: Date.now(),
	};

	// Preserve selected instance from existing config
	const existing = await loadConfig();
	if (existing?.selectedInstanceId) {
		config.selectedInstanceId = existing.selectedInstanceId;
	}

	await saveConfig(config);
}
