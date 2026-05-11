import { describe, expect, it } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	getTestGlobal,
	grantedMeasurementConsentState,
	setupScriptHelperTest,
	toArgumentsArray,
} from '../../__tests__/helpers';
import { clarity } from './clarity';

describe('clarity', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = clarity({ id: 'abcdef1234' });

		expectScriptMatchesIntegration('clarity', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://www.clarity.ms/tag/abcdef1234',
		});
	});

	it('queues default consent on boot when provided', () => {
		const globalRef = getTestGlobal();
		const script = clarity({
			id: 'abcdef1234',
			defaultConsent: { ad_storage: 'denied' },
		});

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));

		const stub = globalRef.clarity as
			| (((...args: unknown[]) => void) & {
					q?: unknown[][];
					v?: string;
			  })
			| undefined;
		expect(stub?.v).toBe('0.7.0');
		expect(stub?.q).toEqual([
			toArgumentsArray(['consent', { ad_storage: 'denied' }]),
		]);
	});

	it('maps consent updates to Clarity consent calls', () => {
		const globalRef = getTestGlobal();
		const script = clarity({ id: 'abcdef1234' });

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		script.onConsentChange?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: true,
				consents: grantedMeasurementConsentState,
			})
		);
		script.onConsentChange?.(
			createCallbackInfo({
				id: script.id,
			})
		);

		const stub = globalRef.clarity as
			| (((...args: unknown[]) => void) & { q?: unknown[][] })
			| undefined;
		expect(stub?.q).toEqual([
			toArgumentsArray(['consent', true]),
			toArgumentsArray(['consent', false]),
		]);
	});
});
