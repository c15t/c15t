import { afterEach, describe, expect, it } from 'vitest';

import {
	cleanupProjects,
	transformFile,
	transformTwice,
} from './__tests__/helpers';
import { runCallbacksToV3Codemod as codemod } from './callbacks-to-v3';

// Each run builds a TypeScript program, which is slow on a busy machine.
describe('callbacks-to-v3 codemod', { timeout: 20_000 }, () => {
	afterEach(cleanupProjects);

	it('renames onConsentChanged and marks callbacks that need a decision', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`import { ConsentManagerProvider } from '@c15t/nextjs';

export const App = ({ children }) => (
	<ConsentManagerProvider
		options={{
			mode: 'hosted',
			backendURL: '/api/c15t',
			callbacks: {
				// Analytics
				onConsentChanged({ preferences }) {
					track(preferences);
				},
				onConsentSet: () => sync(),
				onBannerFetched: () => ready(),
				onError: ({ error }) => report(error),
			},
		}}
	>
		{children}
	</ConsentManagerProvider>
);
`
		);

		expect(result.errors).toEqual([]);
		expect(updated).toBe(`import { ConsentManagerProvider } from '@c15t/nextjs';

export const App = ({ children }) => (
	<ConsentManagerProvider
		options={{
			mode: 'hosted',
			backendURL: '/api/c15t',
			callbacks: {
				// Analytics
				// TODO(c15t v3): onConsentChanged is now onChoiceRecorded. It fires on every accept, reject or save, even one that saves the same values, and its payload has snapshot, confirmed and actionAt instead of preferences and previousPreferences.
				onChoiceRecorded({ preferences }) {
					track(preferences);
				},
				// TODO(c15t v3): onConsentSet was removed. Use onPermissionsChanged to react to what may run now, or onChoiceRecorded to react to the visitor's accept, reject or save.
				onConsentSet: () => sync(),
				// TODO(c15t v3): onBannerFetched was removed. Read usePolicyResolution() to know when the policy has resolved.
				onBannerFetched: () => ready(),
				onError: ({ error }) => report(error),
			},
		}}
	>
		{children}
	</ConsentManagerProvider>
);
`);
		expect(result.changedFiles[0]?.summaries).toEqual([
			'onConsentChanged -> onChoiceRecorded',
			'TODO: onChoiceRecorded payload',
			'TODO: onConsentSet',
			'TODO: onBannerFetched',
		]);
	});

	it('follows callbacks and options bound to variables on the umbrella entry', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { ConsentProvider, type ConsentProviderOptions } from 'c15t/react';

const callbacks = { onConsentChanged };
const options: ConsentProviderOptions = { callbacks };
`
		);
		expect(updated).toContain(
			'const callbacks = { /* TODO(c15t v3): onConsentChanged is now onChoiceRecorded.'
		);
		expect(updated).toContain(
			'previousPreferences. */ onChoiceRecorded: onConsentChanged };'
		);
	});

	it('points JavaScript runtime users at the kernel snapshot', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { getOrCreateConsentRuntime } from 'c15t';

getOrCreateConsentRuntime({
	callbacks: { onBannerFetched: () => {} },
});
`,
			{ fileName: 'consent.ts' }
		);
		expect(updated).toContain(
			'/* TODO(c15t v3): onBannerFetched was removed. Read resolution from the kernel snapshot'
		);
	});

	it('only marks onConsentChanged when onChoiceRecorded already exists', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { ConsentProvider } from '@c15t/react';

export const App = () => (
	<ConsentProvider options={{ callbacks: { onConsentChanged: a, onChoiceRecorded: b } }} />
);
`
		);
		expect(updated).toContain('onConsentChanged: a, onChoiceRecorded: b');
		expect(updated).toContain('/* TODO(c15t v3): onConsentChanged is now');
	});

	it('leaves other callbacks objects and v3 callbacks alone', async () => {
		const unrelated = await transformFile(
			codemod,
			`import { Provider } from './store';
export const App = () => <Provider options={{ callbacks: { onConsentSet() {} } }} />;
`
		);
		expect(unrelated.result.changedFiles).toEqual([]);

		const migrated = await transformFile(
			codemod,
			`import { ConsentProvider } from 'c15t/react';
export const App = () => (
	<ConsentProvider options={{ callbacks: { onChoiceRecorded() {}, onPermissionsChanged() {} } }} />
);
`
		);
		expect(migrated.result.changedFiles).toEqual([]);
	});

	it('is idempotent and writes nothing in a dry run', async () => {
		const source = `import { ConsentManagerProvider } from '@c15t/react';
export const App = () => (
	<ConsentManagerProvider
		options={{
			callbacks: {
				onConsentChanged: log,
				onConsentSet: log,
			},
		}}
	/>
);
`;
		const { first, second, secondResult } = await transformTwice(
			codemod,
			source
		);
		expect(second).toBe(first);
		expect(secondResult.changedFiles).toEqual([]);

		const dry = await transformFile(codemod, source, { dryRun: true });
		expect(dry.updated).toBe(source);
		expect(dry.result.changedFiles[0]?.after).toBe(first);
	});
});
