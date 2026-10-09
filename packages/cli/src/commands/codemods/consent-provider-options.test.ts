import { afterEach, describe, expect, it } from 'vitest';

import {
	cleanupProjects,
	transformFile,
	transformTwice,
} from './__tests__/helpers';
import { runConsentProviderOptionsCodemod as codemod } from './consent-provider-options';

// Each run builds a TypeScript program, which is slow on a busy machine.
describe('consent-provider-options codemod', { timeout: 20_000 }, () => {
	afterEach(cleanupProjects);

	it('renames the provider and turns hosted mode into a transport', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentManagerProvider,
} from '@c15t/nextjs';

export default function ConsentManagerClient({ children }) {
	return (
		<ConsentManagerProvider
			options={{ mode: 'hosted', backendURL: 'https://your-project.c15t.dev' }}
		>
			<ConsentBanner />
			<ConsentDialog />
			{children}
		</ConsentManagerProvider>
	);
}
`
		);

		expect(result.errors).toEqual([]);
		expect(updated).toBe(`'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	hosted,
} from '@c15t/nextjs';

export default function ConsentManagerClient({ children }) {
	return (
		<ConsentProvider
			options={{ mode: hosted({ url: 'https://your-project.c15t.dev' }) }}
		>
			<ConsentBanner />
			<ConsentDialog />
			{children}
		</ConsentProvider>
	);
}
`);
		expect(result.changedFiles[0]?.summaries).toEqual(
			expect.arrayContaining([
				'mode/backendURL -> hosted()',
				'ConsentManagerProvider -> ConsentProvider',
			])
		);
	});

	it('moves headers and customFetch into hosted() and keeps comments', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { ConsentManagerProvider } from 'c15t/react';
import type { ConsentManagerOptions } from 'c15t/react';

// Shared consent options.
const options: ConsentManagerOptions = {
	// Same-origin backend
	backendURL: '/api/consent',
	headers: { 'x-tenant': 'acme' },
	customFetch,
	iframeBlockerConfig: { disableAutomaticBlocking: true },
	consentCategories: ['necessary', 'marketing'],
};

export const App = ({ children }) => (
	<ConsentManagerProvider options={options}>{children}</ConsentManagerProvider>
);
`
		);

		expect(updated).toBe(`import { ConsentProvider, hosted } from 'c15t/react';
import type { ConsentProviderOptions } from 'c15t/react';

// Shared consent options.
const options: ConsentProviderOptions = {
	// Same-origin backend
	mode: hosted({ url: '/api/consent', headers: { 'x-tenant': 'acme' }, fetch: customFetch }),
	iframeBlocker: { disableAutomaticBlocking: true },
	consentCategories: ['necessary', 'marketing'],
};

export const App = ({ children }) => (
	<ConsentProvider options={options}>{children}</ConsentProvider>
);
`);
	});

	it('keeps local aliases and the names a module re-exports', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { ConsentManagerProvider as Provider } from '@c15t/react';
export { ConsentManagerProvider, type ConsentManagerOptions as Options } from '@c15t/react';

export const App = ({ children }) => (
	<Provider options={{ mode: 'c15t', backendURL: '/api/c15t' }}>{children}</Provider>
);
`
		);

		expect(updated).toContain(
			"import { ConsentProvider as Provider, hosted } from '@c15t/react';"
		);
		expect(updated).toContain(
			"export { ConsentProvider as ConsentManagerProvider, type ConsentProviderOptions as Options } from '@c15t/react';"
		);
		expect(updated).toContain(
			"<Provider options={{ mode: hosted({ url: '/api/c15t' }) }}>"
		);
	});

	it('keeps the old local name when the file declares its own ConsentProvider', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`import { ConsentBanner, ConsentManagerProvider } from '@c15t/react';
import type { ReactNode } from 'react';

export function ConsentProvider({ children }: { children: ReactNode }) {
	return (
		<ConsentManagerProvider options={{ mode: 'hosted', backendURL: '/api/c15t' }}>
			<ConsentBanner />
			{children}
		</ConsentManagerProvider>
	);
}
`
		);

		expect(result.errors).toEqual([]);
		expect(updated).toContain('ConsentProvider as ConsentManagerProvider');
		expect(updated).toContain('export function ConsentProvider(');
		expect(updated).toContain(
			"<ConsentManagerProvider options={{ mode: hosted({ url: '/api/c15t' }) }}>"
		);
		expect(updated).toContain('</ConsentManagerProvider>');
	});

	it('renames namespace accesses in JSX and types', async () => {
		const { updated } = await transformFile(
			codemod,
			`import * as C15t from '@c15t/react';

const options: C15t.ConsentManagerOptions = { mode: 'offline' };

export const App = ({ children }) => (
	<C15t.ConsentManagerProvider options={options}>{children}</C15t.ConsentManagerProvider>
);
`
		);

		expect(updated).toContain('const options: C15t.ConsentProviderOptions');
		expect(updated).toContain(
			'<C15t.ConsentProvider options={options}>{children}</C15t.ConsentProvider>'
		);
		expect(updated).toContain('mode: offline()');
		expect(updated).toContain("import { offline } from '@c15t/react';");
	});

	it('moves offline policy packs to offline({ policyRules })', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { ConsentManagerProvider, policyPackPresets } from '@c15t/react';

export const App = ({ children }) => (
	<ConsentManagerProvider
		options={{
			mode: 'offline',
			offlinePolicy: {
				policyPacks: [policyPackPresets.europeOptIn(), policyPackPresets.worldNoBanner()],
			},
		}}
	>
		{children}
	</ConsentManagerProvider>
);
`
		);

		expect(updated).toContain(
			'mode: offline({ policyRules: [policyPackPresets.europeOptIn(), policyPackPresets.worldNoBanner()] }),'
		);
		expect(updated).not.toContain('offlinePolicy');
		expect(updated).toContain(
			"import { ConsentProvider, policyPackPresets, offline } from '@c15t/react';"
		);
	});

	it('follows policy packs held in a variable', async () => {
		const todo =
			'// TODO(c15t v3): v3 policy rules are flat ({ id, match, model, prompt, ... }) instead of { consent, ui }.';
		const handWritten = await transformFile(
			codemod,
			`import type { ConsentManagerOptions } from '@c15t/react';

const policyPacks = [{ id: 'eu', match: { regions: ['eu'] }, consent: { model: 'opt-in' } }];
export const options: ConsentManagerOptions = {
	mode: 'offline',
	offlinePolicy: { policyPacks },
};
`
		);
		expect(handWritten.updated).toContain(
			`\t${todo} Rewrite hand-written rules; preset calls need no change.\n\tmode: offline({ policyRules: policyPacks }),`
		);

		const presets = await transformFile(
			codemod,
			`import { policyPackPresets, type ConsentManagerOptions } from '@c15t/react';

const packs = [policyPackPresets.europeOptIn()];
export const options: ConsentManagerOptions = {
	mode: 'offline',
	offlinePolicy: { policyPacks: packs },
};
`
		);
		expect(presets.updated).toContain(
			'\tmode: offline({ policyRules: packs }),'
		);
		expect(presets.updated).not.toContain(todo);

		const imported = await transformFile(
			codemod,
			`import type { ConsentManagerOptions } from '@c15t/react';
import { packs } from './packs';

export const options: ConsentManagerOptions = {
	mode: 'offline',
	offlinePolicy: { policyPacks: packs },
};
`
		);
		expect(imported.updated).toContain(todo);
	});

	it('flags hand-written policy packs and other offlinePolicy keys', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { ConsentManagerProvider } from '@c15t/react';

const policyPacks = [{ id: 'eu', match: { regions: ['eu'] }, consent: { model: 'opt-in' } }];

export const App = ({ children }) => (
	<ConsentManagerProvider
		options={{
			mode: 'offline',
			offlinePolicy: {
				policyPacks: [{ id: 'world', match: { isDefault: true }, consent: { model: 'none' } }],
				i18n: { defaultProfile: 'default' },
			},
		}}
	>
		{children}
	</ConsentManagerProvider>
);
`
		);

		expect(updated).toContain(
			"mode: offline({ policyRules: [{ id: 'world', match: { isDefault: true }, consent: { model: 'none' } }] }),"
		);
		expect(updated).toContain(
			'// TODO(c15t v3): v3 policy rules are flat ({ id, match, model, prompt, ... }) instead of { consent, ui }.'
		);
		expect(updated).toContain(
			'// TODO(c15t v3): offlinePolicy was removed. offline() takes only policyRules'
		);
		expect(updated).toContain("i18n: { defaultProfile: 'default' },");
	});

	it('leaves custom mode with a TODO that fails the build', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`import { ConsentManagerProvider } from '@c15t/react';

export const App = ({ children, endpointHandlers }) => (
	<ConsentManagerProvider
		options={{
			mode: 'custom',
			endpointHandlers,
		}}
	>
		{children}
	</ConsentManagerProvider>
);
`
		);

		expect(updated).toContain(
			"			// TODO(c15t v3): mode 'custom' and endpointHandlers were removed. Implement the v3 transport interface and pass mode: custom(transport)."
		);
		expect(updated).toContain("			mode: 'custom',\n			endpointHandlers,");
		expect(result.changedFiles[0]?.summaries).toContain("TODO: mode 'custom'");
	});

	it('defaults a hosted mode without backendURL to the v2 default URL', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { ConsentManagerProvider } from '@c15t/react';

export const App = ({ children }) => (
	<ConsentManagerProvider options={{ mode: 'hosted', retryConfig: { maxRetries: 2 } }}>{children}</ConsentManagerProvider>
);
`
		);

		expect(updated).toContain("mode: hosted({ url: '/api/c15t' })");
		expect(updated).toContain(
			'/* TODO(c15t v3): retryConfig was removed. Delete it. */ retryConfig'
		);
	});

	it('rewrites every provider in a file', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`import { ConsentManagerProvider } from '@c15t/react';

export const A = ({ children }) => (
	<ConsentManagerProvider options={{ backendURL: '/a' }}>{children}</ConsentManagerProvider>
);
export const B = ({ children }) => (
	<ConsentManagerProvider options={{ backendURL: '/b' }}>{children}</ConsentManagerProvider>
);
`
		);

		expect(updated).toContain("options={{ mode: hosted({ url: '/a' }) }}");
		expect(updated).toContain("options={{ mode: hosted({ url: '/b' }) }}");
		expect(updated.match(/<ConsentProvider /gu)).toHaveLength(2);
		expect(result.changedFiles[0]?.operations).toBe(3);
	});

	it('rewrites options passed to the v2 runtime', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { getOrCreateConsentRuntime } from 'c15t';

const runtime = getOrCreateConsentRuntime({
	mode: 'hosted',
	backendURL: '/api/c15t',
	iframeBlockerConfig,
});
`,
			{ fileName: 'consent.ts' }
		);

		expect(updated)
			.toBe(`import { getOrCreateConsentRuntime, hosted } from 'c15t';

const runtime = getOrCreateConsentRuntime({
	mode: hosted({ url: '/api/c15t' }),
	iframeBlocker: iframeBlockerConfig,
});
`);
	});

	it('leaves files without c15t, and code that already uses v3, unchanged', async () => {
		const unrelated = await transformFile(
			codemod,
			`import { Provider } from './store';

export const App = () => <Provider options={{ mode: 'hosted', backendURL: '/x' }} />;
`
		);
		expect(unrelated.result.changedFiles).toEqual([]);

		const migrated = await transformFile(
			codemod,
			`import { ConsentProvider, hosted } from 'c15t/react';

export const App = ({ children }) => (
	<ConsentProvider options={{ mode: hosted({ url: '/api/c15t' }), iframeBlocker: false }}>
		{children}
	</ConsentProvider>
);
`
		);
		expect(migrated.result.changedFiles).toEqual([]);
	});

	it('does not touch backendURL in other c15t calls', async () => {
		const { result } = await transformFile(
			codemod,
			`import { fetchSSRData } from '@c15t/react/server';
import { ConsentProvider, hosted } from '@c15t/react';

export const data = fetchSSRData({ backendURL: '/api/c15t' });
`,
			{ fileName: 'server.ts' }
		);
		expect(result.changedFiles).toEqual([]);
	});

	it('folds several adjacent transport keys on one line into hosted()', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`import { ConsentManagerProvider } from '@c15t/react';

export const App = ({ children, headers, customFetch }) => (
	<ConsentManagerProvider options={{ mode: 'hosted', backendURL: '/api/c15t', headers, customFetch }}>{children}</ConsentManagerProvider>
);
`
		);
		expect(result.errors).toEqual([]);
		expect(updated).toContain(
			"<ConsentProvider options={{ mode: hosted({ url: '/api/c15t', headers, fetch: customFetch }) }}>{children}</ConsentProvider>"
		);

		const multiLine = await transformFile(
			codemod,
			`import type { ConsentManagerOptions } from '@c15t/react';

declare const customFetch: typeof fetch;
export const options: ConsentManagerOptions = {
	backendURL: '/api/c15t',
	headers: { 'x-a': '1' }, customFetch,
	mode: 'hosted',
	consentCategories: ['necessary'],
};
`
		);
		expect(multiLine.result.errors).toEqual([]);
		expect(multiLine.updated)
			.toContain(`export const options: ConsentProviderOptions = {
	mode: hosted({ url: '/api/c15t', headers: { 'x-a': '1' }, fetch: customFetch }),
	consentCategories: ['necessary'],
};`);
	});

	it('marks a mode held in a variable or expression', async () => {
		const source = `import type { ConsentManagerOptions } from '@c15t/react';

declare const useOffline: boolean;
declare const config: { mode: 'offline' | 'hosted' };
const mode = useOffline ? 'offline' : 'hosted';

export const options: ConsentManagerOptions = { mode };
export const fromConfig: ConsentManagerOptions = {
	mode: config.mode,
};
const getConsentMode = () => (useOffline ? 'offline' : 'hosted');
export const fromHelper: ConsentManagerOptions = {
	mode: getConsentMode(),
};
`;
		const { first, second, secondResult } = await transformTwice(
			codemod,
			source
		);

		const todo =
			'TODO(c15t v3): mode now takes a transport such as hosted({ url }) or offline().';
		expect(first).toContain(
			`export const options: ConsentProviderOptions = { /* ${todo} Replace this value and remove backendURL, offlinePolicy and endpointHandlers. */ mode };`
		);
		expect(first).toContain(
			`\t// ${todo} Replace this value and remove backendURL, offlinePolicy and endpointHandlers.\n\tmode: config.mode,`
		);
		expect(first).toContain(
			`\t// ${todo} Replace this value and remove backendURL, offlinePolicy and endpointHandlers.\n\tmode: getConsentMode(),`
		);
		expect(second).toBe(first);
		expect(secondResult.changedFiles).toEqual([]);
	});

	it('leaves a mode that already holds a v3 transport alone', async () => {
		const { result } = await transformFile(
			codemod,
			`import { hosted, hosted as remote, offline, type ConsentProviderOptions } from '@c15t/react';

declare const useOffline: boolean;
const mode = offline();
const transport = useOffline ? offline() : hosted({ url: '/api/c15t' });

export const a: ConsentProviderOptions = { mode };
export const b: ConsentProviderOptions = { mode: transport };
export const c: ConsentProviderOptions = {
	mode: useOffline ? offline() : hosted({ url: '/api/c15t' }),
};
export const d: ConsentProviderOptions = { mode: remote({ url: '/api/c15t' }) };
`
		);
		expect(result.changedFiles).toEqual([]);
	});

	it('is idempotent', async () => {
		const { first, second, secondResult } = await transformTwice(
			codemod,
			`import { ConsentManagerProvider } from '@c15t/react';

export const App = ({ children }) => (
	<ConsentManagerProvider options={{ mode: 'custom', endpointHandlers: {} }}>
		<ConsentManagerProvider options={{ backendURL: '/x' }}>{children}</ConsentManagerProvider>
	</ConsentManagerProvider>
);
`
		);
		expect(second).toBe(first);
		expect(secondResult.changedFiles).toEqual([]);
	});

	it('writes nothing in a dry run but reports the proposed source', async () => {
		const source = `import { ConsentManagerProvider } from '@c15t/react';

export const App = () => <ConsentManagerProvider options={{ backendURL: '/x' }} />;
`;
		const { result, updated } = await transformFile(codemod, source, {
			dryRun: true,
		});
		expect(updated).toBe(source);
		expect(result.changedFiles[0]?.after).toContain(
			"<ConsentProvider options={{ mode: hosted({ url: '/x' }) }} />"
		);
	});
});
