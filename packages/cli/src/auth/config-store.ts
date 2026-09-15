/**
 * Configuration store for c15t CLI credentials
 *
 * Stores authentication credentials and preferences in ~/.c15t/config.json
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { z } from 'zod';

import { PATHS, URLS } from '../constants';
import { getControlPlaneOrigin } from './base-url';
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
export const loadConfig = async function loadConfig(
	baseUrl?: string
): Promise<C15tConfig | null> {
	try {
		const configPath = getConfigPath();
		const content = await fs.readFile(configPath, 'utf-8');
		const config = z
			.object({
				accessToken: z.string().min(1),
				email: z.string().optional(),
				expiresAt: z.number().finite().optional(),
				lastLogin: z.number().finite().optional(),
				origin: z.string().url().optional(),
				refreshToken: z.string().optional(),
				selectedInstanceId: z.string().optional(),
			})
			.parse(JSON.parse(content));
		if (
			(config.origin ?? new URL(URLS.CONSENT_IO).origin) !==
			getControlPlaneOrigin(baseUrl)
		) {
			return null;
		}

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
	const content = JSON.stringify(
		{ ...config, origin: config.origin ?? getControlPlaneOrigin() },
		null,
		2
	);

	const temporaryPath = `${configPath}.${process.pid}.${Date.now()}.tmp`;
	try {
		await fs.writeFile(temporaryPath, content, { flag: 'wx', mode: 0o600 });
		await fs.rename(temporaryPath, configPath);
	} finally {
		await fs.rm(temporaryPath, { force: true });
	}
};

/**
 * Update specific fields in the configuration
 */
export const updateConfig = async function updateConfig(
	updates: Partial<C15tConfig>,
	baseUrl?: string
): Promise<C15tConfig | null> {
	const existing = await loadConfig(baseUrl);
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
	} catch (error) {
		if (
			!(error instanceof Error && 'code' in error && error.code === 'ENOENT')
		) {
			throw error;
		}
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

	// Reserve at most 10% of a known token lifetime for request clock skew.
	const lifetime =
		config.lastLogin === undefined
			? 50 * 60 * 1000
			: config.expiresAt - config.lastLogin;
	const buffer = Math.min(5 * 60 * 1000, Math.max(0, lifetime / 10));
	return Date.now() > config.expiresAt - buffer;
};

/**
 * Get the current auth state
 */
export const getAuthState = async function getAuthState(
	baseUrl?: string
): Promise<AuthState> {
	const config = await loadConfig(baseUrl);

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
export const isLoggedIn = async function isLoggedIn(
	baseUrl?: string
): Promise<boolean> {
	const state = await getAuthState(baseUrl);
	return state.isLoggedIn && !state.isExpired;
};

/**
 * Get the stored access token
 */
export const getAccessToken = async function getAccessToken(
	baseUrl?: string
): Promise<string | null> {
	const config = await loadConfig(baseUrl);
	if (!config || isTokenExpired(config)) {
		return null;
	}
	return config.accessToken;
};

/**
 * Get the selected project ID
 */
export const getSelectedInstanceId = async function getSelectedInstanceId(
	baseUrl?: string
): Promise<string | null> {
	const config = await loadConfig(baseUrl);
	return config?.selectedInstanceId || null;
};

/**
 * Set the selected project ID
 */
export const setSelectedInstanceId = async function setSelectedInstanceId(
	instanceId: string,
	baseUrl?: string
): Promise<void> {
	await updateConfig({ selectedInstanceId: instanceId }, baseUrl);
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
		baseUrl?: string;
	}
): Promise<void> {
	const baseUrl = options?.baseUrl;
	const config: C15tConfig = {
		accessToken,
		email: options?.email,
		expiresAt:
			options?.expiresIn === undefined
				? undefined
				: Date.now() + options.expiresIn * 1000,
		lastLogin: Date.now(),
		origin: getControlPlaneOrigin(baseUrl),
		refreshToken: options?.refreshToken,
	};

	// Preserve the selected project from existing config
	const existing = await loadConfig(baseUrl);
	if (existing?.selectedInstanceId && existing.accessToken === accessToken) {
		config.selectedInstanceId = existing.selectedInstanceId;
	}

	await saveConfig(config);
};
