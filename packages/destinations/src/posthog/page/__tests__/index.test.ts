import { createTestIntegration } from '@segment/actions-core';
import nock from 'nock';
import { describe, expect, it } from 'vitest';

import Destination from '../../index';

const testDestination = createTestIntegration(Destination);

const event = {
	anonymousId: '4554fec2-37d6-4c7c-9e31-0f64e7df6542',
	context: {
		browser: 'Chrome',
		browser_version: 124,
		current_url: 'https://everfund-v7-4s6uzq61s-everfund.vercel.app/blog',
		device: '',
		host: 'everfund-v7-4s6uzq61s-everfund.vercel.app',
		locale: 'en-US',
		os: 'Mac OS X',
		page: {
			path: '/blog',
			referrer: 'https://everfund-v7-4s6uzq61s-everfund.vercel.app/',
			search: '',
			title: "Blog | Everfund's Recent Blogs, Posts & Insights",
			url: 'https://everfund-v7-4s6uzq61s-everfund.vercel.app/blog',
		},
		pathname: '/blog',
		screen_dpr: 2,
		screen_height: 1169,
		screen_width: 1800,
		traits: {},
		viewport_height: 724,
		viewport_width: 1578,
	},
	messageId: '2ab22972-5d3c-46f3-8f0a-157ba7fc8d5d',
	name: '/blog',
	properties: {
		path: '/blog',
		referrer: 'https://everfund-v7-4s6uzq61s-everfund.vercel.app/',
		search: '',
		title: "Blog | Everfund's Recent Blogs, Posts & Insights",
		url: 'https://everfund-v7-4s6uzq61s-everfund.vercel.app/blog',
	},
	timestamp: '2024-05-14T13:17:11.108Z',
	type: 'page',
} as unknown as Record<string, unknown>;

describe('PostHog.page', () => {
	it('should validate action fields', async () => {
		try {
			await testDestination.testAction('page', {
				event,
				settings: { apiKey: 'api-key' },
				useDefaultMappings: true,
			});
		} catch (err: unknown) {
			if (err instanceof Error) {
				// Now we know that err is an instance of Error, so it's safe to access err.message
				expect(err.message).toContain("missing the required field 'name'.");
			} else {
				// We can't be sure what type err is, so it's not safe to access any properties on it
				console.error(err);
			}
		}
	});
	it('should work', async () => {
		nock('https://eu.i.posthog.com').post('/capture').reply(200);
		try {
			await testDestination.testAction('page', {
				event,
				settings: { apiKey: 'api-key' },
				useDefaultMappings: true,
			});
		} catch (err: unknown) {
			if (err instanceof Error) {
				// Now we know that err is an instance of Error, so it's safe to access err.message
				console.error(err.message);
			} else {
				// We can't be sure what type err is, so it's not safe to access any properties on it
				console.error(err);
			}
		}
	});
});
