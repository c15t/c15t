import { describe, expect, it } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	getTestGlobal,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { microsoftUet } from './microsoft-uet';

describe('microsoftUet', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = microsoftUet({ id: 'uet-123' });

		expectScriptMatchesIntegration('microsoftUet', script, {
			alwaysLoad: true,
			persistAfterConsentRevoked: true,
			src: '//bat.bing.com/bat.js',
		});
	});

	it('boots queue and sends granted default consent before load', () => {
		const globalRef = getTestGlobal();
		const script = microsoftUet({ id: 'uet-123' });

		script.onBeforeLoad?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: true,
			})
		);

		expect(globalRef.uetq).toEqual([
			'consent',
			'default',
			{ ad_storage: 'granted' },
		]);
	});

	it('boots queue and sends denied default consent before load', () => {
		const globalRef = getTestGlobal();
		const script = microsoftUet({ id: 'uet-123' });

		script.onBeforeLoad?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: false,
			})
		);

		expect(globalRef.uetq).toEqual([
			'consent',
			'default',
			{ ad_storage: 'denied' },
		]);
	});

	it('constructs UET and sends page load after script load', () => {
		const globalRef = getTestGlobal();
		const script = microsoftUet({ id: 'uet-123' });

		class UetMock {
			options: Record<string, unknown>;
			pushCalls: unknown[][] = [];

			constructor(options: Record<string, unknown>) {
				this.options = options;
			}

			push(...args: unknown[]) {
				this.pushCalls.push(args);
			}
		}

		globalRef.UET = UetMock;

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		script.onLoad?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: true,
			})
		);

		const instance = globalRef.uetq as UetMock;
		expect(instance).toBeInstanceOf(UetMock);
		expect(instance.options).toEqual({
			ti: 'uet-123',
			enableAutoSpaTracking: true,
			q: ['consent', 'default', { ad_storage: 'denied' }],
		});
		expect(instance.pushCalls).toEqual([['pageLoad']]);

		delete globalRef.UET;
	});

	it('maps consent changes to UET consent updates', () => {
		const globalRef = getTestGlobal();
		const script = microsoftUet({ id: 'uet-123' });

		const pushCalls: unknown[][] = [];
		globalRef.uetq = {
			push: (...args: unknown[]) => {
				pushCalls.push(args);
			},
		};

		script.onConsentChange?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: true,
			})
		);
		script.onConsentChange?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: false,
			})
		);

		expect(pushCalls).toEqual([
			['consent', 'update', { ad_storage: 'granted' }],
			['consent', 'update', { ad_storage: 'denied' }],
		]);
	});

	it('supports overriding the loader URL', () => {
		const script = microsoftUet({
			id: 'uet-123',
			scriptSrc: 'https://cdn.example.com/bat.js',
		});

		expect(script.src).toBe('https://cdn.example.com/bat.js');
	});
});
