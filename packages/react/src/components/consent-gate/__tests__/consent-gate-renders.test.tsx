import { Profiler } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { policyFixture } from '~/__tests__/policy-fixture';
import { useSaveConsents } from '~/hooks';
import { ConsentProvider } from '~/provider';
import { offline } from '~/transports/offline';

import { ConsentGate } from '../consent-gate';

const settle = () =>
	new Promise((resolve) => {
		setTimeout(resolve, 20);
	});

const Save = ({ category }: { category: 'marketing' | 'measurement' }) => {
	const save = useSaveConsents();
	return (
		<button
			data-testid={`grant-${category}`}
			onClick={async () => {
				await save({ [category]: true });
			}}
			type="button"
		>
			grant {category}
		</button>
	);
};

test('a ConsentGate re-renders only when its own category changes', async () => {
	let commits = 0;
	const { getByTestId } = await render(
		<ConsentProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(),
			}}
		>
			<Profiler
				id="gate"
				onRender={() => {
					commits += 1;
				}}
			>
				<ConsentGate
					category="marketing"
					placeholder={<span data-testid="blocked">blocked</span>}
				>
					<span data-testid="embed">embed</span>
				</ConsentGate>
			</Profiler>
			<Save category="measurement" />
			<Save category="marketing" />
		</ConsentProvider>
	);
	await expect.element(getByTestId('blocked')).toBeInTheDocument();
	await settle();
	const afterMount = commits;

	await getByTestId('grant-measurement').click();
	await settle();
	expect(commits).toBe(afterMount);

	await getByTestId('grant-marketing').click();
	await expect.element(getByTestId('embed')).toBeInTheDocument();
	expect(commits).toBeGreaterThan(afterMount);
});
