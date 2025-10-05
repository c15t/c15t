import type { DestinationDefinition } from '@segment/actions-core';

import { defaultValues } from '@segment/actions-core';

import type { Settings } from './generated-types';

import group from './group';
import identify from './identify';
import page from './page';
import track from './track';

const presets: DestinationDefinition['presets'] = [
	{
		mapping: defaultValues(track.fields),
		name: 'Track Event',
		partnerAction: 'track',
		subscribe: 'type = "track"',
		type: 'automatic',
	},
	{
		mapping: defaultValues(page.fields),
		name: 'Track Page Views',
		partnerAction: 'page',
		subscribe: 'type = "page"',
		type: 'automatic',
	},
	{
		mapping: defaultValues(identify.fields),
		name: 'Identify User',
		partnerAction: 'identify',
		subscribe: 'type = "identify"',
		type: 'automatic',
	},
	{
		mapping: defaultValues(group.fields),
		name: 'Identify Group',
		partnerAction: 'group',
		subscribe: 'type = "group"',
		type: 'automatic',
	},
];

const destination: DestinationDefinition<Settings> = {
	actions: {
		group,
		identify,
		page,
		track,
	},
	authentication: {
		fields: {
			apiKey: {
				description: 'Your PostHog API Key',
				label: 'API Key',
				required: true,
				type: 'password',
			},
		},
		scheme: 'custom',
		testAuthentication: () => {
			return true;
		},
	},
	extendRequest(test) {
		return {
			headers: { 'Content-Type': 'application/json' },
			json: {
				api_key: test.settings.apiKey,
			},
		};
	},
	mode: 'cloud',
	name: 'PostHog',
	presets,
	slug: 'actions-posthog',
};

export default destination;
