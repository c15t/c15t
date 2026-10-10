/**
 * The quickstart remounted right after a rejection, before persistence's
 * write code has loaded. The new provider starts from the rejection the
 * earlier one queued, not from storage that does not hold it yet.
 *
 * The write code is held back for the whole file, so it holds one test:
 * the page loads the code once.
 */
import { policyRulePresets } from '@c15t/schema/types';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { pageWriterLoader } from '../../../core/src/modules/persistence/writer-loader';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
	offline,
	useConsent,
	useExplicitChoice,
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

test('the quickstart remounted before its rejection is stored restores the rejection', async () => {
	clearStorage();
	const onChoiceRecorded = vi.fn();
	const app = (
		<ConsentProvider
			options={{
				callbacks: { onChoiceRecorded },
				consentCategories: ['marketing'],
				mode,
			}}
		>
			<ChoiceProbe />
			<ConsentBanner />
			<ConsentDialog />
			<footer>
				<ConsentDialogLink>Privacy settings</ConsentDialogLink>
			</footer>
		</ConsentProvider>
	);
	const first = await render(app);
	await first.getByTestId('consent-banner-reject-button').click();
	await expect
		.element(first.getByTestId('quickstart-state'))
		.toHaveTextContent('false|false');
	expect(localStorage.getItem('c15t')).toBeNull();

	await first.unmount();
	const returning = await render(app);
	await expect
		.element(returning.getByTestId('quickstart-state'))
		.toHaveTextContent('false|false');
	await expect
		.element(returning.getByTestId('consent-banner-root'))
		.not.toBeInTheDocument();
	expect(onChoiceRecorded).toHaveBeenCalledTimes(1);

	openWriterGate();
	await vi.waitFor(() => {
		expect(localStorage.getItem('c15t')).toContain('marketing');
	});
	await expect
		.element(returning.getByTestId('quickstart-state'))
		.toHaveTextContent('false|false');
	await returning.unmount();
});
