import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { buildVitePlugins, resolveOptions } from '../integration';
import {
	createClassMapPlugin,
	EMPTY_STYLESHEET_ID,
} from '../libs/class-map-plugin';
import { offlineMode } from '../mode';

const directory = mkdtempSync(join(tmpdir(), 'c15t-class-maps-'));
const withCSS = join(directory, 'panel.js');
writeFileSync(withCSS, 'import "./panel.css"; export default {};');
writeFileSync(join(directory, 'panel.node.js'), 'export default {};');
const lonely = join(directory, 'lonely.js');
writeFileSync(lonely, 'export default {};');

afterAll(() => rmSync(directory, { force: true, recursive: true }));

const resolveWith = async function resolveWith(
	id: string,
	target: string,
	options: { ssr?: boolean } = {},
	consumer = 'client',
	iabStylesInjected = false
) {
	const plugin = createClassMapPlugin({ iabStylesInjected });
	const resolve = vi.fn(() => Promise.resolve({ id: target }));
	const result = await plugin.resolveId.call(
		{ environment: { config: { consumer } }, resolve },
		id,
		'/app/island.js',
		options
	);
	return { resolve, result };
};

describe('class maps without CSS', () => {
	it('points a browser class-map import at the variant with no CSS', async () => {
		const { result } = await resolveWith(
			'@c15t/ui/styles/components/consent-dialog',
			withCSS
		);
		expect(result).toBe(join(directory, 'panel.node.js'));
	});

	it.each([
		['the server build', { ssr: true }, 'client'],
		['a server environment', {}, 'server'],
	])('leaves %s alone', async (_name, options, consumer) => {
		const { resolve, result } = await resolveWith(
			'@c15t/ui/styles/components/consent-dialog',
			withCSS,
			options,
			consumer
		);
		expect(result).toBeNull();
		expect(resolve).not.toHaveBeenCalled();
	});

	it('keeps IAB class-map CSS when only the base stylesheet is injected', async () => {
		const { resolve, result } = await resolveWith(
			'@c15t/ui/styles/components/iab-consent-dialog',
			withCSS
		);
		expect(result).toBeNull();
		expect(resolve).not.toHaveBeenCalled();
	});

	it('drops IAB class-map CSS when the IAB stylesheet is injected too', async () => {
		const { result } = await resolveWith(
			'@c15t/ui/styles/components/iab-consent-dialog',
			withCSS,
			{},
			'client',
			true
		);
		expect(result).toBe(join(directory, 'panel.node.js'));
	});

	it.each([
		'@c15t/ui/styles/dialog.css',
		'@c15t/ui/styles/primitives.css',
		'@c15t/ui/styles/components/panel.css',
	])('empties the island import of %s, which the client links', async (id) => {
		const { resolve, result } = await resolveWith(id, withCSS);
		expect(result).toBe(EMPTY_STYLESHEET_ID);
		expect(resolve).not.toHaveBeenCalled();
		expect(
			createClassMapPlugin({ iabStylesInjected: false }).load(
				EMPTY_STYLESHEET_ID
			)
		).toBe('export {};');
	});

	it('points the dialog stylesheet module at the variant with no CSS', async () => {
		const { result } = await resolveWith('@c15t/ui/styles/dialog', withCSS);
		expect(result).toBe(join(directory, 'panel.node.js'));
	});

	it('leaves the client its own `?url` import of the dialog stylesheet', async () => {
		const { result } = await resolveWith(
			'@c15t/ui/styles/dialog.css?url',
			withCSS
		);
		expect(result).toBeNull();
	});

	it('keeps IAB component CSS when only the base stylesheet is injected', async () => {
		const { result } = await resolveWith(
			'@c15t/ui/styles/components/iab-panel.css',
			withCSS
		);
		expect(result).toBeNull();
	});

	it('keeps stylesheet imports in the server build', async () => {
		const { result } = await resolveWith(
			'@c15t/ui/styles/dialog.css',
			withCSS,
			{
				ssr: true,
			}
		);
		expect(result).toBeNull();
	});

	it('falls back when a class map has no variant without CSS', async () => {
		const { result } = await resolveWith(
			'@c15t/ui/styles/components/lonely',
			lonely
		);
		expect(result).toBeNull();
	});
});

describe('buildVitePlugins', () => {
	const names = async (styles?: boolean) =>
		(
			await buildVitePlugins(resolveOptions({ mode: offlineMode(), styles }))
		).map((plugin) => plugin.name);

	it('drops the islands’ CSS when the full stylesheet is injected', async () => {
		expect(await names()).toContain('c15t:class-maps-without-css');
	});

	it('keeps the islands’ CSS with `styles: false`', async () => {
		expect(await names(false)).not.toContain('c15t:class-maps-without-css');
	});
});
