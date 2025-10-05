import type { ActionDefinition } from '@segment/actions-core';

import type { Settings } from '../generated-types';
import { validateEvent } from '../validateEvent';
import type { Payload } from './generated-types';

const action: ActionDefinition<Settings, Payload> = {
	defaultSubscription: 'type = "group"',
	description: 'Group user in PostHog',
	fields: {
		company_name: {
			default: { '@path': '$.company_name' },
			description: 'Company Name',
			label: 'company_name',
			required: true,
			type: 'string',
		},
		distinct_id: {
			default: { '@path': '$.groupId' },
			description: 'Posthog unique ID for a user',
			label: 'Distinct ID',
			required: false,
			type: 'string',
		},
		groupId: {
			default: { '@path': '$.groupId' },
			description: 'The group id',
			label: 'Group ID',
			required: true,
			type: 'string',
		},
		properties: {
			default: { '@path': '$.traits' },
			description: 'Traits to associate with the group',
			label: 'Properties',
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
	},
	perform: (request, { payload }) => {
		const { company_name, distinct_id, groupId, properties, timestamp } =
			payload;

		type posthogGroupPayload = {
			api_key?: string;
			distinct_id: string;
			event: '$groupidentify';
			properties: Record<string, unknown>;
			timestamp?: string;
		};

		const json: posthogGroupPayload = {
			distinct_id: distinct_id || groupId,
			event: '$groupidentify',
			properties: {
				$group_key: company_name,
				$group_set: {
					date_joined: timestamp,
					name: company_name,
					...properties,
				},
				$group_type: 'organization',
				...properties,
			},
			timestamp: timestamp,
		};

		validateEvent(json);

		return request('https://eu.i.posthog.com/capture', {
			json,
			method: 'post',
		});
	},
	title: 'Group',
};

export default action;
