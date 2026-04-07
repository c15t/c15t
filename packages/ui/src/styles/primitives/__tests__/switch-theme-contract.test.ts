import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const packageRoot = existsSync(
	resolve(process.cwd(), 'src/styles/primitives/switch.module.css')
)
	? process.cwd()
	: resolve(process.cwd(), 'packages/ui');

const switchCss = readFileSync(
	resolve(packageRoot, 'src/styles/primitives/switch.module.css'),
	'utf8'
);

describe('switch theme contract', () => {
	test('defines internal switch variables on the root element', () => {
		expect(switchCss).toContain('.root {');
		expect(switchCss).toContain(
			'--switch-background-color: var(--c15t-switch-track);'
		);
		expect(switchCss).toContain(
			'--switch-background-color-checked: var(--c15t-switch-track-active);'
		);
		expect(switchCss).not.toContain(':root {');
	});

	test('uses the token-backed variables for checked and unchecked track states', () => {
		expect(switchCss).toContain('.track {');
		expect(switchCss).toContain(
			'background-color: var(--switch-background-color);'
		);
		expect(switchCss).toContain('.root[data-state="checked"] .track {');
		expect(switchCss).toContain(
			'background-color: var(--switch-background-color-checked);'
		);
	});
});
