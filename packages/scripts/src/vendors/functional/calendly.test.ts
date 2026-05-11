import { describe, expect, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
	expectStubCommandQueue,
	getTestGlobal,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { calendly } from './calendly';

describe('calendly', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = calendly();

		expectScriptMatchesIntegration('calendly', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://assets.calendly.com/assets/external/widget.js',
		});
	});

	it('queues common widget API calls before load', () => {
		const globalRef = getTestGlobal();
		const script = calendly();

		script.onBeforeLoad?.({
			id: script.id,
			elementId: script.id,
			hasConsent: false,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: false,
				experience: false,
			},
		});

		const calendlyGlobal = globalRef.Calendly as {
			initInlineWidget: (options: Record<string, unknown>) => void;
			showPopupWidget: (url: string) => void;
		};

		calendlyGlobal.initInlineWidget({
			url: 'https://calendly.com/acme/demo',
		});
		calendlyGlobal.showPopupWidget('https://calendly.com/acme/demo');

		expectStubCommandQueue(calendlyGlobal, 'q', [
			[
				'initInlineWidget',
				{
					url: 'https://calendly.com/acme/demo',
				},
			],
			['showPopupWidget', 'https://calendly.com/acme/demo'],
		]);
	});

	it('supports overriding the loader URL', () => {
		const script = calendly({
			scriptSrc: 'https://cdn.example.com/calendly.js',
		});

		expect(script.src).toBe('https://cdn.example.com/calendly.js');
	});
});
