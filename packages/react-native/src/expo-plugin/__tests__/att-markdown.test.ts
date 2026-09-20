/**
 * The Markdown spelling of the App Tracking Transparency prompt.
 *
 * Apple added `NSUserTrackingMarkdownUsageDescription` for the expanded European
 * Union prompt: iOS and iPadOS 27.2 and later, with the device and the signed-in
 * Apple Account both inside one of the countries Apple enabled it for. Everywhere
 * else, and on every older system, Apple reads
 * `NSUserTrackingUsageDescription`. Two rules follow from that, and both are
 * tested here rather than trusted: the plain prompt is written whatever else is
 * written, and a value the host already owns is not the plugin's to replace, in
 * the plist or in a locale's string table.
 *
 * The per-locale cases run against a real parsed `.xcodeproj`, because a string
 * table that never reaches the Resources phase is a localization that ships
 * nothing, which is exactly the mistake no runtime can report.
 */

import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { IOSConfig } from '@expo/config-plugins';
import type { ExportedConfig, XcodeProject } from '@expo/config-plugins';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveParams } from '../params';
import { FIXTURE_DIR, applyToFixture, runInfoPlist, runMod } from './helpers';

const BACKEND = 'https://consent.example.com';

/** ATT on, with only the prompt string Apple has always read. */
const ATT_PROPS = {
	backendURL: BACKEND,
	enableAppTrackingTransparency: true,
	trackingUsageDescription: 'We use your activity to pick the ads you see.',
} as const;

const MARKDOWN_KEY = 'NSUserTrackingMarkdownUsageDescription';
const PLAIN_KEY = 'NSUserTrackingUsageDescription';

/** Bold, a link, and the paragraph break Markdown is allowed to carry. */
const MARKDOWN =
	'**Track your activity** for ads.\n\nRead our [policy](https://example.com/policy).';

/** The same copy as a string table holds it: newlines escaped, one line. */
const MARKDOWN_IN_TABLE = String.raw`"**Track your activity** for ads.\n\nRead our [policy](https://example.com/policy).";`;

/** The app folder name the fixture project uses. */
const PROJECT_NAME = 'C15tBare';

const scratchRoots: string[] = [];

/** A generated iOS project, as `expo prebuild` leaves one behind. */
const scratchProject = function scratchProject(): string {
	const root = mkdtempSync(join(tmpdir(), 'c15t-att-markdown-'));
	const projectPackage = join(root, 'ios', `${PROJECT_NAME}.xcodeproj`);
	mkdirSync(join(root, 'ios', PROJECT_NAME), { recursive: true });
	mkdirSync(projectPackage, { recursive: true });
	copyFileSync(
		join(FIXTURE_DIR, 'project.pbxproj'),
		join(projectPackage, 'project.pbxproj')
	);
	// Expo names the app folder after the source root, which it finds by looking
	// for the app delegate, so a project without one has no name to write into.
	writeFileSync(join(root, 'ios', PROJECT_NAME, 'AppDelegate.swift'), '');
	scratchRoots.push(root);
	return root;
};

/** The table iOS reads one locale's plist strings from. */
const tableOf = function tableOf(root: string, locale: string): string {
	return join(
		root,
		'ios',
		PROJECT_NAME,
		'Supporting',
		`${locale}.lproj`,
		'InfoPlist.strings'
	);
};

const localizedTo = function localizedTo(
	values: Readonly<Record<string, string>>
): ExportedConfig {
	return applyToFixture({
		...ATT_PROPS,
		trackingMarkdownUsageDescriptionLocalizations: values,
	});
};

/** Run the Xcode mod the way prebuild does, over the project just parsed. */
const runXcodeMod = async function runXcodeMod(
	config: ExportedConfig,
	root: string,
	project: XcodeProject,
	options: { introspect?: boolean } = {}
): Promise<XcodeProject> {
	const applied = await runMod(config, 'ios', 'xcodeproj', project, {
		...options,
		projectName: PROJECT_NAME,
		projectRoot: root,
	});
	return applied.modResults as XcodeProject;
};

/** One `PBXBuildFile`-style section of a generated project file. */
const sectionOf = function sectionOf(pbxproj: string, name: string): string {
	const begin = pbxproj.indexOf(`Begin ${name} section`);
	const end = pbxproj.indexOf(`End ${name} section`);
	expect(begin, `the project file has no ${name} section`).toBeGreaterThan(-1);
	expect(end, `the project file has no ${name} section`).toBeGreaterThan(-1);
	return pbxproj.slice(begin, end);
};

/** The lines of a table that carry this key, so duplicates show up as a count. */
const entryLines = function entryLines(
	contents: string,
	key: string
): string[] {
	return contents.split('\n').filter((line) => line.includes(key));
};

/** The regions the written project declares it speaks, one entry each. */
const knownRegionsOf = function knownRegionsOf(pbxproj: string): string[] {
	const body = pbxproj.match(/knownRegions = \((?<regions>[\s\S]*?)\);/u)
		?.groups?.regions;
	expect(body, 'the project file has no knownRegions list').not.toBeUndefined();

	return (body as string)
		.split('\n')
		.map((line) => line.trim().replace(/,$/u, '').replace(/^"|"$/gu, ''))
		.filter((line) => line !== '');
};

afterEach(() => {
	for (const root of scratchRoots.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
});

describe('the Markdown prompt in Info.plist', () => {
	it('writes it beside the plain prompt, which stays the fallback', async () => {
		const applied = await runInfoPlist(
			applyToFixture({
				...ATT_PROPS,
				trackingMarkdownUsageDescription: MARKDOWN,
			})
		);

		expect(applied.ios?.infoPlist).toStrictEqual({
			ITSAppUsesNonExemptEncryption: false,
			[MARKDOWN_KEY]: MARKDOWN,
			[PLAIN_KEY]: 'We use your activity to pick the ads you see.',
			'com.c15t.backend.mode': 'hosted',
			'com.c15t.backend.url': BACKEND,
		});
	});

	it('keeps a Markdown prompt the host wrote into the plist', async () => {
		const applied = await runMod(
			applyToFixture({
				...ATT_PROPS,
				trackingMarkdownUsageDescription: MARKDOWN,
			}),
			'ios',
			'infoPlist',
			{ [MARKDOWN_KEY]: '**Written by the host, reviewed by legal.**' }
		);

		expect(applied.ios?.infoPlist).toMatchObject({
			[MARKDOWN_KEY]: '**Written by the host, reviewed by legal.**',
			[PLAIN_KEY]: 'We use your activity to pick the ads you see.',
		});
	});

	it('writes no Markdown prompt the host did not ask for', async () => {
		const applied = await runInfoPlist(applyToFixture(ATT_PROPS));

		expect(applied.ios?.infoPlist).not.toHaveProperty(MARKDOWN_KEY);
		expect(applied.ios?.infoPlist).toHaveProperty(PLAIN_KEY);
	});
});

describe('the Markdown prompt in each locale bundle', () => {
	it('writes one table per locale and registers it with the project', async () => {
		const root = scratchProject();
		const written = await runXcodeMod(
			localizedTo({
				'de-AT': 'DE: **Track your activity.**',
				fr: 'FR: **Track your activity.**',
			}),
			root,
			IOSConfig.XcodeUtils.getPbxproj(root)
		);
		const pbxproj = written.writeSync();

		expect(readFileSync(tableOf(root, 'de-AT'), 'utf8')).toContain(
			'"NSUserTrackingMarkdownUsageDescription" = ' +
				'"DE: **Track your activity.**";'
		);
		expect(readFileSync(tableOf(root, 'fr'), 'utf8')).toContain(
			'FR: **Track your activity.**'
		);

		// On disk is not enough: a table outside the Resources phase never reaches
		// the bundle, and Apple then answers with the plain prompt.
		expect(pbxproj).toContain('de-AT.lproj');
		expect(sectionOf(pbxproj, 'PBXBuildFile')).toMatch(/InfoPlist\.strings/u);
		expect(sectionOf(pbxproj, 'PBXResourcesBuildPhase')).toMatch(
			/InfoPlist\.strings/u
		);
	});

	it('escapes paragraph breaks so the table still parses', async () => {
		const root = scratchProject();
		await runXcodeMod(
			localizedTo({ de: MARKDOWN }),
			root,
			IOSConfig.XcodeUtils.getPbxproj(root)
		);
		const contents = readFileSync(tableOf(root, 'de'), 'utf8');

		// A raw newline inside a quoted value makes the whole table unparseable,
		// and Apple resolves an unparseable table by ignoring the file.
		expect(contents).toContain(MARKDOWN_IN_TABLE);
		expect(entryLines(contents, MARKDOWN_KEY)).toHaveLength(1);
	});

	it('escapes quotes and backslashes so the value cannot end early', async () => {
		const root = scratchProject();
		await runXcodeMod(
			localizedTo({ it: 'Say "not now" to tracking\\advertising' }),
			root,
			IOSConfig.XcodeUtils.getPbxproj(root)
		);

		expect(readFileSync(tableOf(root, 'it'), 'utf8')).toContain(
			String.raw`"Say \"not now\" to tracking\\advertising";`
		);
	});

	it('keeps a Markdown entry the host already wrote in a locale', async () => {
		const root = scratchProject();
		const path = tableOf(root, 'de');
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, '"NSUserTrackingMarkdownUsageDescription" = "Host";\n');

		const written = await runXcodeMod(
			localizedTo({ de: 'DE: **Track your activity.**' }),
			root,
			IOSConfig.XcodeUtils.getPbxproj(root)
		);

		// Untouched, not merely unoverwritten: an appended second entry would leave
		// the bundle to pick one of them.
		expect(readFileSync(path, 'utf8')).toBe(
			'"NSUserTrackingMarkdownUsageDescription" = "Host";\n'
		);
		expect(sectionOf(written.writeSync(), 'PBXResourcesBuildPhase')).toMatch(
			/InfoPlist\.strings/u
		);
	});

	it('keeps every other string in a table it adds to', async () => {
		const root = scratchProject();
		const path = tableOf(root, 'de');
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, '"NSUserTrackingUsageDescription" = "Host plain";\n');

		await runXcodeMod(
			localizedTo({ de: 'DE: **Track your activity.**' }),
			root,
			IOSConfig.XcodeUtils.getPbxproj(root)
		);
		const contents = readFileSync(path, 'utf8');

		expect(contents).toContain(
			'"NSUserTrackingUsageDescription" = "Host plain";'
		);
		expect(contents).toContain('DE: **Track your activity.**');
	});

	it('leaves a UTF-16 table in UTF-16', async () => {
		const root = scratchProject();
		const path = tableOf(root, 'de');
		mkdirSync(dirname(path), { recursive: true });
		// Xcode wrote tables like this for years, and rewriting one as UTF-8 would
		// lose the entries in it.
		writeFileSync(
			path,
			Buffer.from('\uFEFF"CFBundleDisplayName" = "Alt";\n', 'utf16le')
		);

		await runXcodeMod(
			localizedTo({ de: 'DE: **Track your activity.**' }),
			root,
			IOSConfig.XcodeUtils.getPbxproj(root)
		);
		const bytes = readFileSync(path);

		expect([bytes[0], bytes[1]]).toStrictEqual([0xff, 0xfe]);
		const contents = bytes.subarray(2).toString('utf16le');
		expect(contents).toContain('"CFBundleDisplayName" = "Alt";');
		expect(contents).toContain('DE: **Track your activity.**');
	});

	it('adds one entry and one resource when prebuild runs it twice', async () => {
		const root = scratchProject();
		const config = localizedTo({ de: 'DE: **Track your activity.**' });
		const once = await runXcodeMod(
			config,
			root,
			IOSConfig.XcodeUtils.getPbxproj(root)
		);
		const afterOnce = once.writeSync();
		const twice = await runXcodeMod(config, root, once);

		expect(twice.writeSync()).toBe(afterOnce);
		expect(
			entryLines(readFileSync(tableOf(root, 'de'), 'utf8'), MARKDOWN_KEY)
		).toHaveLength(1);
	});

	it('writes nothing while introspecting the config', async () => {
		const root = scratchProject();

		await runXcodeMod(
			localizedTo({ de: 'DE: **Track your activity.**' }),
			root,
			IOSConfig.XcodeUtils.getPbxproj(root),
			{ introspect: true }
		);

		expect(existsSync(tableOf(root, 'de'))).toBe(false);
	});

	it('never registers the project when nothing is localized', () => {
		expect(applyToFixture(ATT_PROPS).mods?.ios?.xcodeproj).toBeUndefined();
	});
});

describe('making the locales one the app claims to speak', () => {
	it('lists the plugin locales beside the ones the host declared', async () => {
		const applied = await runMod(
			localizedTo({
				de: 'DE: **Track your activity.**',
				fr: 'FR: **Track your activity.**',
			}),
			'ios',
			'infoPlist',
			{ CFBundleLocalizations: ['en', 'fr'] }
		);

		// The host's own list keeps its order and loses nothing, `fr` is not
		// added a second time, and `de` lands after what was already there:
		// without this key iOS never opens the bundles those tables sit in.
		expect(applied.ios?.infoPlist).toMatchObject({
			CFBundleLocalizations: ['en', 'fr', 'de'],
		});
	});

	it('adds each locale to the project known regions', async () => {
		const root = scratchProject();
		const written = await runXcodeMod(
			localizedTo({
				'fr-CA': 'FRCA: **Track your activity.**',
				'zh-Hans': 'ZH: **Track your activity.**',
			}),
			root,
			IOSConfig.XcodeUtils.getPbxproj(root)
		);

		const regions = knownRegionsOf(written.writeSync());
		expect(regions).toContain('fr-CA');
		expect(regions).toContain('zh-Hans');
	});

	it('does not repeat a region the project already knows', async () => {
		const root = scratchProject();
		const written = await runXcodeMod(
			localizedTo({
				de: 'DE: **Track your activity.**',
				en: 'EN: **Track your activity.**',
			}),
			root,
			IOSConfig.XcodeUtils.getPbxproj(root)
		);

		// `en` is in the fixture's list already, so it must appear exactly once
		// even though the host localized a prompt for it, and `de` must still
		// arrive: a writer that bailed out on the known region could do neither.
		const regions = knownRegionsOf(written.writeSync());
		expect(regions.filter((region) => region === 'en')).toHaveLength(1);
		expect(regions).toContain('de');
	});

	it('keeps Base and en in the list it appends to', async () => {
		const root = scratchProject();
		const written = await runXcodeMod(
			localizedTo({ de: 'DE: **Track your activity.**' }),
			root,
			IOSConfig.XcodeUtils.getPbxproj(root)
		);

		// Overwriting the list rather than appending to it would drop the two
		// regions every Xcode project starts with, and the app default language
		// with them.
		const regions = knownRegionsOf(written.writeSync());
		expect(regions).toContain('Base');
		expect(regions).toContain('en');
	});

	it('keeps Base and en in their original order at the head', async () => {
		const root = scratchProject();
		const written = await runXcodeMod(
			localizedTo({ de: 'DE: **Track your activity.**' }),
			root,
			IOSConfig.XcodeUtils.getPbxproj(root)
		);

		const regions = knownRegionsOf(written.writeSync());
		expect(regions.slice(0, 2)).toStrictEqual(['en', 'Base']);
	});

	it('claims nothing and touches no project when no locale was named', async () => {
		const config = applyToFixture(ATT_PROPS);

		const applied = await runInfoPlist(config);
		expect(applied.ios?.infoPlist).not.toHaveProperty('CFBundleLocalizations');

		// With no mod registered the project file is never opened, which is the
		// only honest way knownRegions stays exactly as the host left it.
		expect(config.mods?.ios?.xcodeproj).toBeUndefined();
	});

	it('claims a base Markdown prompt alone without a locale list', async () => {
		const applied = await runInfoPlist(
			applyToFixture({
				...ATT_PROPS,
				trackingMarkdownUsageDescription: MARKDOWN,
			})
		);

		// A base string needs no bundle of its own, so the key stays the host's.
		expect(applied.ios?.infoPlist).not.toHaveProperty('CFBundleLocalizations');
	});
});

describe('what the Markdown prompt refuses', () => {
	it('refuses a Markdown prompt with the opt-in off', () => {
		expect(() =>
			applyToFixture({
				backendURL: BACKEND,
				trackingMarkdownUsageDescription: MARKDOWN,
			})
		).toThrowError(/enableAppTrackingTransparency is off/u);
	});

	it('refuses localized Markdown with the opt-in off', () => {
		expect(() =>
			applyToFixture({
				backendURL: BACKEND,
				trackingMarkdownUsageDescriptionLocalizations: {
					de: 'DE: **Track your activity.**',
				},
			})
		).toThrowError(/enableAppTrackingTransparency is off/u);
	});

	it.each([
		['empty', ''],
		['only spaces', '   '],
		['only a newline and a tab', '\n\t '],
	])('refuses a Markdown description that is %s', (_label, value) => {
		// Refused rather than written: Apple falls back to the plain key, so the
		// host would ship a prompt they believed they had replaced.
		expect(() =>
			applyToFixture({
				...ATT_PROPS,
				trackingMarkdownUsageDescription: value,
			})
		).toThrowError(/trackingMarkdownUsageDescription is blank/u);
	});

	it('refuses a locale with no copy', () => {
		expect(() =>
			applyToFixture({
				...ATT_PROPS,
				trackingMarkdownUsageDescriptionLocalizations: {
					de: '   ',
					fr: 'FR: **Track your activity.**',
				},
			})
		).toThrowError(/has no copy for de/u);
	});

	it.each([
		['an empty tag', ''],
		['a tag of spaces', '   '],
		['a path', '../Escape'],
		['a nested folder', 'de/FR'],
		['two tags divided by a space', 'en US'],
	])('refuses %s', (_label, locale) => {
		// The tag names the `.lproj` folder the table is written into, so a tag
		// that is not one flat token would put a file outside the bundle.
		expect(() =>
			applyToFixture({
				...ATT_PROPS,
				trackingMarkdownUsageDescriptionLocalizations: {
					[locale]: 'DE: **Track your activity.**',
				},
			})
		).toThrowError(/must be locale tags/u);
	});

	it('refuses an empty localization map', () => {
		expect(() =>
			applyToFixture({
				...ATT_PROPS,
				trackingMarkdownUsageDescriptionLocalizations: {},
			})
		).toThrowError(/trackingMarkdownUsageDescriptionLocalizations is empty/u);
	});
});

describe('the resolved Markdown parameters', () => {
	it('trims the copy and keeps the order the host wrote', () => {
		const { appTrackingTransparency } = resolveParams({
			...ATT_PROPS,
			trackingMarkdownUsageDescription: `  ${MARKDOWN}  `,
			trackingMarkdownUsageDescriptionLocalizations: {
				' fr ': ' FR: **Track your activity.** ',
				de: 'DE: **Track your activity.**',
			},
		});

		expect(appTrackingTransparency).toMatchObject({
			markdownUsageDescription: MARKDOWN,
			markdownUsageDescriptionLocalizations: [
				{ locale: 'fr', value: 'FR: **Track your activity.**' },
				{ locale: 'de', value: 'DE: **Track your activity.**' },
			],
		});
	});

	it('reports no Markdown for an install that asked for none', () => {
		expect(resolveParams(ATT_PROPS).appTrackingTransparency).toMatchObject({
			markdownUsageDescription: null,
			markdownUsageDescriptionLocalizations: [],
			usageDescription: 'We use your activity to pick the ads you see.',
		});
	});
});
