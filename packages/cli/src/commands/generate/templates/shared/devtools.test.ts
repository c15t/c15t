import { describe, expect, it } from 'vitest';

import { generateDevToolsImport } from './devtools';

describe('DevTools development guards', () => {
	it.each(['c15t/react/devtools', '@c15t/react/devtools'])(
		'uses the Vite browser environment for %s',
		(source) => {
			const output = generateDevToolsImport(source);
			expect(output).toContain('const DevTools = import.meta.env.DEV');
			expect(output).not.toContain('process');
			expect(output).toContain(`import('${source}')`);
		}
	);
	it.each(['c15t/next/devtools', '@c15t/nextjs/devtools'])(
		'keeps the Next.js environment guard for %s',
		(source) => {
			const output = generateDevToolsImport(source);
			expect(output).toContain(
				"const DevTools = process.env.NODE_ENV !== 'production'"
			);
			expect(output).not.toContain('import.meta.env');
		}
	);
});
