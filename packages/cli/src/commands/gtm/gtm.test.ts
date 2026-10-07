import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { runCli } from '../../index';
import { createCliLogger } from '../../utils/logger';
import type { CliLogger } from '../../utils/logger';
import { migrateGtm } from './index';
import type { GtmCommandDependencies, GtmFetchResponse } from './index';
import { migrateContainer } from './map';
import { parseGtmContainer } from './parse';
import { formatGtmReport } from './report';
import { renderSnippet } from './snippet';
import type { ParsedGtmContainer } from './types';

const liveSnippet = `import { gtag } from '@c15t/integrations/google-tag';
import { hotjar } from '@c15t/integrations/hotjar';

export const scripts = [
	hotjar({ siteId: 123456 }),
	gtag({ id: 'ergregwwgwegr', category: 'measurement' }),
];
`;

const placeholderWarning =
	'Google tag id "ergregwwgwegr" is not a G-, AW-, DC-, or GT- id.';

const published = (container: unknown, trailer = ''): string =>
	`var data = ${JSON.stringify(container)};${trailer}`;

const liveContainer = {
	blob: { '5': 'GTM-WL5L8NW7' },
	resource: {
		macros: [
			{ function: '__e' },
			{ function: '__u', vtp_component: 'URL' },
			{ function: '__u', vtp_component: 'HOST' },
			{ function: '__u', vtp_component: 'PATH' },
			{ function: '__f', vtp_component: 'URL' },
			{ function: '__e' },
		],
		predicates: [
			{ arg0: ['macro', 0], arg1: 'gtm.init_consent', function: '_eq' },
			{ arg0: ['macro', 0], arg1: 'consent-update', function: '_eq' },
			{ arg0: ['macro', 1], arg1: 'should-not-fire', function: '_eq' },
		],
		rules: [
			[
				['if', 0],
				['add', 0],
				['block', 1],
			],
			[
				['if', 1],
				['add', 0, 1],
			],
			[
				['if', 2],
				['add', 0],
			],
		],
		tags: [
			{
				consent: ['list', 'analytics_storage'],
				function: '__hjtc',
				tag_id: 7,
				unlimited: true,
				vtp_hotjar_site_id: '123456',
			},
			{
				consent: ['list', 'analytics_storage'],
				function: '__googtag',
				once_per_event: true,
				tag_id: 10,
				vtp_tagId: 'ergregwwgwegr',
			},
		],
	},
};

const downloaded = (body: string, status = 200): GtmFetchResponse => ({
	ok: status >= 200 && status < 300,
	status,
	text: () => Promise.resolve(body),
});

const silentLogger = function silentLogger(): {
	logger: CliLogger;
	messages: string[];
} {
	const messages: string[] = [];
	return {
		logger: createCliLogger('info', {
			write: (line) => {
				messages.push(line);
			},
		}),
		messages,
	};
};

const migrateText = (text: string) => migrateContainer(parseGtmContainer(text));

describe('published container', () => {
	it('replaces Hotjar and a Google tag, including a placeholder id', () => {
		const migration = migrateText(published(liveContainer));
		expect(migration.containerId).toBe('GTM-WL5L8NW7');
		expect(migration.snippet).toBe(liveSnippet);
		expect(migration.scripts.map((script) => script.firesOn)).toEqual([
			['gtm.init_consent', 'consent-update'],
			['consent-update'],
		]);
		expect(migration.warnings).toEqual([placeholderWarning]);
		expect(migration.events).toEqual([]);
		expect(migration.ignored).toEqual([]);
		expect(migration.unmapped).toEqual([]);
	});

	it('reads the event macro from the predicate index, not a fixed slot', () => {
		const migration = migrateText(
			published({
				resource: {
					macros: [{ function: '__u' }, { function: '__e' }],
					predicates: [{ arg0: ['macro', 1], arg1: 'signup', function: '_eq' }],
					rules: [
						[
							['if', 0],
							['add', 0],
						],
					],
					tags: [{ function: '__hjtc', vtp_hotjar_site_id: '42' }],
				},
			})
		);
		expect(migration.scripts[0]).toMatchObject({
			firesOn: ['signup'],
			options: [{ name: 'siteId', value: 42 }],
		});
		expect(migration.warnings).toEqual([
			'Hotjar fired on "signup". The helper loads with the page and does not wait for that event.',
		]);
	});

	it('does not use the internal tag_id as a Google tag id', () => {
		const migration = migrateText(
			published({
				resource: {
					macros: [],
					predicates: [],
					rules: [],
					tags: [{ function: '__googtag', tag_id: 10 }],
				},
			})
		);
		expect(migration.scripts).toEqual([]);
		expect(migration.unmapped).toEqual([
			{
				reason: 'No c15t integration matched this tag.',
				template: 'googtag',
			},
		]);
	});

	it('uses marketing when the only consent types are ads', () => {
		const migration = migrateText(
			published({
				resource: {
					macros: [],
					predicates: [],
					rules: [],
					tags: [
						{
							consent: ['list', 'ad_storage', 'ad_user_data'],
							function: '__googtag',
							vtp_tagId: 'placeholder',
						},
					],
				},
			})
		);
		expect(migration.scripts[0]?.options).toEqual([
			{ name: 'id', value: 'placeholder' },
			{ name: 'category', value: 'marketing' },
		]);
	});

	it('keeps a GA4 event that sends to the Google tag already in the container', () => {
		const migration = migrateText(
			published({
				resource: {
					macros: [],
					predicates: [],
					rules: [],
					tags: [
						{ function: '__googtag', vtp_tagId: 'G-ABC123' },
						{
							function: '__gaawe',
							vtp_eventName: 'purchase',
							vtp_measurementIdOverride: 'G-ABC123',
						},
					],
				},
			})
		);
		expect(migration.scripts.map((script) => script.importName)).toEqual([
			'gtag',
		]);
		expect(migration.events).toEqual([
			{ measurementId: 'G-ABC123', name: 'purchase' },
		]);
		expect(migration.warnings).toEqual([]);
	});

	it('warns when GA4 events have no Google tag', () => {
		const migration = migrateText(
			published({
				resource: {
					macros: [],
					predicates: [],
					rules: [],
					tags: [{ function: '__gaawe', vtp_eventName: 'purchase' }],
				},
			})
		);
		expect(migration.scripts).toEqual([]);
		expect(migration.warnings).toEqual([
			'This container sends GA4 events but has no Google tag. Add gtag() with the measurement id.',
		]);
	});

	it('leaves a variable Hotjar id in the call and warns', () => {
		const migration = migrateText(
			published({
				resource: {
					macros: [],
					predicates: [],
					rules: [],
					tags: [{ function: '__hjtc', vtp_hotjar_site_id: '{{HJID}}' }],
				},
			})
		);
		expect(migration.scripts[0]?.options).toEqual([
			{ name: 'siteId', value: '{{HJID}}' },
		]);
		expect(migration.warnings).toEqual([
			'Hotjar siteId "{{HJID}}" is a GTM variable. Replace it before the script can load.',
		]);
	});
});

describe('container export', () => {
	const text = JSON.stringify({
		containerVersion: {
			container: { publicId: 'GTM-TEST123' },
			tag: [
				{
					consentSettings: {
						consentStatus: 'needed',
						consentType: {
							list: [{ type: 'template', value: 'analytics_storage' }],
							type: 'list',
						},
					},
					firingTriggerId: '1',
					name: 'Hotjar',
					parameter: [
						{ key: 'hotjar_site_id', type: 'template', value: 123_456 },
					],
					type: 'hjtc',
				},
				{
					firingTriggerId: ['3'],
					name: 'Paused pixel',
					parameter: [{ key: 'html', value: "fbq('init', '99999999');" }],
					paused: true,
					type: 'html',
				},
				{ firingTriggerId: ['3'], name: 'Clicks', type: 'cl' },
				{
					firingTriggerId: ['2'],
					name: 'Meta',
					parameter: [{ key: 'html', value: "fbq('init', '1234567890');" }],
					type: 'html',
				},
				{
					firingTriggerId: ['3'],
					name: 'Meta again',
					parameter: [{ key: 'html', value: "fbq('init', '1234567890');" }],
					type: 'html',
				},
				{
					firingTriggerId: ['3'],
					name: 'PostHog',
					parameter: [
						{
							key: 'html',
							value:
								"posthog.init('phc_abc123', { api_host: 'https://us.i.posthog.com' })",
						},
					],
					type: 'html',
				},
				{
					firingTriggerId: ['3'],
					name: 'Mixpanel short',
					parameter: [{ key: 'html', value: "mixpanel.init('not-a-token');" }],
					type: 'html',
				},
				{
					firingTriggerId: ['3'],
					name: 'Mixpanel',
					parameter: [
						{
							key: 'html',
							value: "mixpanel.init('0123456789abcdef0123456789abcdef');",
						},
					],
					type: 'html',
				},
				{
					firingTriggerId: ['3'],
					name: 'Nested',
					parameter: [
						{
							key: 'html',
							value:
								'<script src="https://www.googletagmanager.com/gtm.js?id=GTM-NESTED1"></script>',
						},
					],
					type: 'html',
				},
				{
					firingTriggerId: ['3'],
					name: 'Purchase',
					parameter: [
						{ key: 'eventName', value: 'purchase' },
						{ key: 'measurementIdOverride', value: 'G-OTHER123' },
					],
					type: 'gaawe',
				},
				{
					firingTriggerId: ['3'],
					name: 'Dynamic event',
					parameter: [{ key: 'eventName', value: '{{Event}}' }],
					type: 'gaawe',
				},
				{
					firingTriggerId: ['2'],
					name: 'Ads conversion',
					parameter: [
						{ key: 'conversionId', value: '123' },
						{ key: 'conversionLabel', value: 'abcDEF' },
					],
					type: 'awct',
				},
				{
					firingTriggerId: ['3'],
					name: 'Floodlight',
					parameter: [{ key: 'advertiserId', value: '999' }],
					type: 'flc',
				},
			],
			trigger: [
				{
					name: 'Consent Initialization - All Pages',
					triggerId: '1',
					type: 'consentInit',
				},
				{
					customEventFilter: [
						{
							parameter: [
								{ key: 'arg0', value: '{{_event}}' },
								{ key: 'arg1', value: 'signup' },
							],
							type: 'equals',
						},
					],
					name: 'signup',
					triggerId: '2',
					type: 'customEvent',
				},
				{ name: 'All Pages', triggerId: '3', type: 'pageview' },
			],
		},
		exportFormatVersion: 2,
	});

	it('converts named tags, fingerprints custom HTML, and leaves the rest', () => {
		const migration = migrateText(text);
		expect(migration).toMatchObject({
			containerId: 'GTM-TEST123',
			events: [{ measurementId: 'G-OTHER123', name: 'purchase' }],
			source: 'export',
		});
		expect(migration.scripts.map((script) => script.importName)).toEqual([
			'hotjar',
			'metaPixel',
			'posthog',
			'mixpanelAnalytics',
			'gtag',
		]);
		expect(migration.scripts[0]?.options).toEqual([
			{ name: 'siteId', value: 123_456 },
		]);
		expect(migration.scripts[1]?.firesOn).toEqual(['signup', 'gtm.js']);
		expect(migration.scripts[2]?.options).toEqual([
			{ name: 'id', value: 'phc_abc123' },
			{ name: 'region', value: 'us' },
		]);
		expect(migration.scripts[4]?.options).toEqual([
			{ name: 'id', value: 'AW-123' },
			{ name: 'category', value: 'marketing' },
		]);
		expect(migration.ignored).toEqual([
			{
				name: 'Paused pixel',
				reason: 'Paused in GTM, so it does not run.',
				template: 'html',
			},
			{
				name: 'Clicks',
				reason: 'It does not load a vendor.',
				template: 'cl',
			},
		]);
		expect(migration.unmapped).toEqual([
			{
				name: 'Mixpanel short',
				reason: 'No c15t integration matched this tag.',
				template: 'html',
			},
			{
				name: 'Nested',
				reason: 'Loads GTM-NESTED1. Run c15t gtm on that container.',
				template: 'html',
			},
			{
				name: 'Dynamic event',
				reason:
					'The event name is a GTM variable, so the command cannot tell which event it sends.',
				template: 'gaawe',
			},
			{
				name: 'Floodlight',
				reason:
					'There is no separate helper. Load it with gtag() and a DC- id.',
				template: 'flc',
			},
		]);
		expect(migration.warnings).toEqual([
			'Meta Pixel fired on "signup". The helper loads with the page and does not wait for that event.',
			'Google Ads conversion label "abcDEF" is not a script. gtag() loads AW-123; send the conversion from the app.',
			'Google tag fired on "signup". The helper loads with the page and does not wait for that event.',
			'GA4 event "purchase" sends to G-OTHER123, which is not a Google tag in this container.',
		]);
	});
});

describe('snippet', () => {
	it('escapes quotes and wraps a call that does not fit on one line', () => {
		const id = `G-${'A'.repeat(40)}`;
		expect(
			renderSnippet([
				{
					firesOn: [],
					importName: 'gtag',
					label: 'Google tag',
					options: [
						{ name: 'id', value: "a'b\\c" },
						{ name: 'category', value: 'measurement' },
					],
					packageSubpath: 'google-tag',
				},
				{
					firesOn: [],
					importName: 'gtag',
					label: 'Google tag',
					options: [
						{ name: 'id', value: id },
						{ name: 'category', value: 'measurement' },
					],
					packageSubpath: 'google-tag',
				},
			])
		).toBe(
			`import { gtag } from '@c15t/integrations/google-tag';

export const scripts = [
	gtag({ id: 'a\\'b\\\\c', category: 'measurement' }),
	gtag({
		id: '${id}',
		category: 'measurement',
	}),
];
`
		);
	});

	it('returns nothing when there are no scripts', () => {
		expect(renderSnippet([])).toBe('');
	});
});

describe('c15t gtm', () => {
	it('requires a container id or a file', async () => {
		const { logger } = silentLogger();
		const result = await runCli(['gtm'], { cwd: tmpdir(), logger });
		expect(result).toMatchObject({
			error: { code: 'INPUT_REQUIRED' },
			success: false,
		});
	});

	it('documents the command in help', async () => {
		const { logger } = silentLogger();
		const result = await runCli(['gtm', '--help'], { logger });
		expect(result).toMatchObject({
			data: { usage: 'c15t gtm <GTM-ID | file>' },
			success: true,
		});
	});

	it('reads a local gtm.js file and reports its size', async () => {
		const directory = await mkdtemp(path.join(tmpdir(), 'c15t-gtm-'));
		const { logger, messages } = silentLogger();
		try {
			const trailer = 'a'.repeat(5000);
			await writeFile(
				path.join(directory, 'container.js'),
				published(liveContainer, trailer)
			);
			const result = await runCli(['gtm', 'container.js'], {
				cwd: directory,
				logger,
			});
			expect(result).toMatchObject({
				data: {
					gzipBytes: expect.any(Number),
					snippet: liveSnippet,
					source: 'published',
					warnings: [placeholderWarning],
				},
				success: true,
			});
			const data = result.data as { bytes: number; gzipBytes: number };
			expect(data.gzipBytes).toBeLessThan(data.bytes);
			expect(messages.join('\n')).toContain(
				'Remove the Google Tag Manager snippet and register these scripts instead.'
			);
			expect(messages.join('\n')).toContain(`${data.bytes} bytes`);
		} finally {
			await rm(directory, { force: true, recursive: true });
		}
	});

	it('keeps the report off stdout fields when --json is set', async () => {
		const directory = await mkdtemp(path.join(tmpdir(), 'c15t-gtm-'));
		const { logger, messages } = silentLogger();
		try {
			await writeFile(
				path.join(directory, 'container.js'),
				published(liveContainer)
			);
			const result = await runCli(['gtm', 'container.js', '--json'], {
				cwd: directory,
				logger,
			});
			expect(result).toMatchObject({
				data: { snippet: liveSnippet },
				success: true,
			});
			expect(messages.join('\n')).not.toContain('register these scripts');
		} finally {
			await rm(directory, { force: true, recursive: true });
		}
	});

	it('downloads a lowercase id from the public container URL only', async () => {
		const urls: string[] = [];
		const { logger, messages } = silentLogger();
		const dependencies: GtmCommandDependencies = {
			fetch: (url) => {
				urls.push(url);
				return Promise.resolve(
					downloaded(published(liveContainer, 'a'.repeat(5000)))
				);
			},
			readFile: () => Promise.reject(new Error('file should not be read')),
		};
		const migration = await migrateGtm(
			{
				commandArgs: ['gtm-wl5l8nw7'],
				cwd: tmpdir(),
				flags: {},
				logger,
			},
			dependencies
		);
		expect(urls).toEqual([
			'https://www.googletagmanager.com/gtm.js?id=GTM-WL5L8NW7',
		]);
		expect(migration.snippet).toBe(liveSnippet);
		expect(migration.bytes).toBeGreaterThan(migration.gzipBytes ?? 0);
		expect(messages[0]).toContain(liveSnippet.trim());
	});

	it('treats anything other than a container id as a file', async () => {
		const fetch = vi.fn();
		const missing = Object.assign(new Error('missing'), { code: 'ENOENT' });
		await expect(
			migrateGtm(
				{
					commandArgs: ['https://evil.example/gtm.js?id=GTM-AAAA'],
					cwd: '/tmp/c15t-gtm',
					flags: { json: true },
					logger: silentLogger().logger,
				},
				{
					fetch,
					readFile: () => Promise.reject(missing),
				}
			)
		).rejects.toMatchObject({ code: 'FILE_NOT_FOUND' });
		expect(fetch).not.toHaveBeenCalled();
	});

	it('rejects a download that is not the requested container', async () => {
		await expect(
			migrateGtm(
				{
					commandArgs: ['GTM-WL5L8NW7'],
					cwd: tmpdir(),
					flags: { json: true },
					logger: silentLogger().logger,
				},
				{
					fetch: () =>
						Promise.resolve(downloaded('<html>not a container</html>')),
					readFile: () => Promise.reject(new Error('unused')),
				}
			)
		).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
	});

	it('rejects a container body that does not parse', async () => {
		await expect(
			migrateGtm(
				{
					commandArgs: ['GTM-WL5L8NW7'],
					cwd: tmpdir(),
					flags: { json: true },
					logger: silentLogger().logger,
				},
				{
					fetch: () =>
						Promise.resolve(downloaded('GTM-WL5L8NW7 is not a script')),
					readFile: () => Promise.reject(new Error('unused')),
				}
			)
		).rejects.toMatchObject({ code: 'FILE_READ_ERROR' });
	});

	it('reports an HTTP failure and a network failure', async () => {
		const context = {
			commandArgs: ['GTM-WL5L8NW7'],
			cwd: tmpdir(),
			flags: { json: true },
			logger: silentLogger().logger,
		};
		await expect(
			migrateGtm(context, {
				fetch: () => Promise.resolve(downloaded('nope', 404)),
				readFile: () => Promise.reject(new Error('unused')),
			})
		).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
		await expect(
			migrateGtm(context, {
				fetch: () => Promise.reject(new Error('offline')),
				readFile: () => Promise.reject(new Error('unused')),
			})
		).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
	});

	it('warns when the downloaded public id differs', async () => {
		const body = published({
			blob: { '5': 'GTM-OTHER' },
			resource: { macros: [], predicates: [], rules: [], tags: [] },
		});
		const migration = await migrateGtm(
			{
				commandArgs: ['GTM-WL5L8NW7'],
				cwd: tmpdir(),
				flags: { json: true },
				logger: silentLogger().logger,
			},
			{
				fetch: () => Promise.resolve(downloaded(`${body}\n// GTM-WL5L8NW7`)),
				readFile: () => Promise.reject(new Error('unused')),
			}
		);
		expect(migration.containerId).toBe('GTM-OTHER');
		expect(migration.warnings).toContain(
			'Downloaded container is GTM-OTHER, not GTM-WL5L8NW7.'
		);
		expect(migration.snippet).toBe('');
	});

	it('does not report a JSON export as the gtm.js size', async () => {
		const directory = await mkdtemp(path.join(tmpdir(), 'c15t-gtm-'));
		try {
			await writeFile(
				path.join(directory, 'container.json'),
				JSON.stringify({
					containerVersion: {
						container: { publicId: 'GTM-FILE' },
						tag: {
							name: 'Linker',
							parameter: [],
							type: 'gclidw',
						},
						trigger: [],
					},
					exportFormatVersion: 2,
				})
			);
			const result = await runCli(['gtm', 'container.json', '--json'], {
				cwd: directory,
				logger: silentLogger().logger,
			});
			expect(result).toMatchObject({
				data: {
					containerId: 'GTM-FILE',
					ignored: [
						{
							name: 'Linker',
							reason: 'It is part of the Google tag.',
							template: 'gclidw',
						},
					],
					snippet: '',
					source: 'export',
				},
				success: true,
			});
			expect(result.data).not.toHaveProperty('bytes');
		} finally {
			await rm(directory, { force: true, recursive: true });
		}
	});

	it('names a listener and a long unknown script in the report', () => {
		const src = `https://cdn.example.com/${'a'.repeat(200)}.js`;
		const container: ParsedGtmContainer = {
			source: 'export',
			tags: [
				{
					blockedOn: [],
					consent: [],
					firesOn: [],
					name: 'Clicks',
					parameters: {},
					paused: false,
					template: 'cl',
				},
				{
					blockedOn: [],
					consent: [],
					firesOn: [],
					name: 'Pixel',
					parameters: { html: `<script src="${src}"></script>` },
					paused: false,
					template: 'html',
				},
			],
		};
		const report = formatGtmReport(migrateContainer(container));
		const script = src.slice(0, 120);
		expect(report).toContain(
			'- Click listener "Clicks". It does not load a vendor.\n'
		);
		expect(report).toContain(
			`- Custom HTML "Pixel". No c15t integration matched this tag. Script: ${script}\n`
		);
	});
});
