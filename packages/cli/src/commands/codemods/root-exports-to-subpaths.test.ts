import { afterEach, describe, expect, it } from 'vitest';

import {
	cleanupProjects,
	transformFile,
	transformTwice,
} from './__tests__/helpers';
import { runRootExportsToSubpathsCodemod as codemod } from './root-exports-to-subpaths';

// Each run builds a TypeScript program, which is slow on a busy machine.
describe('root-exports-to-subpaths codemod', { timeout: 20_000 }, () => {
	afterEach(cleanupProjects);

	it('moves headless hooks, trigger atoms, token types and banner parts', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`// Consent UI
import {
	ConsentBanner,
	ConsentBannerCard,
	TriggerRoot,
	useHeadlessConsentUI,
	type ColorTokens,
} from '@c15t/react';

export const colors: ColorTokens = {};
`
		);

		expect(result.errors).toEqual([]);
		expect(updated).toBe(`// Consent UI
import {
	ConsentBanner,
} from '@c15t/react';
import { ConsentBannerCard } from '@c15t/react/components/consent-banner';
import { TriggerRoot } from '@c15t/react/consent-dialog-trigger';
import { useHeadlessConsentUI } from '@c15t/react/headless';
import { type ColorTokens } from '@c15t/react/types';

export const colors: ColorTokens = {};
`);
		expect(result.changedFiles[0]?.summaries).toEqual(
			expect.arrayContaining([
				'useHeadlessConsentUI -> @c15t/react/headless',
				'TriggerRoot -> @c15t/react/consent-dialog-trigger',
			])
		);
	});

	it('uses the umbrella React entries for c15t/next, keeping headless on Next', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { useFocusTrap, TriggerButton as Button, useDraggable } from 'c15t/next';
`
		);

		expect(updated).toBe(`import { useFocusTrap } from 'c15t/next/headless';
import { TriggerButton as Button, useDraggable } from 'c15t/react/consent-dialog-trigger';
`);
	});

	it('sends Next.js scoped imports of React-only subpaths to @c15t/react', async () => {
		const { updated } = await transformFile(
			codemod,
			`import type { TypographyTokens, AllConsentNames } from '@c15t/nextjs';
import { useColorScheme } from '@c15t/nextjs';
`
		);

		expect(updated)
			.toBe(`import type { TypographyTokens } from '@c15t/react/types';
import type { AllConsentNames } from '@c15t/core';
import { useColorScheme } from '@c15t/nextjs/headless';
`);
	});

	it('moves several adjacent specifiers on one line', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`import { ConsentBanner, Card, Title, useHeadlessConsentUI } from '@c15t/react';
`
		);
		expect(result.errors).toEqual([]);
		expect(updated).toBe(`import { ConsentBanner } from '@c15t/react';
import { Card, Title } from '@c15t/react/components/consent-banner';
import { useHeadlessConsentUI } from '@c15t/react/headless';
`);

		const multiLine = await transformFile(
			codemod,
			`import {
	ConsentBanner, Card,
	Title, useHeadlessConsentUI,
	ConsentDialog,
} from '@c15t/react';
`
		);
		expect(multiLine.result.errors).toEqual([]);
		expect(multiLine.updated).toBe(`import {
	ConsentBanner,
	ConsentDialog,
} from '@c15t/react';
import { Card, Title } from '@c15t/react/components/consent-banner';
import { useHeadlessConsentUI } from '@c15t/react/headless';
`);
	});

	it('moves re-exports and keeps their aliases', async () => {
		const { updated } = await transformFile(
			codemod,
			`export { ConsentDialog, useHeadlessConsentUI as useConsentUI } from 'c15t/react';
export type { ShadowTokens } from 'c15t/react';
`,
			{ fileName: 'index.ts' }
		);

		expect(updated).toBe(`export { ConsentDialog } from 'c15t/react';
export { useHeadlessConsentUI as useConsentUI } from 'c15t/react/headless';
export type { ShadowTokens } from 'c15t/react/types';
`);
	});

	it('marks names v3 removed with a TODO above the import', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`import { ConsentBanner, useConsentScript, YouTubeEmbed } from '@c15t/react';
`
		);

		expect(updated)
			.toBe(`// TODO(c15t v3): useConsentScript was removed. Register the script in the scripts option with a @c15t/integrations helper.
// TODO(c15t v3): YouTubeEmbed was removed. Wrap your own embed in ConsentGate.
import { ConsentBanner, useConsentScript, YouTubeEmbed } from '@c15t/react';
`);
		expect(result.changedFiles[0]?.summaries).toEqual([
			'TODO: useConsentScript',
			'TODO: YouTubeEmbed',
		]);
	});

	it('leaves other packages, subpath imports and v3 code alone', async () => {
		const { result } = await transformFile(
			codemod,
			`import { Card, Header } from './ui';
import { useHeadlessConsentUI } from 'c15t/react/headless';
import { ConsentBanner, ConsentProvider, useTranslations } from 'c15t/react';
import { TriggerRoot } from '@c15t/react/consent-dialog-trigger';
`
		);
		expect(result.changedFiles).toEqual([]);
	});

	it('is idempotent and writes nothing in a dry run', async () => {
		const source = `import { ConsentBanner, Card, Title, useHeadlessConsentUI, useSSRStatus } from '@c15t/react';
`;
		const { first, second, secondResult } = await transformTwice(
			codemod,
			source
		);
		expect(first).toContain(
			"import { Card, Title } from '@c15t/react/components/consent-banner';"
		);
		expect(second).toBe(first);
		expect(secondResult.changedFiles).toEqual([]);

		const dry = await transformFile(codemod, source, { dryRun: true });
		expect(dry.updated).toBe(source);
		expect(dry.result.changedFiles[0]?.after).toBe(first);
	});
});
