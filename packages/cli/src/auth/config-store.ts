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
export const getConfigDir = function getConfigDir(): string {
	return path.join(os.homedir(), PATHS.CONFIG_DIR);
};

/**
 * Get the path to the config file
 */
export const getConfigPath = function getConfigPath(): string {
	return path.join(getConfigDir(), PATHS.CONFIG_FILE);
};

/**
 * Ensure the config directory exists
 */
const ensureConfigDir = async function ensureConfigDir(): Promise<void> {
	const configDir = getConfigDir();
	await fs.mkdir(configDir, { recursive: true });
};

/**
 * Load the stored configuration
 */
export const loadConfig =
	async function loadConfig(): Promise<C15tConfig | null> {
		try {
			const configPath = getConfigPath();
			const content = await fs.readFile(configPath, 'utf-8');
			const config = JSON.parse(content) as C15tConfig;

			// Validate the config has required fields
			if (!config.accessToken) {
				return null;
			}

			return config;
		} catch {
			// File doesn't exist or is invalid
			return null;
		}
	};

/**
 * Save configuration to the store
 */
export const saveConfig = async function saveConfig(
	config: C15tConfig
): Promise<void> {
	await ensureConfigDir();

	const configPath = getConfigPath();
	const content = JSON.stringify(config, null, 2);

	await fs.writeFile(configPath, content, {
		// Read/write for owner only
		mode: 0o600,
	});
};

/**
 * Update specific fields in the configuration
 */
export const updateConfig = async function updateConfig(
	updates: Partial<C15tConfig>
): Promise<C15tConfig | null> {
	const existing = await loadConfig();
	if (!existing) {
		return null;
	}

	const updated = { ...existing, ...updates };
	await saveConfig(updated);
	return updated;
};

/**
 * Clear the stored configuration (logout)
 */
export const clearConfig = async function clearConfig(): Promise<void> {
	try {
		const configPath = getConfigPath();
		await fs.unlink(configPath);
	} catch {
		// Ignore if file doesn't exist
	}
};

/**
 * Check if the stored token is expired
 */
export const isTokenExpired = function isTokenExpired(
	config: C15tConfig
): boolean {
	if (!config.expiresAt) {
		// If no expiration, assume it's valid
		return false;
	}

	// Add a 5-minute buffer
	const buffer = 5 * 60 * 1000;
	return Date.now() > config.expiresAt - buffer;
};

/**
 * Get the current auth state
 */
export const getAuthState = async function getAuthState(): Promise<AuthState> {
	const config = await loadConfig();

	if (!config) {
		return {
			config: null,
			isExpired: false,
			isLoggedIn: false,
		};
	}

	return {
		config,
		isExpired: isTokenExpired(config),
		isLoggedIn: true,
	};
};

/**
 * Check if the user is logged in
 */
export const isLoggedIn = async function isLoggedIn(): Promise<boolean> {
	const state = await getAuthState();
	return state.isLoggedIn && !state.isExpired;
};

/**
 * Get the stored access token
 */
export const getAccessToken = async function getAccessToken(): Promise<
	string | null
> {
	const config = await loadConfig();
	if (!config || isTokenExpired(config)) {
		return null;
	}
	return config.accessToken;
};

/**
 * Get the selected project ID
 */
export const getSelectedInstanceId =
	async function getSelectedInstanceId(): Promise<string | null> {
		const config = await loadConfig();
		return config?.selectedInstanceId || null;
	};

/**
 * Set the selected project ID
 */
export const setSelectedInstanceId = async function setSelectedInstanceId(
	instanceId: string
): Promise<void> {
	await updateConfig({ selectedInstanceId: instanceId });
};

/**
 * Store tokens from a token response
 */
export const storeTokens = async function storeTokens(
	accessToken: string,
	options?: {
		refreshToken?: string;
		expiresIn?: number;
		email?: string;
	}
): Promise<void> {
	const config: C15tConfig = {
		accessToken,
		email: options?.email,
		expiresAt: options?.expiresIn
			? Date.now() + options.expiresIn * 1000
			: undefined,
		lastLogin: Date.now(),
		refreshToken: options?.refreshToken,
	};

	// Preserve the selected project from existing config
	const existing = await loadConfig();
	if (existing?.selectedInstanceId) {
		config.selectedInstanceId = existing.selectedInstanceId;
	}

	await saveConfig(config);
};
