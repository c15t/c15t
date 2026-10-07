import { afterEach, describe, expect, it } from 'vitest';

import {
	cleanupProjects,
	transformFile,
	transformTwice,
} from './__tests__/helpers';
import { runThemeToConsentThemeCodemod as codemod } from './theme-to-consent-theme';

// Each run builds a TypeScript program, which is slow on a busy machine.
describe('theme-to-consent-theme codemod', { timeout: 20_000 }, () => {
	afterEach(cleanupProjects);

	it('marks a theme with tokens and renames the dialog footer slot', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`import { ConsentManagerProvider } from '@c15t/react';

const theme = {
	colors: { primary: '#0a0' },
	slots: { consentDialogFooter: 'footer', frame: 'gate' },
};

export const App = ({ children }) => (
	<ConsentManagerProvider
		options={{
			mode: 'offline',
			theme,
		}}
	>
		{children}
	</ConsentManagerProvider>
);
`
		);

		expect(result.errors).toEqual([]);
		expect(updated).toContain(`		options={{
			mode: 'offline',
			// TODO(c15t v3): theme tokens no longer generate CSS. Render <ConsentTheme theme={...} /> with the same theme, or add generateThemeCSS(theme) output to your stylesheet. Keep theme here for consentActions and slots.
			theme,
		}}`);
		expect(updated).toContain(
			"slots: { consentWidgetFooter: 'footer', /* TODO(c15t v3): theme.slots.frame was split into consentGate, consentGateTitle and consentGateButton. */ frame: 'gate' },"
		);
		expect(result.changedFiles[0]?.summaries).toEqual([
			'TODO: theme CSS',
			'slots.consentDialogFooter -> consentWidgetFooter',
			'TODO: slots.frame',
		]);
	});

	it('marks themes from defineTheme() and imported themes it cannot read', async () => {
		const defined = await transformFile(
			codemod,
			`import { ConsentProvider, defineTheme } from 'c15t/next';
export const App = () => (
	<ConsentProvider options={{ theme: defineTheme({ typography: { fontFamily: 'Inter' } }) }} />
);
`
		);
		expect(defined.updated).toContain(
			'<ConsentProvider options={{ /* TODO(c15t v3): theme tokens no longer generate CSS.'
		);

		const imported = await transformFile(
			codemod,
			`import { ConsentProvider } from 'c15t/react';
import { brandTheme } from './theme';
export const App = () => <ConsentProvider options={{ theme: brandTheme }} />;
`
		);
		expect(imported.updated).toContain('TODO(c15t v3): theme tokens');
	});

	it('leaves a theme with only slots and actions, and non-c15t providers, alone', async () => {
		const slotsOnly = await transformFile(
			codemod,
			`import { ConsentProvider } from 'c15t/react';
export const App = () => (
	<ConsentProvider options={{ theme: { slots: { consentBannerCard: 'card' }, consentActions: {} } }} />
);
`
		);
		expect(slotsOnly.result.changedFiles).toEqual([]);

		const unrelated = await transformFile(
			codemod,
			`import { ThemeProvider } from './theme';
export const App = () => <ThemeProvider options={{ theme: { colors: {} } }} />;
`
		);
		expect(unrelated.result.changedFiles).toEqual([]);
	});

	it('is idempotent and writes nothing in a dry run', async () => {
		const source = `import { ConsentManagerProvider } from '@c15t/nextjs';
export const App = () => (
	<ConsentManagerProvider
		options={{
			theme: { colors: { primary: 'red' }, slots: { consentDialogFooter: 'f' } },
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
