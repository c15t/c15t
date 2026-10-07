import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
	cleanupProjects,
	createProject,
	transformFile,
} from './__tests__/helpers';
import { runCssVariablesToV3Codemod as codemod } from './css-variables-to-v3';

// Each run builds a TypeScript program, which is slow on a busy machine.
describe('css-variables-to-v3 codemod', { timeout: 20_000 }, () => {
	afterEach(cleanupProjects);

	it('renames widget and frame variables in stylesheets', async () => {
		const rootDir = await createProject({
			'app/globals.css': `/* Consent overrides */
:root {
	--consent-widget-background-color: #fff;
	--consent-widget-background-color-dark: #000;
	--frame-placeholder-border-radius: 8px;
	color: var(--consent-widget-text-color, var(--frame-font-family));
}
`,
			'styles/consent.scss': `.consent { --consent-widget-max-width: 40rem; }
`,
		});
		const result = await codemod({ dryRun: false, projectRoot: rootDir });

		expect(result.errors).toEqual([]);
		expect(await readFile(join(rootDir, 'app/globals.css'), 'utf-8'))
			.toBe(`/* Consent overrides */
:root {
	--consent-manager-background-color: #fff;
	--consent-manager-background-color-dark: #000;
	--consent-gate-placeholder-border-radius: 8px;
	color: var(--consent-manager-text-color, var(--consent-gate-font-family));
}
`);
		expect(await readFile(join(rootDir, 'styles/consent.scss'), 'utf-8')).toBe(
			`.consent { --consent-manager-max-width: 40rem; }
`
		);
		expect(result.changedFiles.map((file) => file.summaries)).toContainEqual([
			'--consent-widget-* -> --consent-manager-*',
			'--frame-* -> --consent-gate-*',
		]);
	});

	it('marks removed accordion variables instead of renaming them', async () => {
		const rootDir = await createProject({
			'app.less': `.c15t {
	--consent-widget-accordion-radius: 4px;
	--consent-widget-accordion-padding: 1rem;
	--consent-widget-gap: 1rem;
}
`,
		});
		await codemod({ dryRun: false, projectRoot: rootDir });
		expect(await readFile(join(rootDir, 'app.less'), 'utf-8')).toBe(`.c15t {
	/* TODO(c15t v3): --consent-widget-accordion-* was removed. Set --accordion-* instead. */
	--consent-widget-accordion-radius: 4px;
	--consent-widget-accordion-padding: 1rem;
	--consent-manager-gap: 1rem;
}
`);
	});

	it('leaves variables that are not c15t names alone', async () => {
		const rootDir = await createProject({
			'site.css': `:root {
	--frame-width: 100%;
	--my--frame-gap: 1rem;
	--consent-widget-custom: red;
	--consent-manager-gap: 1rem;
}
`,
		});
		const result = await codemod({ dryRun: false, projectRoot: rootDir });
		expect(result.changedFiles).toEqual([]);
	});

	it('renames inline style keys and template literals in JSX', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`export const Gate = ({ radius }) => (
	<div
		style={{
			'--frame-placeholder-gap': '1rem',
			// Rounded corners
			['--consent-widget-radius' as string]: \`\${radius}px\`,
		}}
	/>
);
export const css = \`.x { color: var(--consent-widget-link-text-color); --frame-opacity: \${1}; }\`;
`
		);

		expect(result.errors).toEqual([]);
		expect(updated).toBe(`export const Gate = ({ radius }) => (
	<div
		style={{
			'--consent-gate-placeholder-gap': '1rem',
			// Rounded corners
			['--consent-manager-radius' as string]: \`\${radius}px\`,
		}}
	/>
);
export const css = \`.x { color: var(--consent-manager-link-text-color); --frame-opacity: \${1}; }\`;
`);
	});

	it('marks accordion variables in source files', async () => {
		const { updated } = await transformFile(
			codemod,
			`export const style = {
	'--consent-widget-accordion-radius': '4px',
};
`,
			{ fileName: 'style.ts' }
		);
		expect(updated).toBe(`export const style = {
	// TODO(c15t v3): --consent-widget-accordion-* was removed. Set --accordion-* instead.
	'--consent-widget-accordion-radius': '4px',
};
`);
	});

	it('is idempotent and writes nothing in a dry run', async () => {
		const files = {
			'a.css': `.a {
	--consent-widget-accordion-radius: 4px;
	--consent-widget-gap: 1rem;
}
`,
			'b.tsx': `export const s = { '--frame-gap': '1px', '--frame-placeholder-gap': '1px' };
`,
		};
		const dryRoot = await createProject(files);
		const dry = await codemod({ dryRun: true, projectRoot: dryRoot });
		expect(dry.changedFiles).toHaveLength(2);
		expect(await readFile(join(dryRoot, 'a.css'), 'utf-8')).toBe(
			files['a.css']
		);
		expect(await readFile(join(dryRoot, 'b.tsx'), 'utf-8')).toBe(
			files['b.tsx']
		);

		const rootDir = await createProject(files);
		await codemod({ dryRun: false, projectRoot: rootDir });
		const first = await readFile(join(rootDir, 'a.css'), 'utf-8');
		const again = await codemod({ dryRun: false, projectRoot: rootDir });
		expect(again.changedFiles).toEqual([]);
		expect(await readFile(join(rootDir, 'a.css'), 'utf-8')).toBe(first);
	});
});
