import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	clearConfig,
	getConfigDir,
	getConfigPath,
	isTokenExpired,
	loadConfig,
	saveConfig,
} from '../../auth/config-store';

describe('config-store', () => {
	let mockHomeDir: string;
	let mockConfigDir: string;
	let mockConfigPath: string;

	beforeEach(async () => {
		mockHomeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'c15t-home-'));
		mockConfigDir = path.join(mockHomeDir, '.c15t');
		mockConfigPath = path.join(mockConfigDir, 'config.json');
		vi.spyOn(os, 'homedir').mockReturnValue(mockHomeDir);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await fs.rm(mockHomeDir, { force: true, recursive: true });
	});

	describe('getConfigDir', () => {
		test('should return correct config directory path', () => {
			expect(getConfigDir()).toBe(mockConfigDir);
		});
	});

	describe('getConfigPath', () => {
		test('should return correct config file path', () => {
			expect(getConfigPath()).toBe(mockConfigPath);
		});
	});

	describe('loadConfig', () => {
		test('should return null when config file does not exist', async () => {
			const config = await loadConfig();
			expect(config).toBeNull();
		});

		test('should load and parse valid config', async () => {
			const mockConfig = {
				accessToken: 'test-token',
				expiresAt: Date.now() + 3600000,
				refreshToken: 'refresh-token',
			};
			await fs.mkdir(mockConfigDir, { recursive: true });
			await fs.writeFile(mockConfigPath, JSON.stringify(mockConfig));

			const config = await loadConfig();
			expect(config).toEqual(mockConfig);
		});

		test('should return null for config without accessToken', async () => {
			const mockConfig = { refreshToken: 'refresh-token' };
			await fs.mkdir(mockConfigDir, { recursive: true });
			await fs.writeFile(mockConfigPath, JSON.stringify(mockConfig));

			const config = await loadConfig();
			expect(config).toBeNull();
		});
	});

	describe('saveConfig', () => {
		test('should create config directory and save file', async () => {
			const config = { accessToken: 'test-token' };
			await saveConfig(config);

			const saved = await fs.readFile(mockConfigPath, 'utf-8');
			const mode = (await fs.stat(mockConfigPath)).mode % 0o1000;
			expect(saved).toContain('accessToken');
			expect(mode).toBe(0o600);
		});
	});

	describe('clearConfig', () => {
		test('should remove config file', async () => {
			await fs.mkdir(mockConfigDir, { recursive: true });
			await fs.writeFile(mockConfigPath, '{}');

			await clearConfig();
			await expect(fs.access(mockConfigPath)).rejects.toThrow();
		});

		test('should not throw when file does not exist', async () => {
			await expect(clearConfig()).resolves.not.toThrow();
		});
	});

	describe('isTokenExpired', () => {
		test('should return false when no expiresAt', () => {
			const config = { accessToken: 'test' };
			expect(isTokenExpired(config)).toBe(false);
		});

		test('should return false when token is not expired', () => {
			const config = {
				accessToken: 'test',
				// 1 hour from now
				expiresAt: Date.now() + 3600000,
			};
			expect(isTokenExpired(config)).toBe(false);
		});

		test('should return true when token is expired', () => {
			const config = {
				accessToken: 'test',
				// 1 second ago
				expiresAt: Date.now() - 1000,
			};
			expect(isTokenExpired(config)).toBe(true);
		});
	});
});
