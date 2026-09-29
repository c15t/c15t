/**
 * A page whose CSP allows styles only by nonce. It reads its options from a
 * nonced script tag the way `c15t.js` does, then mounts the stock UI.
 * `?nonce=off` drops the nonce so the test can see the policy block it.
 */
import { readScriptOptions } from '../../auto-init';
import { createConsentClient } from '../../client';
import type { ConsentClient } from '../../types';
import { mountConsentUI } from '../../ui/mount';

/** What the test reads from the page. */
export interface UICSPPage {
	client: ConsentClient;
	/** The nonce read from the loader tag. */
	nonce: string | undefined;
	ready: Promise<unknown>;
	/** Directives the page reported as violated. */
	violations: string[];
}

const violations: string[] = [];
document.addEventListener('securitypolicyviolation', (event) => {
	violations.push(event.effectiveDirective);
});

const options = readScriptOptions(document.getElementById('c15t-loader'));
const nonce =
	new URLSearchParams(location.search).get('nonce') === 'off'
		? undefined
		: options.nonce;
const client = createConsentClient(
	{
		...options,
		mode: 'offline',
		nonce,
		overrides: { country: 'DE' },
		ui: { disableAnimation: true },
	},
	{ mountUI: mountConsentUI }
);
client.start();

const page: UICSPPage = {
	client,
	nonce: options.nonce,
	ready: client.ready(),
	violations,
};
Object.assign(window, { c15tUICSP: page });
