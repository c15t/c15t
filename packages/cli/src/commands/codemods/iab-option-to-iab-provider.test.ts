import { afterEach, describe, expect, it } from 'vitest';

import {
	cleanupProjects,
	transformFile,
	transformTwice,
} from './__tests__/helpers';
import { runIabOptionToIabProviderCodemod as codemod } from './iab-option-to-iab-provider';

// Each run builds a TypeScript program, which is slow on a busy machine.
describe('iab-option-to-iab-provider codemod', { timeout: 20_000 }, () => {
	afterEach(cleanupProjects);

	it('marks the iab provider option', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`import { ConsentManagerProvider } from '@c15t/nextjs';
import { iab } from '@c15t/iab';

export const App = ({ children }) => (
	<ConsentManagerProvider
		options={{
			backendURL: '/api/c15t',
			iab: iab({ cmpId: 123, vendors: [1, 2] }),
		}}
	>
		{children}
	</ConsentManagerProvider>
);
`
		);

		expect(result.errors).toEqual([]);
		expect(updated).toContain(`			backendURL: '/api/c15t',
			// TODO(c15t v3): The iab provider option was removed. Render <IABProvider> from c15t/react/iab inside the provider, around the IAB components, and pass the options you gave iab() as its props.
			iab: iab({ cmpId: 123, vendors: [1, 2] }),`);
		expect(result.changedFiles[0]?.summaries).toEqual([
			'TODO: iab -> IABProvider',
		]);
	});

	it('marks options typed with the umbrella entry, and leaves the JavaScript runtime alone', async () => {
		const typed = await transformFile(
			codemod,
			`import type { ConsentProviderOptions } from 'c15t/react';
export const options: ConsentProviderOptions = { iab: config };
`,
			{ fileName: 'options.ts' }
		);
		expect(typed.updated).toContain(
			'/* TODO(c15t v3): The iab provider option'
		);

		const runtime = await transformFile(
			codemod,
			`import { getOrCreateConsentRuntime } from 'c15t';
getOrCreateConsentRuntime({ iab: config });
`,
			{ fileName: 'consent.ts' }
		);
		expect(runtime.result.changedFiles).toEqual([]);
	});

	it('is idempotent and writes nothing in a dry run', async () => {
		const source = `import { ConsentManagerProvider } from '@c15t/react';
export const App = () => <ConsentManagerProvider options={{ iab: config }} />;
`;
		const { first, second } = await transformTwice(codemod, source);
		expect(second).toBe(first);

		const dry = await transformFile(codemod, source, { dryRun: true });
		expect(dry.updated).toBe(source);
		expect(dry.result.changedFiles[0]?.after).toBe(first);
	});
});
