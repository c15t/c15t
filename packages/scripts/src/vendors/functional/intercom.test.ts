import { describe, expect, it } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	getTestGlobal,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { intercom } from './intercom';

type IntercomStub = ((...args: unknown[]) => void) & {
	q?: unknown[][];
};

describe('intercom', () => {
	setupScriptHelperTest();

	it('matches registry metadata with the default widget URL', () => {
		const script = intercom({ appId: 'abc123' });

		expectScriptMatchesIntegration('intercom', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://widget.intercom.io/widget/abc123',
		});
	});

	it('sets Intercom settings and queues calls before loading the widget', () => {
		const globalRef = getTestGlobal();
		const script = intercom({
			appId: 'abc123',
			settings: {
				name: 'Ada Lovelace',
				user_id: 'user-123',
				company: {
					company_id: 'company-123',
					name: 'Example Company Inc.',
				},
			},
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				id: script.id,
			})
		);

		expect(globalRef.intercomSettings).toEqual({
			api_base: 'https://api-iam.intercom.io',
			name: 'Ada Lovelace',
			user_id: 'user-123',
			company: {
				company_id: 'company-123',
				name: 'Example Company Inc.',
			},
			app_id: 'abc123',
		});

		const intercomStub = globalRef.Intercom as IntercomStub;
		intercomStub('boot', { app_id: 'abc123' });

		expect(intercomStub.q).toEqual([['boot', { app_id: 'abc123' }]]);
	});

	it('keeps the explicit app ID authoritative over custom settings', () => {
		const globalRef = getTestGlobal();
		const script = intercom({
			appId: 'abc123',
			settings: {
				app_id: 'ignored',
				api_base: 'https://api-iam.au.intercom.io',
			},
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				id: script.id,
			})
		);

		expect(globalRef.intercomSettings).toEqual({
			api_base: 'https://api-iam.intercom.io',
			app_id: 'abc123',
		});
	});

	it('supports Intercom regional API bases', () => {
		const globalRef = getTestGlobal();
		const script = intercom({
			appId: 'abc123',
			apiBase: 'https://api-iam.eu.intercom.io',
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				id: script.id,
			})
		);

		expect(globalRef.intercomSettings).toEqual({
			api_base: 'https://api-iam.eu.intercom.io',
			app_id: 'abc123',
		});
	});

	it('supports overriding the widget URL', () => {
		const script = intercom({
			appId: 'abc123',
			scriptSrc: 'https://cdn.example.com/intercom.js',
		});

		expect(script.src).toBe('https://cdn.example.com/intercom.js');
	});
});
