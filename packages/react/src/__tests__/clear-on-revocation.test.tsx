import { policyRulePresets } from '@c15t/schema/types';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
	offline,
	useConsent,
} from '../index';

const consentKey = 'cleanup-browser-consent';
const exactKey = 'cleanup-browser-id';
const prefixKeys = ['cleanup-browser-event-1', 'cleanup-browser-event-2'];
const unrelatedKey = 'application-setting';
const mode = offline({ policyRules: [policyRulePresets.europeOptIn()] });

const writeIntegrationData = () => {
	for (const key of [exactKey, ...prefixKeys, unrelatedKey]) {
		document.cookie = `${key}=value; Path=/`;
		localStorage.setItem(key, 'value');
		sessionStorage.setItem(key, 'value');
	}
};

const assertIntegrationData = (present: boolean) => {
	const cookies = document.cookie.split(';').map((pair) => pair.trim());
	for (const key of [exactKey, ...prefixKeys]) {
		expect(cookies.includes(`${key}=value`)).toBe(present);
		expect(localStorage.getItem(key)).toBe(present ? 'value' : null);
		expect(sessionStorage.getItem(key)).toBe(present ? 'value' : null);
	}
};

const assertPreservedData = () => {
	expect(document.cookie).toContain(`${unrelatedKey}=value`);
	expect(localStorage.getItem(unrelatedKey)).toBe('value');
	expect(sessionStorage.getItem(unrelatedKey)).toBe('value');
	expect(document.cookie).toContain(`${consentKey}=`);
	expect(localStorage.getItem(consentKey)).not.toBeNull();
};

const Permission = () => {
	const allowed = useConsent('measurement');
	return <output>Measurement {allowed ? 'allowed' : 'denied'}</output>;
};

const App = ({ onLoad }: { onLoad: () => void }) => (
	<ConsentProvider
		options={{
			clearOnRevocation: {
				measurement: {
					cookies: [exactKey, 'cleanup-browser-event-*', consentKey],
					localStorage: [exactKey, 'cleanup-browser-event-*', consentKey],
					sessionStorage: [exactKey, 'cleanup-browser-event-*'],
				},
			},
			mode,
			scripts: [
				{
					callbackOnly: true,
					category: 'measurement',
					id: 'browser-cleanup-integration',
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
	sessionStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		document.cookie = `${cookie.split('=')[0]?.trim()}=; Max-Age=0; Path=/`;
	}
};

beforeEach(clearStorage);
afterEach(clearStorage);

test('accepting then rejecting through the UI removes real cookies and both storage types', async () => {
	const onLoad = vi.fn(writeIntegrationData);
	const screen = await render(<App onLoad={onLoad} />);
	await screen.getByTestId('consent-banner-accept-button').click();
	await vi.waitFor(() => expect(onLoad).toHaveBeenCalledOnce());
	assertIntegrationData(true);
	assertPreservedData();

	await screen.getByText('Privacy settings', { exact: true }).click();
	await screen.getByTestId('consent-widget-reject-button').click();
	await expect.element(screen.getByText('Measurement denied')).toBeVisible();
	await vi.waitFor(() => assertIntegrationData(false));
	assertPreservedData();
	await screen.unmount();
});

test('a returning denied visitor clears stale data without restarting the integration', async () => {
	const onLoad = vi.fn(writeIntegrationData);
	const first = await render(<App onLoad={onLoad} />);
	await first.getByTestId('consent-banner-accept-button').click();
	await vi.waitFor(() => expect(onLoad).toHaveBeenCalledOnce());
	await first.getByText('Privacy settings', { exact: true }).click();
	await first.getByTestId('consent-widget-reject-button').click();
	await vi.waitFor(() => assertIntegrationData(false));
	await first.unmount();

	// Keep the actual persisted refusal while simulating leftover vendor data.
	writeIntegrationData();
	assertIntegrationData(true);
	const returning = await render(<App onLoad={onLoad} />);
	await expect.element(returning.getByText('Measurement denied')).toBeVisible();
	await vi.waitFor(() => assertIntegrationData(false));
	assertPreservedData();
	expect(onLoad).toHaveBeenCalledOnce();
	await expect
		.element(returning.getByTestId('consent-banner-root'))
		.not.toBeInTheDocument();
	await returning.unmount();
});
