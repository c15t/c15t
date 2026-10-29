import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

import { getRegistryItems } from 'shadcn/registry';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildRegistry } from '../build-registry';
import { styles } from '../items';

const appDir = path.resolve(import.meta.dirname, '../..');

let registry = new Map<string, unknown>();
let template = '';

// Serves the built registry so shadcn's own resolver picks the folder.
const server = createServer((request, response) => {
	const { pathname } = new URL(request.url ?? '/', 'http://127.0.0.1');
	const json = registry.get(pathname.replace(/^\/r\//u, ''));
	response.writeHead(json ? 200 : 404, { 'content-type': 'application/json' });
	response.end(JSON.stringify(json ?? {}));
});

beforeAll(async () => {
	await new Promise<void>((resolve) => {
		server.listen(0, '127.0.0.1', resolve);
	});
	const { port } = server.address() as AddressInfo;
	const baseUrl = `http://127.0.0.1:${port}/r`;
	registry = buildRegistry({ appDir, baseUrl });
	template = `${baseUrl}/{style}/{name}.json`;
});

afterAll(() => {
	server.close();
});

/**
 * Resolves an item the way `shadcn add @c15t/...` does in a project with
 * this `style`. An empty `tailwindConfig` is how shadcn marks Tailwind v4.
 */
const resolve = async (style: string | undefined, tailwindConfig: string) => {
	const [item] = await getRegistryItems(['@c15t/react-consent-banner'], {
		config: {
			registries: { '@c15t': template },
			style,
			tailwind: {
				baseColor: 'neutral',
				config: tailwindConfig,
				css: 'app/globals.css',
				cssVariables: true,
			},
		},
		useCache: false,
	});
	return item?.name;
};

describe('the @c15t namespace', () => {
	it.each(styles.map(({ name }) => name))(
		'resolves for a Tailwind v4 project with style %s',
		async (style) => {
			expect(await resolve(style, '')).toBe('react-consent-banner');
		}
	);

	it.each(['new-york', 'default'])(
		'resolves for a Tailwind v3 project with style %s',
		async (style) => {
			expect(await resolve(style, 'tailwind.config.js')).toBe(
				'react-consent-banner'
			);
		}
	);

	it('resolves for a project with no style', async () => {
		expect(await resolve(undefined, '')).toBe('react-consent-banner');
	});
});
