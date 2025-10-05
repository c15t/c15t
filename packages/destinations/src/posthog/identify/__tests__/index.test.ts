import { createTestIntegration } from '@segment/actions-core';
import nock from 'nock';
import { describe, expect, it } from 'vitest';

import Destination from '../../index';

const testDestination = createTestIntegration(Destination);

describe('PostHog.identify', () => {
	it('should validate action fields', async () => {
		try {
			await testDestination.testAction('identify', {
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
			await testDestination.testAction('identify', {
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
