/**
 * @fileoverview Unit tests for core analytics types.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';
import { describe, expect, it } from 'vitest';
import type {
	AliasEvent,
	AnalyticsConfig,
	AnalyticsConsent,
	AnalyticsEvent,
	C15TOptions,
	ConsentEvent,
	ConsentPurpose,
	DestinationConfig,
	DestinationFactory,
	DestinationPlugin,
	EventContext,
	EventResult,
	GroupEvent,
	IdentifyEvent,
	PageEvent,
	Script,
	SpecificAnalyticsEvent,
	TrackEvent,
} from './core-types';

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

	it('should have all required consent purposes', () => {
		const consent: AnalyticsConsent = {
			necessary: true,
			measurement: true,
			marketing: false,
			functionality: false,
			experience: false,
		};

		expect(consent.necessary).toBe(true);
		expect(consent.measurement).toBe(true);
		expect(consent.marketing).toBe(false);
		expect(consent.functionality).toBe(false);
		expect(consent.experience).toBe(false);
	});
});

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

describe('EventContext', () => {
	it('should have required session and consent data', () => {
		const context: EventContext = {
			sessionId: 'session-123',
			sessionStart: new Date('2024-01-01T00:00:00Z'),
			consent: {
				necessary: true,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			},
		};

		expect(context.sessionId).toBe('session-123');
		expect(context.sessionStart).toBeInstanceOf(Date);
		expect(context.consent).toBeDefined();
	});

	it('should allow optional user and request data', () => {
		const context: EventContext = {
			sessionId: 'session-123',
			sessionStart: new Date('2024-01-01T00:00:00Z'),
			userId: 'user-123',
			anonymousId: 'anon-123',
			consent: {
				necessary: true,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			},
			userAgent: 'Mozilla/5.0...',
			ip: '192.168.1.1',
			referrer: 'https://example.com',
			custom: { source: 'test' },
		};

		expect(context.userId).toBe('user-123');
		expect(context.anonymousId).toBe('anon-123');
		expect(context.userAgent).toBe('Mozilla/5.0...');
		expect(context.ip).toBe('192.168.1.1');
		expect(context.referrer).toBe('https://example.com');
		expect(context.custom).toEqual({ source: 'test' });
	});
});

describe('AnalyticsEvent', () => {
	it('should have required base properties', () => {
		const event: AnalyticsEvent = {
			type: 'track',
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
		};

		expect(event.type).toBe('track');
		expect(event.timestamp).toBe('2024-01-01T00:00:00Z');
		expect(event.messageId).toBe('msg-123');
	});

	it('should allow optional properties', () => {
		const event: AnalyticsEvent = {
			type: 'track',
			name: 'Button Clicked',
			userId: 'user-123',
			anonymousId: 'anon-123',
			sessionId: 'session-123',
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
			properties: { button: 'cta' },
			traits: { plan: 'premium' },
			context: { page: { path: '/home' } },
		};

		expect(event.name).toBe('Button Clicked');
		expect(event.userId).toBe('user-123');
		expect(event.anonymousId).toBe('anon-123');
		expect(event.sessionId).toBe('session-123');
		expect(event.properties).toEqual({ button: 'cta' });
		expect(event.traits).toEqual({ plan: 'premium' });
		expect(event.context).toEqual({ page: { path: '/home' } });
	});
});

describe('Specific Event Types', () => {
	it('should create TrackEvent with required properties', () => {
		const event: TrackEvent = {
			type: 'track',
			name: 'Button Clicked',
			properties: { button: 'cta', value: 100 },
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
		};

		expect(event.type).toBe('track');
		expect(event.name).toBe('Button Clicked');
		expect(event.properties).toEqual({ button: 'cta', value: 100 });
	});

	it('should create PageEvent with optional name', () => {
		const event: PageEvent = {
			type: 'page',
			properties: { path: '/home', title: 'Home Page' },
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
		};

		expect(event.type).toBe('page');
		expect(event.properties).toEqual({ path: '/home', title: 'Home Page' });
	});

	it('should create IdentifyEvent with traits', () => {
		const event: IdentifyEvent = {
			type: 'identify',
			traits: { email: 'user@example.com', name: 'John Doe' },
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
		};

		expect(event.type).toBe('identify');
		expect(event.traits).toEqual({
			email: 'user@example.com',
			name: 'John Doe',
		});
	});

	it('should create GroupEvent with traits', () => {
		const event: GroupEvent = {
			type: 'group',
			groupId: 'group-123',
			traits: { name: 'Acme Corp', plan: 'enterprise' },
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
		};

		expect(event.type).toBe('group');
		expect(event.groupId).toBe('group-123');
		expect(event.traits).toEqual({ name: 'Acme Corp', plan: 'enterprise' });
	});

	it('should create AliasEvent with properties', () => {
		const event: AliasEvent = {
			type: 'alias',
			properties: { previousId: 'old-id', newId: 'new-id' },
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
		};

		expect(event.type).toBe('alias');
		expect(event.properties).toEqual({ previousId: 'old-id', newId: 'new-id' });
	});

	it('should create ConsentEvent with consent properties', () => {
		const event: ConsentEvent = {
			type: 'consent',
			properties: {
				action: 'granted',
				source: 'banner',
				previousConsent: {
					necessary: true,
					measurement: false,
					marketing: false,
					functionality: false,
					experience: false,
				},
			},
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
		};

		expect(event.type).toBe('consent');
		expect(event.properties.action).toBe('granted');
		expect(event.properties.source).toBe('banner');
		expect(event.properties.previousConsent).toBeDefined();
	});
});

describe('SpecificAnalyticsEvent', () => {
	it('should accept all specific event types', () => {
		const trackEvent: SpecificAnalyticsEvent<'track'> = {
			type: 'track',
			name: 'Button Clicked',
			properties: { button: 'cta' },
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
		};

		const pageEvent: SpecificAnalyticsEvent<'page'> = {
			type: 'page',
			name: 'Home Page',
			properties: { path: '/home' },
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
		};

		const identifyEvent: SpecificAnalyticsEvent<'identify'> = {
			type: 'identify',
			userId: 'user-123',
			traits: { email: 'user@example.com' },
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
		};

		const groupEvent: SpecificAnalyticsEvent<'group'> = {
			type: 'group',
			groupId: 'group-123',
			traits: { name: 'Acme Corp' },
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
		};

		const aliasEvent: SpecificAnalyticsEvent<'alias'> = {
			type: 'alias',
			properties: { previousId: 'old-id' },
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
		};

		const consentEvent: SpecificAnalyticsEvent<'consent'> = {
			type: 'consent',
			properties: {
				action: 'granted',
				source: 'banner',
			},
			timestamp: '2024-01-01T00:00:00Z',
			messageId: 'msg-123',
		};

		expect(trackEvent.type).toBe('track');
		expect(pageEvent.type).toBe('page');
		expect(identifyEvent.type).toBe('identify');
		expect(groupEvent.type).toBe('group');
		expect(aliasEvent.type).toBe('alias');
		expect(consentEvent.type).toBe('consent');
	});
});

describe('EventResult', () => {
	it('should have required properties', () => {
		const result: EventResult = {
			success: true,
			destination: 'posthog',
			timestamp: new Date('2024-01-01T00:00:00Z'),
		};

		expect(result.success).toBe(true);
		expect(result.destination).toBe('posthog');
		expect(result.timestamp).toBeInstanceOf(Date);
	});

	it('should allow optional error', () => {
		const result: EventResult = {
			success: false,
			error: new Error('Connection failed'),
			destination: 'posthog',
			timestamp: new Date('2024-01-01T00:00:00Z'),
		};

		expect(result.success).toBe(false);
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error?.message).toBe('Connection failed');
	});
});

describe('Script', () => {
	it('should create external script', () => {
		const script: Script = {
			type: 'script',
			src: 'https://example.com/script.js',
			async: true,
			defer: false,
			attributes: { 'data-api-key': 'abc123' },
		};

		expect(script.type).toBe('script');
		expect(script.src).toBe('https://example.com/script.js');
		expect(script.async).toBe(true);
		expect(script.defer).toBe(false);
		expect(script.attributes).toEqual({ 'data-api-key': 'abc123' });
	});

	it('should create inline script', () => {
		const script: Script = {
			type: 'inline',
			content: 'console.log("Hello World");',
		};

		expect(script.type).toBe('inline');
		expect(script.content).toBe('console.log("Hello World");');
	});
});

describe('DestinationConfig', () => {
	it('should have required properties', () => {
		const config: DestinationConfig = {
			type: 'posthog',
			enabled: true,
			settings: { apiKey: 'phc_123' },
		};

		expect(config.type).toBe('posthog');
		expect(config.enabled).toBe(true);
		expect(config.settings).toEqual({ apiKey: 'phc_123' });
	});

	it('should allow optional consent requirements', () => {
		const config: DestinationConfig = {
			type: 'posthog',
			enabled: true,
			settings: { apiKey: 'phc_123' },
			requiredConsent: ['measurement'],
		};

		expect(config.requiredConsent).toEqual(['measurement']);
	});
});

describe('AnalyticsConfig', () => {
	it('should have destinations array', () => {
		const config: AnalyticsConfig = {
			destinations: [
				{
					type: 'posthog',
					enabled: true,
					settings: { apiKey: 'phc_123' },
				},
				{
					type: 'console',
					enabled: true,
					settings: {},
				},
			],
		};

		expect(config.destinations).toHaveLength(2);
		expect(config.destinations?.[0]?.type).toBe('posthog');
		expect(config.destinations?.[1]?.type).toBe('console');
	});

	it('should allow optional custom registry', () => {
		const customFactory: DestinationFactory = async () => {
			throw new Error('Not implemented');
		};

		const config: AnalyticsConfig = {
			destinations: [],
			customRegistry: {
				custom: customFactory,
			},
		};

		expect(config.customRegistry).toBeDefined();
		expect(config.customRegistry?.custom).toBe(customFactory);
	});
});

describe('C15TOptions', () => {
	it('should have optional analytics configuration', () => {
		const options: C15TOptions = {
			analytics: {
				enabled: true,
				destinations: [
					{
						type: 'posthog',
						enabled: true,
						settings: { apiKey: 'phc_123' },
					},
				],
				loadFromDatabase: false,
				organizationId: 'org-123',
				environment: 'production',
			},
		};

		expect(options.analytics).toBeDefined();
		expect(options.analytics?.enabled).toBe(true);
		expect(options.analytics?.destinations).toHaveLength(1);
		expect(options.analytics?.loadFromDatabase).toBe(false);
		expect(options.analytics?.organizationId).toBe('org-123');
		expect(options.analytics?.environment).toBe('production');
	});

	it('should allow custom destination registry', () => {
		const customFactory: DestinationFactory = async () => {
			throw new Error('Not implemented');
		};

		const options: C15TOptions = {
			analytics: {
				customDestinations: {
					custom: customFactory,
				},
			},
		};

		expect(options.analytics?.customDestinations).toBeDefined();
		expect(options.analytics?.customDestinations?.custom).toBe(customFactory);
	});

	it('should allow global event enrichment and filtering', () => {
		const enrichEvent = async (_event: SpecificAnalyticsEvent) => _event;
		const filterEvent = async (_event: SpecificAnalyticsEvent) => true;

		const options: C15TOptions = {
			analytics: {
				enrichEvent,
				filterEvent,
			},
		};

		expect(options.analytics?.enrichEvent).toBe(enrichEvent);
		expect(options.analytics?.filterEvent).toBe(filterEvent);
	});
});

describe('DestinationPlugin Interface', () => {
	it('should define required properties', () => {
		// This test verifies the interface structure exists
		// Actual implementation would be in destination packages
		interface TestPlugin extends DestinationPlugin<Record<string, unknown>> {
			readonly type: 'test';
			readonly version: '1.0.0';
			readonly name: 'Test Plugin';
			readonly description: 'A test plugin';
			readonly category: 'analytics';
			readonly gdprCompliant: true;
			readonly settingsSchema: StandardSchemaV1<
				Record<string, unknown>,
				Record<string, unknown>
			>;
			readonly requiredConsent: readonly ConsentPurpose[];
		}

		// This is just a type check - the interface should compile
		const plugin: TestPlugin = {} as TestPlugin;
		expect(plugin).toBeDefined();
	});
});
