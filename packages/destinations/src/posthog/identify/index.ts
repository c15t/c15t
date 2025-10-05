import type { ActionDefinition } from '@segment/actions-core';

import type { Settings } from '../generated-types';
import { validateEvent } from '../validateEvent';
import type { Payload } from './generated-types';

const action: ActionDefinition<Settings, Payload> = {
	defaultSubscription: 'type = "identify"',
	description: 'Identify user in PostHog',
	fields: {
		anonymousId: {
			default: { '@path': '$.anonymousId' },
			description: 'An anonymous identifier',
			label: 'Anonymous ID',
			type: 'string',
		},
		distinct_id: {
			default: { '@path': '$.anonymousId' },
			description: 'Posthog unique ID for a user',
			label: 'Distinct ID',
			required: false,
			type: 'string',
		},
		properties: {
			default: { '@path': '$.traits' },
			description: 'Traits to associate with the user',
			label: 'Properties',
			required: false,
			type: 'object',
		},
		timestamp: {
			default: { '@path': '$.timestamp' },
			description: 'The timestamp of the event',
			format: 'date-time',
			label: 'Timestamp',
			required: true,
			type: 'string',
		},
		userId: {
			default: { '@path': '$.userId' },
			description: 'The ID associated with the user',
			label: 'User ID',
			required: false,
			type: 'string',
		},
	},
	perform: (request, { payload }) => {
		const { anonymousId, distinct_id, properties, timestamp, userId } = payload;

		type posthogIdentifyPayload = {
			api_key?: string;
			distinct_id: string;
			event: '$identify';
			properties: {
				$set?: Record<string, unknown>;
			};
			timestamp?: string;
		};

		const json: posthogIdentifyPayload = {
			distinct_id: distinct_id || userId || anonymousId,
			event: '$identify',
			properties: {
				$set: properties,
			},
			timestamp,
		};

		validateEvent(json);

		return request('https://eu.i.posthog.com/capture', {
			json,
			method: 'post',
		});
	},
	title: 'Identify',
};

export default action;
