import type { ConsentSnapshot } from '@c15t/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	ACTIVATED_ATTRIBUTE,
	activateGatedScripts,
} from '../browser/inline-scripts';

const snapshot = function snapshot(
	consents: Partial<Record<string, boolean>>
): ConsentSnapshot {
	return {
		effectivePermissions: {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
			...consents,
		},
		policyCategories: [],
		policyScopeMode: 'permissive',
	} as unknown as ConsentSnapshot;
};

beforeEach(() => {
	document.body.innerHTML = '';
});

describe('activateGatedScripts', () => {
	it('leaves a script inert without consent', () => {
		document.body.innerHTML =
			'<script type="text/plain" data-c15t-category="measurement">1</script>';
		expect(activateGatedScripts(snapshot({}))).toBe(0);
		expect(document.querySelector('script[type="text/plain"]')).not.toBeNull();
	});

	it('activates it once consent arrives', () => {
		document.body.innerHTML =
			'<script type="text/plain" data-c15t-category="measurement" data-vendor="ga">1</script>';
		expect(activateGatedScripts(snapshot({ measurement: true }))).toBe(1);

		const activated = document.querySelector<HTMLScriptElement>(
			`script[${ACTIVATED_ATTRIBUTE}="true"]`
		);
		expect(activated).not.toBeNull();
		expect(activated?.type).not.toBe('text/plain');
		// Non-c15t data attributes survive the swap.
		expect(activated?.dataset.vendor).toBe('ga');
	});

	describe("under a page nonce and 'strict-dynamic'", () => {
		// Activation creates a new script, which 'strict-dynamic' runs with
		// no nonce check. A tag injected through an HTML-injection hole would
		// run once its category is granted, so only the page's own tags,
		// which carry its nonce, are activated.
		it('skips an injected tag without the nonce', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			document.body.innerHTML = [
				'<script type="text/plain" data-c15t-category="measurement">injected</script>',
				'<script type="text/plain" data-c15t-category="measurement" nonce="other">forged</script>',
			].join('');

			expect(
				activateGatedScripts(snapshot({ measurement: true }), document, 'page')
			).toBe(0);
			const tags = Array.from(document.querySelectorAll('script'));
			expect(tags.map((tag) => tag.type)).toEqual(['text/plain', 'text/plain']);
			expect(tags.map((tag) => tag.getAttribute(ACTIVATED_ATTRIBUTE))).toEqual([
				'untrusted',
				'untrusted',
			]);
			expect(warn).toHaveBeenCalledTimes(2);

			// Marked, so a later pass neither retries nor warns again.
			activateGatedScripts(snapshot({ measurement: true }), document, 'page');
			expect(warn).toHaveBeenCalledTimes(2);
			warn.mockRestore();
		});

		it('activates a tag carrying the nonce, with the nonce', () => {
			document.body.innerHTML =
				'<script type="text/plain" data-c15t-category="measurement" nonce="page">1</script>';

			expect(
				activateGatedScripts(snapshot({ measurement: true }), document, 'page')
			).toBe(1);
			expect(
				document.querySelector<HTMLScriptElement>(
					`script[${ACTIVATED_ATTRIBUTE}="true"]:not([type])`
				)?.nonce
			).toBe('page');
		});
	});

	it('preserves src and loading attributes', () => {
		document.body.innerHTML =
			'<script type="text/plain" data-c15t-category="marketing" src="https://cdn.example.com/p.js" async defer></script>';
		activateGatedScripts(snapshot({ marketing: true }));

		const activated = document.querySelector<HTMLScriptElement>(
			`script[${ACTIVATED_ATTRIBUTE}="true"]`
		);
		expect(activated?.getAttribute('src')).toBe('https://cdn.example.com/p.js');
		expect(activated?.hasAttribute('async')).toBe(true);
		expect(activated?.hasAttribute('defer')).toBe(true);
		expect(activated?.getAttribute('type')).toBeNull();
	});

	it('activates each script only once', () => {
		document.body.innerHTML =
			'<script type="text/plain" data-c15t-category="measurement">1</script>';
		const granted = snapshot({ measurement: true });
		expect(activateGatedScripts(granted)).toBe(1);
		expect(activateGatedScripts(granted)).toBe(0);
		expect(document.querySelectorAll('script')).toHaveLength(1);
	});

	it('ignores scripts with no category attribute', () => {
		document.body.innerHTML = '<script type="text/plain">1</script>';
		expect(activateGatedScripts(snapshot({ measurement: true }))).toBe(0);
	});

	it('warns once about a misspelled category instead of staying silent', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		document.body.innerHTML =
			'<script type="text/plain" data-c15t-category="analytics">1</script>';

		expect(activateGatedScripts(snapshot({ measurement: true }))).toBe(0);
		expect(warn).toHaveBeenCalledOnce();
		expect(warn.mock.calls[0]?.[0]).toContain('analytics');

		// Marked, so the next pass does not warn again.
		expect(activateGatedScripts(snapshot({ measurement: true }))).toBe(0);
		expect(warn).toHaveBeenCalledOnce();
		warn.mockRestore();
	});
});
