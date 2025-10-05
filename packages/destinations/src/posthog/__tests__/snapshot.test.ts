import { createTestEvent, createTestIntegration } from '@segment/actions-core';
import nock from 'nock';
import { describe, expect, it } from 'vitest';

import destination from '../index';
import { generateTestData } from '../testData';

const testDestination = createTestIntegration(destination);
const destinationSlug = 'post-hog';

describe(`Testing snapshot for ${destinationSlug} destination:`, () => {
	for (const actionSlug in destination.actions) {
		it(`${actionSlug} action - required fields`, async () => {
			const seedName = `${destinationSlug}#${actionSlug}`;
			const action = destination.actions[actionSlug];

			if (!action) {
				return null;
			}

			const [eventData, settingsData] = generateTestData(
				seedName,
				destination,
				action,
				true
			);

			nock(/.*/).persist().get(/.*/).reply(200);
			nock(/.*/).persist().post(/.*/).reply(200);
			nock(/.*/).persist().put(/.*/).reply(200);

			const event = createTestEvent({
				properties: eventData,
			});

			const responses = await testDestination.testAction(actionSlug, {
				auth: undefined,
				event: event,
				mapping: event.properties,
				settings: settingsData,
			});

			if (!responses[0]) {
				return null;
			}

			const request = responses[0].request;
			const rawBody = await request.text();

			try {
				const json = JSON.parse(rawBody);
				expect(json).toMatchSnapshot({
					timestamp: expect.any(String),
				});
				return;
			} catch (_err) {
				expect(rawBody).toMatchSnapshot();
			}

			expect(request.headers).toMatchSnapshot();
		});

		it(`${actionSlug} action - all fields`, async () => {
			const seedName = `${destinationSlug}#${actionSlug}`;
			const action = destination.actions[actionSlug];
			if (!action) {
				return null;
			}
			const [eventData, settingsData] = generateTestData(
				seedName,
				destination,
				action,
				false
			);

			nock(/.*/).persist().get(/.*/).reply(200);
			nock(/.*/).persist().post(/.*/).reply(200);
			nock(/.*/).persist().put(/.*/).reply(200);

			const event = createTestEvent({
				properties: eventData,
			});

			const responses = await testDestination.testAction(actionSlug, {
				auth: undefined,
				event: event,
				mapping: event.properties,
				settings: settingsData,
			});

			if (!responses[0]) {
				return null;
			}

			const request = responses[0].request;
			const rawBody = await request.text();

			try {
				const json = JSON.parse(rawBody);
				expect(json).toMatchSnapshot({
					timestamp: expect.any(String),
				});
				return;
			} catch (_err) {
				expect(rawBody).toMatchSnapshot();
			}
		});
	}
});
