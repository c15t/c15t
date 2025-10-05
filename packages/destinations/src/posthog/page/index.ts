import type { ActionDefinition } from '@segment/actions-core';

import type { Settings } from '../generated-types';
import { validateEvent } from '../validateEvent';
import type { Payload } from './generated-types';

const action: ActionDefinition<Settings, Payload> = {
	defaultSubscription: 'type = "page"',
	description: 'Send a page event to PostHog.',
	fields: {
		$browser: {
			default: { '@path': '$.context.browser' },
			description: 'The browser',
			label: 'Browser',
			required: false,
			type: 'string',
		},
		$browser_language: {
			default: { '@path': '$.context.locale' },
			description: 'The browser language',
			label: 'Browser Language',
			required: false,
			type: 'string',
		},
		$browser_version: {
			default: { '@path': '$.context.browser_version' },
			description: 'The browser version',
			label: 'Browser Version',
			required: false,
			type: 'number',
		},
		$current_url: {
			default: { '@path': '$.context.current_url' },
			description: 'The current URL',
			label: 'Current URL',
			required: false,
			type: 'string',
		},
		$device_type: {
			default: { '@path': '$.context.device_type' },
			description: 'The device type',
			label: 'Device Type',
			required: false,
			type: 'string',
		},
		$host: {
			default: { '@path': '$.context.host' },
			description: 'The host',
			label: 'Host',
			required: false,
			type: 'string',
		},
		$insert_id: {
			default: { '@path': '$.messageId' },
			description: 'Unique insert ID for the event',
			label: 'Insert ID',
			type: 'string',
		},
		$ip: {
			default: { '@path': '$.context.ip' },
			description: 'The IP address',
			label: 'IP Address',
			required: false,
			type: 'string',
		},
		$lib: {
			default: { '@path': '$.context.library.name' },
			description: 'The library that sent the event',
			label: 'Library',
			required: false,
			type: 'string',
		},
		$lib_version: {
			default: { '@path': '$.context.library.version' },
			description: 'The library version',
			label: 'Library Version',
			required: false,
			type: 'string',
		},
		$os: {
			default: { '@path': '$.context.os' },
			description: 'The browser language',
			label: 'Browser Language',
			required: false,
			type: 'string',
		},
		$os_version: {
			default: { '@path': '$.context.os_version' },
			description: 'The browser language',
			label: 'Browser Language',
			required: false,
			type: 'string',
		},
		$pathname: {
			default: { '@path': '$.context.pathname' },
			description: 'The pathname',
			label: 'Pathname',
			required: false,
			type: 'string',
		},
		$raw_user_agent: {
			default: { '@path': '$.context.userAgent' },
			description: 'The raw user agent',
			label: 'Raw User Agent',
			required: false,
			type: 'string',
		},
		$referrer: {
			default: { '@path': '$.context.current_url' },
			description: 'The referrer',
			label: 'Referrer',
			required: false,
			type: 'string',
		},
		$referring_domain: {
			default: { '@path': '$.context.host' },
			description: 'The referring domain',
			label: 'Referrer',
			required: false,
			type: 'string',
		},
		$screen_dpr: {
			default: { '@path': '$.context.screen_dpr' },
			description: 'The screen dpr',
			label: 'Screen DPR',
			required: false,
			type: 'number',
		},
		$screen_height: {
			default: { '@path': '$.context.screen_height' },
			description: 'The screen height',
			label: 'Screen Height',
			required: false,
			type: 'number',
		},
		$screen_width: {
			default: { '@path': '$.context.screen_width' },
			description: 'The screen width',
			label: 'Screen Width',
			required: false,
			type: 'number',
		},
		$session_id: {
			default: { '@path': '$.context.session_id' },
			description: 'The session ID',
			label: 'Session ID',
			type: 'string',
		},
		$time: {
			default: { '@path': '$.context.time' },
			description: 'The time in epoch format',
			label: 'Time',
			required: false,
			type: 'number',
		},
		$viewport_height: {
			default: { '@path': '$.context.viewport_height' },
			description: 'The viewport height',
			label: 'Screen Width',
			required: false,
			type: 'number',
		},
		$viewport_width: {
			default: { '@path': '$.context.viewport_width' },
			description: 'The viewport width',
			label: 'Screen Height',
			required: false,
			type: 'number',
		},
		$window_id: {
			default: { '@path': '$.context.window_id' },
			description: 'The window ID',
			label: 'Window ID',
			type: 'string',
		},
		anonymousId: {
			default: { '@path': '$.anonymousId' },
			description: 'An anonymous identifier',
			label: 'Anonymous ID',
			type: 'string',
		},
		distinct_id: {
			default: { '@path': '$.distinct_id' },
			description: 'Posthog unique ID for a user',
			label: 'Distinct ID',
			required: false,
			type: 'string',
		},
		timestamp: {
			default: { '@path': '$.timestamp' },
			description: 'The timestamp of the event',
			format: 'date-time',
			label: 'Timestamp',
			required: true,
			type: 'string',
		},
		title: {
			default: { '@path': '$.context.page.title' },
			description: 'The ID associated with the user',
			label: 'Title',
			required: false,
			type: 'string',
		},
		userId: {
			default: { '@path': '$.userId' },
			description: 'The ID associated with the user',
			label: 'User ID',
			required: false,
			type: 'string',
		},
		utm_campaign: {
			default: { '@path': '$.context.campaign.name' },
			description: 'UTM campaign tag (last-touch).',
			label: 'UTM Campaign',
			required: false,
			type: 'string',
		},
		utm_content: {
			default: { '@path': '$.context.campaign.content' },
			description: 'UTM content tag (last-touch).',
			label: 'UTM Content',
			required: false,
			type: 'string',
		},
		utm_medium: {
			default: { '@path': '$.context.campaign.medium' },
			description: 'UTM medium tag (last-touch).',
			label: 'UTM Medium',
			required: false,
			type: 'string',
		},
		utm_source: {
			default: { '@path': '$.context.campaign.source' },
			description: 'UTM source tag (last-touch).',
			label: 'UTM Source',
			required: false,
			type: 'string',
		},
		utm_term: {
			default: { '@path': '$.context.campaign.term' },
			description: 'UTM term tag (last-touch).',
			label: 'UTM Term',
			required: false,
			type: 'string',
		},
	},
	perform: (request, { payload }) => {
		const { anonymousId, distinct_id, timestamp, userId, ...properties } =
			payload;

		type posthogPagePayload = {
			api_key?: string;
			distinct_id: string;
			event: '$pageview';
			properties: Record<string, unknown>;
			timestamp?: string;
		};

		const json: posthogPagePayload = {
			distinct_id: distinct_id || userId || anonymousId,
			event: '$pageview',
			properties,
			timestamp,
		};

		validateEvent(json);

		return request('https://eu.i.posthog.com/capture', {
			json,
			method: 'POST',
		});
	},
	title: 'Page Event',
};

export default action;
