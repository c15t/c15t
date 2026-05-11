import { describe, expect, it } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	getTestGlobal,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { crisp } from './crisp';

describe('crisp', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = crisp({ websiteId: 'crisp-123' });

		expectScriptMatchesIntegration('crisp', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://client.crisp.chat/l.js',
		});
	});

	it('sets required Crisp globals before loading the client', () => {
		const globalRef = getTestGlobal();
		const script = crisp({ websiteId: 'crisp-123' });

		script.onBeforeLoad?.(
			createCallbackInfo({
				id: script.id,
			})
		);

		expect(globalRef.$crisp).toEqual([]);
		expect(globalRef.CRISP_WEBSITE_ID).toBe('crisp-123');
	});

	it('sets optional Crisp runtime globals when provided', () => {
		const globalRef = getTestGlobal();
		const script = crisp({
			websiteId: 'crisp-123',
			locale: 'fr',
			cookieDomain: '.example.com',
			cookieExpiry: 3600,
			tokenId: 'token-123',
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				id: script.id,
			})
		);

		expect(globalRef.CRISP_RUNTIME_CONFIG).toEqual({
			locale: 'fr',
		});
		expect(globalRef.CRISP_COOKIE_DOMAIN).toBe('.example.com');
		expect(globalRef.CRISP_COOKIE_EXPIRATION).toBe(3600);
		expect(globalRef.CRISP_TOKEN_ID).toBe('token-123');
	});

	it('supports overriding the loader URL', () => {
		const script = crisp({
			websiteId: 'crisp-123',
			scriptSrc: 'https://cdn.example.com/crisp.js',
		});

		expect(script.src).toBe('https://cdn.example.com/crisp.js');
	});
});
