/**
 * @fileoverview Tests for the network blocker core logic
 */

import { describe, expect, it } from 'vitest';
import type { ConsentState } from '../../../types';
import { shouldBlockRequest } from '../core';
import type { NetworkBlockerConfig } from '../types';

const baseConsents: ConsentState = {
	necessary: true,
	functionality: false,
	experience: false,
	marketing: false,
	measurement: false,
};

function createConfig(
	config: Partial<NetworkBlockerConfig> = {}
): NetworkBlockerConfig {
	return {
		enabled: true,
		rules: [],
		...config,
	} as NetworkBlockerConfig;
}

describe('shouldBlockRequest', () => {
	it('should return false when config is undefined', () => {
		const result = shouldBlockRequest(
			{
				url: 'https://analytics.example.com/collect',
				method: 'GET',
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
					domain: 'analytics.example.com',
					category: 'marketing',
				},
			],
		});

		const result = shouldBlockRequest(
			{
				url: 'https://analytics.example.com/collect',
				method: 'GET',
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
				url: 'https://analytics.example.com/collect',
				method: 'GET',
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
					id: 'ga-marketing',
					domain: 'google-analytics.com',
					category: 'marketing',
				},
			],
		});

		const result = shouldBlockRequest(
			{
				url: 'https://www.google-analytics.com/collect',
				method: 'GET',
			},
			consents,
			config
		);

		expect(result).toEqual({
			shouldBlock: true,
			rule: {
				id: 'ga-marketing',
				domain: 'google-analytics.com',
				category: 'marketing',
			},
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
					id: 'ga-marketing',
					domain: 'google-analytics.com',
					category: 'marketing',
				},
			],
		});

		const result = shouldBlockRequest(
			{
				url: 'https://www.google-analytics.com/collect',
				method: 'GET',
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
					id: 'ga-marketing',
					domain: 'google-analytics.com',
					pathIncludes: '/collect',
					category: 'marketing',
				},
			],
		});

		const result = shouldBlockRequest(
			{
				url: 'https://stats.google-analytics.com/r/collect?v=1',
				method: 'GET',
			},
			consents,
			config
		);

		expect(result).toEqual({
			shouldBlock: true,
			rule: {
				id: 'ga-marketing',
				domain: 'google-analytics.com',
				pathIncludes: '/collect',
				category: 'marketing',
			},
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
					id: 'api-experience',
					domain: 'api.example.com',
					methods: ['POST'],
					category: 'experience',
				},
			],
		});

		// Non-matching method should not block
		const getResult = shouldBlockRequest(
			{
				url: 'https://api.example.com/events',
				method: 'GET',
			},
			consents,
			config
		);

		// Matching method with missing consent should block
		const postResult = shouldBlockRequest(
			{
				url: 'https://api.example.com/events',
				method: 'POST',
			},
			consents,
			config
		);

		expect(getResult).toEqual({ shouldBlock: false });
		expect(postResult).toEqual({
			shouldBlock: true,
			rule: {
				id: 'api-experience',
				domain: 'api.example.com',
				methods: ['POST'],
				category: 'experience',
			},
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
					id: 'ga-marketing',
					domain: 'google-analytics.com',
					category: 'marketing',
				},
			],
		});

		const result = shouldBlockRequest(
			{
				url: '::not-a-valid-url::',
				method: 'GET',
			},
			consents,
			config
		);

		expect(result).toEqual({ shouldBlock: false });
	});
});
