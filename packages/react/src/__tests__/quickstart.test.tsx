import { policyRulePresets } from '@c15t/schema/types';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
	offline,
	useConsent,
	useExplicitChoice,
} from '../index';

const mode = offline({ policyRules: [policyRulePresets.europeOptIn()] });
const ChoiceProbe = () => {
	const allowed = useConsent('marketing');
	const choice = useExplicitChoice();
	return (
		<output data-testid="quickstart-state">
			{String(allowed)}|{String(choice?.categories.marketing?.value)}
		</output>
	);
};

const clearStorage = () => {
	localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		document.cookie = `${cookie.split('=')[0]?.trim()}=; Max-Age=0; Path=/`;
	}
};
afterEach(clearStorage);

test('the preset quickstart records rejection, restores it, and reopens preferences', async () => {
	clearStorage();
	const onChoiceRecorded = vi.fn();
	const app = (
		<ConsentProvider options={{ callbacks: { onChoiceRecorded }, mode }}>
			<ChoiceProbe />
			<ConsentBanner />
			<ConsentDialog />
			<footer>
				<ConsentDialogLink>Privacy settings</ConsentDialogLink>
			</footer>
		</ConsentProvider>
	);
	const first = await render(app);
	await expect
		.element(first.getByTestId('consent-banner-reject-button'))
		.toBeVisible();
	await expect
		.element(first.getByTestId('quickstart-state'))
		.toHaveTextContent('false|undefined');
	await first.getByTestId('consent-banner-reject-button').click();
	await expect
		.element(first.getByTestId('quickstart-state'))
		.toHaveTextContent('false|false');
	expect(onChoiceRecorded).toHaveBeenCalledTimes(1);
	await first.unmount();
	const returning = await render(app);
	await expect
		.element(returning.getByTestId('quickstart-state'))
		.toHaveTextContent('false|false');
	await expect
		.element(returning.getByTestId('consent-banner-root'))
		.not.toBeInTheDocument();
	expect(onChoiceRecorded).toHaveBeenCalledTimes(1);
	await returning.getByText('Privacy settings').click();
	await expect
		.element(returning.getByTestId('consent-dialog-root'))
		.toBeVisible();
});
