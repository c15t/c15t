/**
 * A provider remounted right after a revocation, before persistence's
 * write code has loaded. The new provider starts from the revocation the
 * earlier one queued, not from storage that still holds the grant, so the
 * revoked integration does not start again.
 *
 * The write code is held back for the whole file, so it holds one test:
 * the page loads the code once.
 */
import { policyRulePresets } from '@c15t/schema/types';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { pageWriterLoader } from '../../../core/src/modules/persistence/writer-loader';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
	offline,
	useConsent,
} from '../index';

// Hold back the write code's chunk, as a slow network would, so the
// remount happens before it loads.
const loadWriter = pageWriterLoader.load;
let openWriterGate: () => void = () => undefined;
const writerGate = new Promise<void>((resolve) => {
	openWriterGate = resolve;
});
pageWriterLoader.load = async () => {
	await writerGate;
	return loadWriter();
};

const consentKey = 'remount-revocation-consent';
const mode = offline({ policyRules: [policyRulePresets.europeOptIn()] });

const Permission = () => {
	const allowed = useConsent('measurement');
	return <output>Measurement {allowed ? 'allowed' : 'denied'}</output>;
};

const App = ({ onLoad }: { onLoad: () => void }) => (
	<ConsentProvider
		options={{
			clearOnRevocation: {
				measurement: { cookies: [consentKey], localStorage: [consentKey] },
			},
			mode,
			scripts: [
				{
					callbackOnly: true,
					category: 'measurement',
					id: 'remount-revocation-integration',
					onBeforeLoad: onLoad,
				},
			],
			storageConfig: { storageKey: consentKey },
		}}
	>
		<Permission />
		<ConsentBanner />
		<ConsentDialog disableAnimation />
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</ConsentProvider>
);

const clearStorage = () => {
	localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		document.cookie = `${cookie.split('=')[0]?.trim()}=; Max-Age=0; Path=/`;
	}
};

beforeEach(clearStorage);
afterEach(clearStorage);

test('a provider remounted before its revocation is stored keeps the integration off', async () => {
	const onLoad = vi.fn();
	const first = await render(<App onLoad={onLoad} />);
	await first.getByTestId('consent-banner-accept-button').click();
	await vi.waitFor(() => expect(onLoad).toHaveBeenCalledOnce());
	await first.getByText('Privacy settings', { exact: true }).click();
	await first.getByTestId('consent-widget-reject-button').click();
	await expect.element(first.getByText('Measurement denied')).toBeVisible();
	expect(localStorage.getItem(consentKey)).toBeNull();

	await first.unmount();
	const returning = await render(<App onLoad={onLoad} />);
	await expect.element(returning.getByText('Measurement denied')).toBeVisible();
	await expect
		.element(returning.getByTestId('consent-banner-root'))
		.not.toBeInTheDocument();
	expect(onLoad).toHaveBeenCalledOnce();

	openWriterGate();
	await vi.waitFor(() => {
		expect(localStorage.getItem(consentKey)).toContain('measurement');
	});
	await expect.element(returning.getByText('Measurement denied')).toBeVisible();
	expect(onLoad).toHaveBeenCalledOnce();
	await returning.unmount();
});
