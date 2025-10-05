/**
 * @fileoverview Unit tests for core analytics types.
 */

import { describe, expect, it } from 'vitest';
import type {
	AliasAction,
	AnalyticsConfig,
	AnalyticsConsent,
	AnalyticsEvent,
	AnalyticsEventType,
	AnalyticsState,
	BaseEventProperties,
	CommonAction,
	CommonProperties,
	ConsentPurpose,
	EventOptions,
	GroupAction,
	GroupTraits,
	IdentifyAction,
	PageAction,
	PageEventProperties,
	QueueConfig,
	TrackAction,
	TrackEventProperties,
	UploadRequest,
	UserTraits,
} from '../types';
import {
	DEFAULT_ANALYTICS_CONFIG,
	DEFAULT_CONSENT,
	DEFAULT_QUEUE_CONFIG,
	EVENT_PURPOSE_MAP,
} from '../types';

describe('ConsentPurpose', () => {
	it('should accept all valid consent purposes', () => {
		const purposes: ConsentPurpose[] = [
			'necessary',
			'measurement',
			'marketing',
			'functionality',
			'experience',
		];

		purposes.forEach((purpose) => {
			expect(typeof purpose).toBe('string');
		});
	});
});

describe('AnalyticsConsent', () => {
	it('should have all required consent purposes', () => {
		const consent: AnalyticsConsent = {
			necessary: true,
			measurement: false,
			marketing: false,
			functionality: false,
			experience: false,
		};

		expect(consent.necessary).toBe(true);
		expect(consent.measurement).toBe(false);
		expect(consent.marketing).toBe(false);
		expect(consent.functionality).toBe(false);
		expect(consent.experience).toBe(false);
	});

	it('should allow optional dateConsented field', () => {
		const consent: AnalyticsConsent = {
			necessary: true,
			measurement: true,
			marketing: false,
			functionality: false,
			experience: false,
			dateConsented: '2024-01-01T00:00:00Z',
		};

		expect(consent.dateConsented).toBe('2024-01-01T00:00:00Z');
	});
});

describe('AnalyticsEventType', () => {
	it('should accept all valid event types', () => {
		const eventTypes: AnalyticsEventType[] = [
			'track',
			'page',
			'identify',
			'group',
			'alias',
			'consent',
		];

		eventTypes.forEach((type) => {
			expect(typeof type).toBe('string');
		});
	});
});

describe('BaseEventProperties', () => {
	it('should accept various property types', () => {
		const properties: BaseEventProperties = {
			string: 'value',
			number: 42,
			boolean: true,
			null: null,
			undefined: undefined,
			date: new Date('2024-01-01T00:00:00Z'),
			nested: { key: 'value' },
			array: [{ item: 1 }, { item: 2 }],
		};

		expect(properties.string).toBe('value');
		expect(properties.number).toBe(42);
		expect(properties.boolean).toBe(true);
		expect(properties.null).toBeNull();
		expect(properties.undefined).toBeUndefined();
		expect(properties.date).toBeInstanceOf(Date);
		expect(properties.nested).toEqual({ key: 'value' });
		expect(properties.array).toEqual([{ item: 1 }, { item: 2 }]);
	});
});

describe('TrackEventProperties', () => {
	it('should extend BaseEventProperties with track-specific fields', () => {
		const properties: TrackEventProperties = {
			category: 'user-action',
			label: 'button-click',
			value: 100,
			custom: 'data',
		};

		expect(properties.category).toBe('user-action');
		expect(properties.label).toBe('button-click');
		expect(properties.value).toBe(100);
		expect(properties.custom).toBe('data');
	});
});

describe('PageEventProperties', () => {
	it('should extend BaseEventProperties with page-specific fields', () => {
		const properties: PageEventProperties = {
			path: '/home',
			title: 'Home Page',
			url: 'https://example.com/home',
			referrer: 'https://google.com',
			custom: 'data',
		};

		expect(properties.path).toBe('/home');
		expect(properties.title).toBe('Home Page');
		expect(properties.url).toBe('https://example.com/home');
		expect(properties.referrer).toBe('https://google.com');
		expect(properties.custom).toBe('data');
	});
});

describe('UserTraits', () => {
	it('should extend BaseEventProperties with user-specific fields', () => {
		const traits: UserTraits = {
			email: 'user@example.com',
			name: 'John Doe',
			phone: '+1234567890',
			avatar: 'https://example.com/avatar.jpg',
			plan: 'premium',
			custom: 'data',
		};

		expect(traits.email).toBe('user@example.com');
		expect(traits.name).toBe('John Doe');
		expect(traits.phone).toBe('+1234567890');
		expect(traits.avatar).toBe('https://example.com/avatar.jpg');
		expect(traits.plan).toBe('premium');
		expect(traits.custom).toBe('data');
	});
});

describe('GroupTraits', () => {
	it('should extend BaseEventProperties with group-specific fields', () => {
		const traits: GroupTraits = {
			name: 'Acme Corp',
			plan: 'enterprise',
			size: 100,
			custom: 'data',
		};

		expect(traits.name).toBe('Acme Corp');
		expect(traits.plan).toBe('enterprise');
		expect(traits.size).toBe(100);
		expect(traits.custom).toBe('data');
	});
});

describe('CommonProperties', () => {
	it('should extend BaseEventProperties with common fields', () => {
		const properties: CommonProperties = {
			app_version: '1.0.0',
			environment: 'production',
			custom: 'data',
		};

		expect(properties.app_version).toBe('1.0.0');
		expect(properties.environment).toBe('production');
		expect(properties.custom).toBe('data');
	});
});

describe('EventOptions', () => {
	it('should have optional override fields', () => {
		const options: EventOptions = {
			userId: 'user-123',
			anonymousId: 'anon-123',
			timestamp: new Date('2024-01-01T00:00:00Z'),
			custom: 'data',
		};

		expect(options.userId).toBe('user-123');
		expect(options.anonymousId).toBe('anon-123');
		expect(options.timestamp).toBeInstanceOf(Date);
		expect(options.custom).toBe('data');
	});
});

describe('AnalyticsEvent', () => {
	it('should have required base properties', () => {
		const event: AnalyticsEvent = {
			type: 'track',
			anonymousId: 'anon-123',
			sessionId: 'session-123',
			consent: {
				necessary: true,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			},
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
			properties: { button: 'cta' },
			context: {
				page: {
					path: '/home',
					title: 'Home',
					url: 'https://example.com/home',
				},
				userAgent: 'Mozilla/5.0...',
				ip: '192.168.1.1',
				locale: 'en-US',
				timezone: 'UTC',
			},
		};

		expect(event.type).toBe('track');
		expect(event.anonymousId).toBe('anon-123');
		expect(event.sessionId).toBe('session-123');
		expect(event.consent).toBeDefined();
		expect(event.timestamp).toBe('2024-01-01T00:00:00Z');
		expect(event.messageId).toBe('msg-123');
		expect(event.properties).toEqual({ button: 'cta' });
		expect(event.context).toBeDefined();
	});

	it('should allow optional user identification', () => {
		const event: AnalyticsEvent = {
			type: 'track',
			name: 'Button Clicked',
			userId: 'user-123',
			anonymousId: 'anon-123',
			sessionId: 'session-123',
			consent: {
				necessary: true,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			},
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
			properties: { button: 'cta' },
			context: {
				page: {
					path: '/home',
					title: 'Home',
					url: 'https://example.com/home',
				},
			},
		};

		expect(event.name).toBe('Button Clicked');
		expect(event.userId).toBe('user-123');
	});
});

describe('Action Types', () => {
	it('should create TrackAction', () => {
		const action: TrackAction = {
			name: 'Button Clicked',
			properties: { button: 'cta', value: 100 },
			options: { userId: 'user-123' },
		};

		expect(action.name).toBe('Button Clicked');
		expect(action.properties).toEqual({ button: 'cta', value: 100 });
		expect(action.options).toEqual({ userId: 'user-123' });
	});

	it('should create PageAction', () => {
		const action: PageAction = {
			name: 'Home Page',
			properties: { path: '/home', title: 'Home' },
			options: { userId: 'user-123' },
		};

		expect(action.name).toBe('Home Page');
		expect(action.properties).toEqual({ path: '/home', title: 'Home' });
		expect(action.options).toEqual({ userId: 'user-123' });
	});

	it('should create IdentifyAction', () => {
		const action: IdentifyAction = {
			userId: 'user-123',
			traits: { email: 'user@example.com', name: 'John Doe' },
			options: { timestamp: new Date('2024-01-01T00:00:00Z') },
		};

		expect(action.userId).toBe('user-123');
		expect(action.traits).toEqual({
			email: 'user@example.com',
			name: 'John Doe',
		});
		expect(action.options).toBeDefined();
	});

	it('should create GroupAction', () => {
		const action: GroupAction = {
			groupId: 'group-123',
			traits: { name: 'Acme Corp', plan: 'enterprise' },
			options: { userId: 'user-123' },
		};

		expect(action.groupId).toBe('group-123');
		expect(action.traits).toEqual({ name: 'Acme Corp', plan: 'enterprise' });
		expect(action.options).toEqual({ userId: 'user-123' });
	});

	it('should create AliasAction', () => {
		const action: AliasAction = {
			to: 'new-id',
			from: 'old-id',
			options: { userId: 'user-123' },
		};

		expect(action.to).toBe('new-id');
		expect(action.from).toBe('old-id');
		expect(action.options).toEqual({ userId: 'user-123' });
	});

	it('should create CommonAction', () => {
		const action: CommonAction = {
			properties: { app_version: '1.0.0', environment: 'production' },
		};

		expect(action.properties).toEqual({
			app_version: '1.0.0',
			environment: 'production',
		});
	});
});

describe('AnalyticsState', () => {
	it('should have all required state properties', () => {
		const state: AnalyticsState = {
			anonymousId: 'anon-123',
			userTraits: { email: 'user@example.com' },
			groupTraits: { name: 'Acme Corp' },
			commonProperties: { app_version: '1.0.0' },
			consent: {
				necessary: true,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			},
			sessionId: 'session-123',
			windowId: 'window-123',
			loaded: true,
		};

		expect(state.anonymousId).toBe('anon-123');
		expect(state.userTraits).toEqual({ email: 'user@example.com' });
		expect(state.groupTraits).toEqual({ name: 'Acme Corp' });
		expect(state.commonProperties).toEqual({ app_version: '1.0.0' });
		expect(state.consent).toBeDefined();
		expect(state.sessionId).toBe('session-123');
		expect(state.windowId).toBe('window-123');
		expect(state.loaded).toBe(true);
	});

	it('should allow optional user and group IDs', () => {
		const state: AnalyticsState = {
			userId: 'user-123',
			groupId: 'group-123',
			anonymousId: 'anon-123',
			userTraits: {},
			groupTraits: {},
			commonProperties: {},
			consent: {
				necessary: true,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			},
			sessionId: 'session-123',
			windowId: 'window-123',
			loaded: false,
		};

		expect(state.userId).toBe('user-123');
		expect(state.groupId).toBe('group-123');
		expect(state.loaded).toBe(false);
	});
});

describe('UploadRequest', () => {
	it('should have events and metadata', () => {
		const request: UploadRequest = {
			events: [
				{
					type: 'track',
					anonymousId: 'anon-123',
					sessionId: 'session-123',
					consent: {
						necessary: true,
						measurement: false,
						marketing: false,
						functionality: false,
						experience: false,
					},
					timestamp: '2024-01-01T00:00:00Z',
					messageId: 'msg-123',
					properties: { button: 'cta' },
					context: {
						page: {
							path: '/home',
							title: 'Home',
							url: 'https://example.com/home',
						},
					},
				},
			],
			sentAt: '2024-01-01T00:00:00Z',
			version: '1.0.0',
		};

		expect(request.events).toHaveLength(1);
		expect(request.sentAt).toBe('2024-01-01T00:00:00Z');
		expect(request.version).toBe('1.0.0');
	});
});

describe('AnalyticsConfig', () => {
	it('should have upload URL and optional settings', () => {
		const config: AnalyticsConfig = {
			uploadUrl: '/api/analytics',
			debug: true,
			debounceInterval: 500,
			offlineQueue: true,
			retryEnabled: true,
			maxRetries: 5,
		};

		expect(config.uploadUrl).toBe('/api/analytics');
		expect(config.debug).toBe(true);
		expect(config.debounceInterval).toBe(500);
		expect(config.offlineQueue).toBe(true);
		expect(config.retryEnabled).toBe(true);
		expect(config.maxRetries).toBe(5);
	});
});

describe('QueueConfig', () => {
	it('should have queue settings', () => {
		const config: QueueConfig = {
			maxBatchSize: 100,
			debounceInterval: 1000,
			enableDeduplication: true,
			enableOfflineQueue: true,
			maxOfflineEvents: 2000,
		};

		expect(config.maxBatchSize).toBe(100);
		expect(config.debounceInterval).toBe(1000);
		expect(config.enableDeduplication).toBe(true);
		expect(config.enableOfflineQueue).toBe(true);
		expect(config.maxOfflineEvents).toBe(2000);
	});
});

describe('Constants', () => {
	it('should have correct EVENT_PURPOSE_MAP', () => {
		expect(EVENT_PURPOSE_MAP.track).toBe('measurement');
		expect(EVENT_PURPOSE_MAP.page).toBe('measurement');
		expect(EVENT_PURPOSE_MAP.identify).toBe('measurement');
		expect(EVENT_PURPOSE_MAP.group).toBe('measurement');
		expect(EVENT_PURPOSE_MAP.alias).toBe('measurement');
		expect(EVENT_PURPOSE_MAP.consent).toBe('necessary');
	});

	it('should have correct DEFAULT_CONSENT', () => {
		expect(DEFAULT_CONSENT.necessary).toBe(true);
		expect(DEFAULT_CONSENT.measurement).toBe(false);
		expect(DEFAULT_CONSENT.marketing).toBe(false);
		expect(DEFAULT_CONSENT.functionality).toBe(false);
		expect(DEFAULT_CONSENT.experience).toBe(false);
	});

	it('should have correct DEFAULT_QUEUE_CONFIG', () => {
		expect(DEFAULT_QUEUE_CONFIG.maxBatchSize).toBe(50);
		expect(DEFAULT_QUEUE_CONFIG.debounceInterval).toBe(300);
		expect(DEFAULT_QUEUE_CONFIG.enableDeduplication).toBe(true);
		expect(DEFAULT_QUEUE_CONFIG.enableOfflineQueue).toBe(true);
		expect(DEFAULT_QUEUE_CONFIG.maxOfflineEvents).toBe(1000);
	});

	it('should have correct DEFAULT_ANALYTICS_CONFIG', () => {
		expect(DEFAULT_ANALYTICS_CONFIG.uploadUrl).toBe('/api/detective');
		expect(DEFAULT_ANALYTICS_CONFIG.debug).toBe(false);
		expect(DEFAULT_ANALYTICS_CONFIG.debounceInterval).toBe(300);
		expect(DEFAULT_ANALYTICS_CONFIG.offlineQueue).toBe(true);
		expect(DEFAULT_ANALYTICS_CONFIG.retryEnabled).toBe(true);
		expect(DEFAULT_ANALYTICS_CONFIG.maxRetries).toBe(3);
	});
});
