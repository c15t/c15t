import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mock the fs module
vi.mock('node:fs/promises');

describe('config-store', () => {
	const mockHomeDir = '/mock/home';
	const mockConfigDir = path.join(mockHomeDir, '.c15t');
	const mockConfigPath = path.join(mockConfigDir, 'config.json');

	beforeEach(() => {
		vi.resetAllMocks();
		vi.spyOn(os, 'homedir').mockReturnValue(mockHomeDir);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('getConfigDir', () => {
		test('should return correct config directory path', async () => {
			const { getConfigDir } = await import('../../auth/config-store');
			expect(getConfigDir()).toBe(mockConfigDir);
		});
	});

	describe('getConfigPath', () => {
		test('should return correct config file path', async () => {
			const { getConfigPath } = await import('../../auth/config-store');
			expect(getConfigPath()).toBe(mockConfigPath);
		});
	});

	describe('loadConfig', () => {
		test('should return null when config file does not exist', async () => {
			vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));
			const { loadConfig } = await import('../../auth/config-store');

			const config = await loadConfig();
			expect(config).toBeNull();
		});

		test('should load and parse valid config', async () => {
			const mockConfig = {
				accessToken: 'test-token',
				refreshToken: 'refresh-token',
				expiresAt: Date.now() + 3600000,
			};
			vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));
			const { loadConfig } = await import('../../auth/config-store');

			const config = await loadConfig();
			expect(config).toEqual(mockConfig);
		});

		test('should return null for config without accessToken', async () => {
			const mockConfig = { refreshToken: 'refresh-token' };
			vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));
			const { loadConfig } = await import('../../auth/config-store');

			const config = await loadConfig();
			expect(config).toBeNull();
		});
	});

	describe('saveConfig', () => {
		test('should create config directory and save file', async () => {
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);
			vi.mocked(fs.writeFile).mockResolvedValue(undefined);
			const { saveConfig } = await import('../../auth/config-store');

			const config = { accessToken: 'test-token' };
			await saveConfig(config);

			expect(fs.mkdir).toHaveBeenCalledWith(mockConfigDir, { recursive: true });
			expect(fs.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				expect.stringContaining('accessToken'),
				expect.objectContaining({ mode: 0o600 })
			);
		});
	});

	describe('clearConfig', () => {
		test('should remove config file', async () => {
			vi.mocked(fs.unlink).mockResolvedValue(undefined);
			const { clearConfig } = await import('../../auth/config-store');

			await clearConfig();
			expect(fs.unlink).toHaveBeenCalledWith(mockConfigPath);
		});

		test('should not throw when file does not exist', async () => {
			vi.mocked(fs.unlink).mockRejectedValue(new Error('ENOENT'));
			const { clearConfig } = await import('../../auth/config-store');

			await expect(clearConfig()).resolves.not.toThrow();
		});
	});

	describe('isTokenExpired', () => {
		test('should return false when no expiresAt', async () => {
			const { isTokenExpired } = await import('../../auth/config-store');
			const config = { accessToken: 'test' };
			expect(isTokenExpired(config)).toBe(false);
		});

		test('should return false when token is not expired', async () => {
			const { isTokenExpired } = await import('../../auth/config-store');
			const config = {
				accessToken: 'test',
				expiresAt: Date.now() + 3600000, // 1 hour from now
			};
			expect(isTokenExpired(config)).toBe(false);
		});

		test('should return true when token is expired', async () => {
			const { isTokenExpired } = await import('../../auth/config-store');
			const config = {
				accessToken: 'test',
				expiresAt: Date.now() - 1000, // 1 second ago
			};
			expect(isTokenExpired(config)).toBe(true);
		});
	});
});
