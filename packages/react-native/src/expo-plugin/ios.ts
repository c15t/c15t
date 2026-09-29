import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { IOSConfig } from '@expo/config-plugins';
import type { InfoPlist, XcodeProject } from '@expo/config-plugins';

import { IOS_PLIST_KEY } from './constants';
import { C15tPluginError } from './errors';
import { IOS_TRANSPORT_MODE } from './params';
import type { ResolvedC15tParams } from './params';

/**
 * The `ios.privacyManifests` shape, narrowed to what c15t declares.
 *
 * Written into the Expo config rather than straight to disk: prebuild's default
 * plugins run `IOSConfig.PrivacyInfo.withPrivacyInfo`, which merges this field
 * into the app's `PrivacyInfo.xcprivacy`. A plugin that wrote the file itself
 * would fight that merge on every `expo prebuild`.
 */
export interface C15tPrivacyManifestDeclarations {
	/** Whether the shipped binary uses data for tracking. */
	NSPrivacyTracking: boolean;
	/** Hosts the binary may send tracking data to. */
	NSPrivacyTrackingDomains: string[];
}

/**
 * `NSUserTrackingMarkdownUsageDescription`, Apple's Markdown prompt key.
 *
 * Apple's name, read by Apple, so it stays out of {@link IOS_PLIST_KEY}: that
 * table is the contract with the embedded cores, and the reader check in
 * `__tests__/native-key-readers.test.ts` holds it to keys the bridge reads.
 */
const MARKDOWN_USAGE_DESCRIPTION_KEY = 'NSUserTrackingMarkdownUsageDescription';

/**
 * The table iOS reads a localized plist string from.
 *
 * `Info.plist` itself holds one value per key, so a localized prompt is a string
 * in `<locale>.lproj/InfoPlist.strings` and nothing else.
 */
const INFO_PLIST_STRINGS_FILE = 'InfoPlist.strings';

/**
 * The list of localizations the app declares it speaks.
 *
 * iOS picks which `<locale>.lproj` table answers a localized plist key from
 * what the bundle names here, so a table written into a bundle whose locale is
 * not listed is never opened. That is why every locale this plugin writes a
 * table for is declared here too.
 */
const CF_BUNDLE_LOCALIZATIONS_KEY = 'CFBundleLocalizations';

/**
 * Build the flat `Info.plist` entries that configure the core.
 *
 * Absent values stay absent rather than empty: the bridge treats a missing key
 * as "not configured" and falls back to the safe option, while an empty string
 * is a value it has to parse.
 */
export const buildInfoPlistEntries = function buildInfoPlistEntries(
	params: ResolvedC15tParams
): Record<string, string | boolean | string[]> {
	const entries: Record<string, string | boolean | string[]> = {
		[IOS_PLIST_KEY.transportMode]: IOS_TRANSPORT_MODE[params.mode],
	};

	if (params.backendURL !== null) {
		entries[IOS_PLIST_KEY.backendURL] = params.backendURL;
	}
	if (params.initURL !== null) {
		entries[IOS_PLIST_KEY.initURL] = params.initURL;
	}
	if (params.domain !== null) {
		entries[IOS_PLIST_KEY.domain] = params.domain;
	}
	// A real plist array, not a joined string: the bridge reads this key as
	// `[String]` and drops names that are not category raw values. An empty
	// declaration stays unwritten, because absence is the full-scope answer.
	if (params.consentCategories.length > 0) {
		entries[IOS_PLIST_KEY.categories] = [...params.consentCategories];
	}
	// The same list Android gets as meta-data, written as text because that is the
	// shape `C15tBridgeConfiguration.declaredVendors` and the Android reader share.
	// An empty declaration stays unwritten, because absence is the full-disclosure
	// answer; the cores prune whatever they are served down to these ids either way.
	if (params.vendors.length > 0) {
		entries[IOS_PLIST_KEY.vendors] = params.vendors.join(',');
	}
	if (params.forceGPC) {
		entries[IOS_PLIST_KEY.gpc] = true;
	}
	// Only the opt-out is worth recording; on is the bridge's own default.
	if (!params.autoBootstrap) {
		entries[IOS_PLIST_KEY.autoBootstrap] = false;
	}

	return entries;
};

const isSkAdNetworkItem = function isSkAdNetworkItem(
	value: unknown
): value is { SKAdNetworkIdentifier: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { SKAdNetworkIdentifier?: unknown })
			.SKAdNetworkIdentifier === 'string'
	);
};

/**
 * Union the plugin's identifiers with whatever the host already declared.
 *
 * `SKAdNetworkItems` is one array for the whole app and an ad partner's plugin
 * writes to the same key, so neither side may overwrite it.
 */
const mergeSkAdNetworkItems = function mergeSkAdNetworkItems(
	existing: unknown,
	identifiers: readonly string[]
): { SKAdNetworkIdentifier: string }[] {
	const current = Array.isArray(existing) ? existing : [];
	const merged = current.filter(isSkAdNetworkItem);
	const seen = new Set(merged.map((item) => item.SKAdNetworkIdentifier));

	for (const identifier of identifiers) {
		if (!seen.has(identifier)) {
			seen.add(identifier);
			merged.push({ SKAdNetworkIdentifier: identifier });
		}
	}

	return merged;
};

/**
 * Union the plugin's locales with whatever the host already declared.
 *
 * `CFBundleLocalizations` is one array for the whole app, and an ad partner's
 * plugin or the host itself writes to the same key, so neither side may
 * overwrite the other. The host's entries keep their order and the plugin's
 * locales land after them, which is the rule {@link mergeSkAdNetworkItems}
 * already follows for the key the ad networks share.
 */
const mergeBundleLocalizations = function mergeBundleLocalizations(
	existing: unknown,
	locales: readonly string[]
): string[] {
	const current = Array.isArray(existing)
		? existing.filter((value): value is string => typeof value === 'string')
		: [];
	const merged = [...current];

	for (const locale of locales) {
		if (!merged.includes(locale)) {
			merged.push(locale);
		}
	}

	return merged;
};

/**
 * Write c15t's bootstrap config and tracking keys into `Info.plist`.
 *
 * The App Tracking Transparency keys appear only when the host opted in. Apple
 * reads `NSUserTrackingUsageDescription` as a promise about the app, and a
 * binary that carries it without ever asking looks like a harvest to a reviewer.
 * Consent to marketing cookies is not Apple tracking authorization, so nothing
 * about a consent configuration turns these on.
 *
 * The plain prompt is written whenever the opt-in is on, even with a Markdown one
 * beside it. Apple falls back to it outside the countries it gates the expanded
 * prompt to and on every system that predates it, so the Markdown key is an
 * addition and never a replacement. Per-locale copies are not here at all: they
 * belong in each bundle's `InfoPlist.strings`, which
 * {@link applyLocalizedMarkdownDescriptions} writes.
 *
 * A localized prompt is only reached when the bundle also names that locale in
 * `CFBundleLocalizations`, so every locale the string writer registers is
 * declared here as well; without it the tables sit in bundles iOS never opens.
 *
 * @param params - Resolved plugin parameters.
 * @param infoPlist - The `Info.plist` as it stands.
 * @returns A new plist object; the input is not mutated.
 */
export const applyInfoPlist = function applyInfoPlist(
	params: ResolvedC15tParams,
	infoPlist: InfoPlist
): InfoPlist {
	const next: InfoPlist = { ...infoPlist, ...buildInfoPlistEntries(params) };

	const att = params.appTrackingTransparency;
	if (!att.enabled) {
		return next;
	}

	// A host that already wrote its own prompt string keeps it.
	if (typeof next.NSUserTrackingUsageDescription !== 'string') {
		next.NSUserTrackingUsageDescription = att.usageDescription ?? '';
	}

	// A host that already wrote its own Markdown prompt keeps that too, and the
	// plain string above is written either way: it is the answer Apple uses
	// outside the expanded prompt's regions and on older systems.
	if (
		att.markdownUsageDescription !== null &&
		typeof next[MARKDOWN_USAGE_DESCRIPTION_KEY] !== 'string'
	) {
		next[MARKDOWN_USAGE_DESCRIPTION_KEY] = att.markdownUsageDescription;
	}

	if (att.skAdNetworkIdentifiers.length > 0) {
		next.SKAdNetworkItems = mergeSkAdNetworkItems(
			infoPlist.SKAdNetworkItems,
			att.skAdNetworkIdentifiers
		);
	}

	// Only when a locale was named: an app that localized nothing answers the
	// prompt from its own localization, and writing this key would speak for
	// every localization the host ships.
	const localizedLocales = att.markdownUsageDescriptionLocalizations.map(
		({ locale }) => locale
	);
	if (localizedLocales.length > 0) {
		next[CF_BUNDLE_LOCALIZATIONS_KEY] = mergeBundleLocalizations(
			infoPlist[CF_BUNDLE_LOCALIZATIONS_KEY],
			localizedLocales
		);
	}

	return next;
};

/** A localized string table as it sits on disk. */
interface InfoPlistStringsFile {
	/** Decoded text, host entries and all. */
	readonly contents: string;
	/** Byte order mark to write back, so an existing table keeps its shape. */
	readonly byteOrderMark: string;
	readonly encoding: 'utf16le' | 'utf8';
}

/**
 * Read a localized string table, or `null` when this bundle has none yet.
 *
 * Xcode has written these as UTF-16 for years and writes them as UTF-8 now, so
 * both byte order marks are honoured rather than assumed away: a table decoded
 * wrongly and rewritten would lose whatever else the host had in it. A table in
 * neither encoding is refused rather than rewritten, because the alternative is
 * to destroy a file the plugin was only meant to add one line to.
 */
const readInfoPlistStrings = async function readInfoPlistStrings(
	path: string
): Promise<InfoPlistStringsFile | null> {
	if (!existsSync(path)) {
		return null;
	}
	const bytes = await readFile(path);

	if (bytes[0] === 0xff && bytes[1] === 0xfe) {
		return {
			byteOrderMark: '\uFEFF',
			contents: bytes.subarray(2).toString('utf16le'),
			encoding: 'utf16le',
		};
	}
	if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
		return {
			byteOrderMark: '\uFEFF',
			contents: bytes.subarray(3).toString('utf8'),
			encoding: 'utf8',
		};
	}

	const contents = bytes.toString('utf8');
	if (contents.includes('\uFFFD')) {
		throw new C15tPluginError(
			`${path} is not a UTF-8 or UTF-16 string table, so this plugin ` +
				`cannot add ${MARKDOWN_USAGE_DESCRIPTION_KEY} to it without a ` +
				`chance of losing what is already in there. Add the entry by hand.`
		);
	}
	return { byteOrderMark: '', contents, encoding: 'utf8' };
};

/**
 * Escape prompt copy for the string-table grammar.
 *
 * Markdown is allowed to carry paragraph breaks, and a raw newline inside a
 * quoted value makes the whole table unparseable, which Apple resolves by
 * ignoring the file. So newlines arrive as `\n`, and a quote or backslash that
 * ended the value early would do the same damage.
 */
const escapeStringsValue = function escapeStringsValue(value: string): string {
	return value
		.replace(/\\/gu, '\\\\')
		.replace(/"/gu, '\\"')
		.replace(/\r?\n/gu, '\\n')
		.replace(/\r/gu, '\\r');
};

/** Whether a string table already declares this key, quoted or bare. */
const declaresKey = function declaresKey(
	contents: string,
	key: string
): boolean {
	return new RegExp(`^[ \\t]*(?:"|')?${key}(?:"|')?[ \\t]*=`, 'mu').test(
		contents
	);
};

/**
 * Add the Markdown prompt to one bundle's string table, keeping what is there.
 *
 * This is a merge rather than a write: the same file carries the host's own
 * localized strings and any other plugin's, and a bundle that already answers
 * this key keeps the host's copy, which is the same rule the plist writer follows.
 * A file created here is written from nothing, so it carries one line naming where
 * it came from.
 */
const addMarkdownEntryToStrings = async function addMarkdownEntryToStrings(
	path: string,
	value: string
): Promise<void> {
	const existing = await readInfoPlistStrings(path);
	if (
		existing !== null &&
		declaresKey(existing.contents, MARKDOWN_USAGE_DESCRIPTION_KEY)
	) {
		return;
	}

	const entry = `"${MARKDOWN_USAGE_DESCRIPTION_KEY}" = "${escapeStringsValue(value)}";`;
	const contents =
		existing === null
			? `/* Added by @c15t/react-native at prebuild. */\n${entry}\n`
			: `${existing.contents.replace(/\s*$/u, '')}\n\n${entry}\n`;
	const payload = `${existing?.byteOrderMark ?? ''}${contents}`;

	// A table read as UTF-16 goes back out as UTF-16, and one read as UTF-8 goes
	// back out as UTF-8, which is what keeps a host's own entries readable.
	const utf16 = existing?.encoding === 'utf16le';
	await writeFile(path, Buffer.from(payload, utf16 ? 'utf16le' : 'utf8'));
};

/**
 * Write the per-locale Markdown prompt into each `<locale>.lproj` bundle.
 *
 * The strings are only worth a file if the build compiles it into the app, so the
 * table goes through the same two steps Expo's own `ios.locales` support uses:
 * `ensureGroupRecursively` to place the bundle in the project, then
 * `addResourceFileToGroup` to put it in the Resources phase. A file written to
 * disk and left out of the project is a localization that ships nothing, which is
 * the failure this plugin's own reader check exists to catch.
 *
 * @param params - Resolved plugin parameters.
 * @param options - The parsed project, its folder name, and the app project root.
 * @returns The same project, with a group, a resource, and a known region per
 * locale.
 */
export const applyLocalizedMarkdownDescriptions =
	async function applyLocalizedMarkdownDescriptions(
		params: ResolvedC15tParams,
		options: {
			readonly projectName: string;
			readonly project: XcodeProject;
			readonly projectRoot: string;
		}
	): Promise<XcodeProject> {
		const { markdownUsageDescriptionLocalizations: localizations } =
			params.appTrackingTransparency;
		if (localizations.length === 0) {
			return options.project;
		}

		const { projectName, projectRoot } = options;
		// The folder Expo's own locale support uses, so one bundle per locale holds
		// every localized plist string rather than two half-populated ones.
		const supportingDirectory = join(
			projectRoot,
			'ios',
			projectName,
			'Supporting'
		);

		// One bundle per locale is its own file, so the tables go in together. The
		// project edits below stay in a loop: each one reads the project the previous
		// one returned.
		await Promise.all(
			localizations.map(async ({ locale, value }) => {
				const directory = join(supportingDirectory, `${locale}.lproj`);
				await mkdir(directory, { recursive: true });
				return addMarkdownEntryToStrings(
					join(directory, INFO_PLIST_STRINGS_FILE),
					value
				);
			})
		);

		let nextProject = options.project;

		// A bundle the project has never heard of is not a localization to the
		// build: `knownRegions` is what makes a `.lproj` one. `addKnownRegion`
		// appends after the regions already listed and skips one it knows, so
		// `Base`, `en`, and any region the host added keep their place.
		for (const { locale } of localizations) {
			nextProject.addKnownRegion(locale);
		}

		for (const { locale } of localizations) {
			const groupName = `${projectName}/Supporting/${locale}.lproj`;
			const group = IOSConfig.XcodeUtils.ensureGroupRecursively(
				nextProject,
				groupName
			);
			if (
				!group?.children.some(
					(child: { comment?: string }) =>
						child.comment === INFO_PLIST_STRINGS_FILE
				)
			) {
				nextProject = IOSConfig.XcodeUtils.addResourceFileToGroup({
					filepath: `${locale}.lproj/${INFO_PLIST_STRINGS_FILE}`,
					groupName,
					isBuildFile: true,
					project: nextProject,
				});
			}
		}

		return nextProject;
	};

/**
 * Build the `ios.privacyManifests` entries c15t is responsible for.
 *
 * The core declares no required-reason API types: it stores consent in the
 * Keychain and its own application-support files, and neither is on Apple's
 * required-reason list. Collected data types stay with the host, whose App Store
 * Connect declaration is the thing that has to match.
 */
export const buildPrivacyManifestDeclarations =
	function buildPrivacyManifestDeclarations(
		params: ResolvedC15tParams
	): C15tPrivacyManifestDeclarations {
		return {
			NSPrivacyTracking: params.appTrackingTransparency.enabled,
			NSPrivacyTrackingDomains: [...params.privacyTrackingDomains],
		};
	};
