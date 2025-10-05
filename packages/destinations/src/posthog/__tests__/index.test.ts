import { createTestIntegration } from '@segment/actions-core';
import { describe, expect, it } from 'vitest';

import Definition from '../index';

const testDestination = createTestIntegration(Definition);

describe('PostHog', () => {
	describe('testAuthentication', () => {
		it('should validate authentication inputs', async () => {
			const authData = {
				apiKey: 'api-key',
			};

			await expect(
				testDestination.testAuthentication(authData)
			).resolves.not.toThrowError();
		});
	});
});
