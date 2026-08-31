/**
 * @file Tests for the network blocker core logic
 */

import { describe, expect, it } from 'vitest';

import type { ConsentState } from '../../../types';
import { shouldBlockRequest } from '../core';
import type { NetworkBlockerConfig } from '../types';

const baseConsents: ConsentState = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};

const createConfig = function createConfig(
	config: Partial<NetworkBlockerConfig> = {}
): NetworkBlockerConfig {
	return {
		enabled: true,
		rules: [],
		...config,
	} as NetworkBlockerConfig;
};

describe('shouldBlockRequest', () => {
	it('should return false when config is undefined', () => {
		const result = shouldBlockRequest(
			{
				method: 'GET',
				url: 'https://analytics.example.com/collect',
			},
			baseConsents,
			undefined
		);

		expect(result).toEqual({ shouldBlock: false });
	});

	it('should return false when blocker is disabled', () => {
		const config = createConfig({
			enabled: false,
			rules: [
				{
					category: 'marketing',
					domain: 'analytics.example.com',
				},
			],
		});

		const result = shouldBlockRequest(
			{
				method: 'GET',
				url: 'https://analytics.example.com/collect',
			},
			baseConsents,
			config
		);

		expect(result).toEqual({ shouldBlock: false });
	});

	it('should return false when no rules are configured', () => {
		const config = createConfig({
			enabled: true,
			rules: [],
		});

		const result = shouldBlockRequest(
			{
				method: 'GET',
				url: 'https://analytics.example.com/collect',
			},
			baseConsents,
			config
		);

		expect(result).toEqual({ shouldBlock: false });
	});

	it('should block requests when consent is missing for a matching rule', () => {
		const consents: ConsentState = {
			...baseConsents,
			marketing: false,
		};

		const config = createConfig({
			rules: [
				{
					category: 'marketing',
					domain: 'google-analytics.com',
					id: 'ga-marketing',
				},
			],
		});

		const result = shouldBlockRequest(
			{
				method: 'GET',
				url: 'https://www.google-analytics.com/collect',
			},
			consents,
			config
		);

		expect(result).toEqual({
			rule: {
				category: 'marketing',
				domain: 'google-analytics.com',
				id: 'ga-marketing',
			},
			shouldBlock: true,
		});
	});

	it('should allow requests when consent is granted for a matching rule', () => {
		const consents: ConsentState = {
			...baseConsents,
			marketing: true,
		};

		const config = createConfig({
			rules: [
				{
					category: 'marketing',
					domain: 'google-analytics.com',
					id: 'ga-marketing',
				},
			],
		});

		const result = shouldBlockRequest(
			{
				method: 'GET',
				url: 'https://www.google-analytics.com/collect',
			},
			consents,
			config
		);

		expect(result).toEqual({ shouldBlock: false });
	});

	it('should match subdomains and pathIncludes correctly', () => {
		const consents: ConsentState = {
			...baseConsents,
			marketing: false,
		};

		const config = createConfig({
			rules: [
				{
					category: 'marketing',
					domain: 'google-analytics.com',
					id: 'ga-marketing',
					pathIncludes: '/collect',
				},
			],
		});

		const result = shouldBlockRequest(
			{
				method: 'GET',
				url: 'https://stats.google-analytics.com/r/collect?v=1',
			},
			consents,
			config
		);

		expect(result).toEqual({
			rule: {
				category: 'marketing',
				domain: 'google-analytics.com',
				id: 'ga-marketing',
				pathIncludes: '/collect',
			},
			shouldBlock: true,
		});
	});

	it('should respect HTTP method filters on rules', () => {
		const consents: ConsentState = {
			...baseConsents,
			experience: false,
		};

		const config = createConfig({
			rules: [
				{
					category: 'experience',
					domain: 'api.example.com',
					id: 'api-experience',
					methods: ['POST'],
				},
			],
		});

		// Non-matching method should not block
		const getResult = shouldBlockRequest(
			{
				method: 'GET',
				url: 'https://api.example.com/events',
			},
			consents,
			config
		);

		// Matching method with missing consent should block
		const postResult = shouldBlockRequest(
			{
				method: 'POST',
				url: 'https://api.example.com/events',
			},
			consents,
			config
		);

		expect(getResult).toEqual({ shouldBlock: false });
		expect(postResult).toEqual({
			rule: {
				category: 'experience',
				domain: 'api.example.com',
				id: 'api-experience',
				methods: ['POST'],
			},
			shouldBlock: true,
		});
	});

	it('should return false for invalid URLs that cannot be parsed', () => {
		const consents: ConsentState = {
			...baseConsents,
			marketing: false,
		};

		const config = createConfig({
			rules: [
				{
					category: 'marketing',
					domain: 'google-analytics.com',
					id: 'ga-marketing',
				},
			],
		});

		const result = shouldBlockRequest(
			{
				method: 'GET',
				url: '::not-a-valid-url::',
			},
			consents,
			config
		);

		expect(result).toEqual({ shouldBlock: false });
	});
});
