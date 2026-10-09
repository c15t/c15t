/**
 * The local resolution step of the browser manifest resolver: the policy
 * for the visitor's location, in the visitor's language. The transport
 * loads this module when it resolves in the browser. A page whose policy
 * depends on a location it doesn't know asks the backend's `/init` instead
 * and never loads it.
 *
 * @internal
 */
import {
	POLICY_CONTRACT_VERSION,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import type {
	ConsentManifest,
	InitOutput,
	ResolveInitFromManifestInputs,
} from '@c15t/schema/types';
import { enTranslations } from '@c15t/translations';
import type { BaseTranslations, Translations } from '@c15t/translations';

import { mapInitOutputToInitResponse } from './init-output';
import type { TransportInitResponse } from './init-output';

/** A language whose base copy loads on demand. */
export type OtherLanguage = Exclude<keyof BaseTranslations, 'en'>;

/**
 * Every language the resolver may pick besides English. Their loaders live
 * in `./manifest-browser-languages`, loaded on first use, so this chunk
 * names one chunk rather than one per language.
 */
const otherLanguages = new Set<string>(
	'bg cs cy da de el es et fi fr ga gu he hi hr hu id is it lb lt lv mt nb nl nn pl pt rm ro sk sl sv zh'.split(
		' '
	)
);

const isOtherLanguage = (language: string): language is OtherLanguage =>
	otherLanguages.has(language);

/** Base copy loaded so far, shared by every transport on the page. */
const loadedLanguages = new Map<string, Translations>([['en', enTranslations]]);

/**
 * Load one language's base copy. Resolves to `undefined` when the chunk
 * fails to load; a later init tries again.
 */
const loadLanguage = async function loadLanguage(
	language: OtherLanguage
): Promise<Translations | undefined> {
	try {
		const { loadLanguageCopy } = await import('./manifest-browser-languages');
		const copy = await loadLanguageCopy(language);
		if (copy) {
			loadedLanguages.set(language, copy);
		}
		return copy;
	} catch {
		return undefined;
	}
};

/**
 * Every language the resolver may pick, each with the copy loaded so far
 * and English standing in for the rest. Language selection only looks at
 * which languages exist, so a resolution against this picks the same
 * language as one against every language's real copy.
 */
const selectableBaseTranslations = function selectableBaseTranslations(
	withPlaceholders: boolean
): BaseTranslations {
	const base: Record<string, Translations> = {};
	if (withPlaceholders) {
		for (const language of otherLanguages) {
			base[language] = enTranslations;
		}
	}
	for (const [language, copy] of loadedLanguages) {
		base[language] = copy;
	}
	return base as unknown as BaseTranslations;
};

/**
 * Resolve init from a manifest, loading the base copy of the language it
 * resolves to first if that copy isn't loaded yet.
 */
const resolveWithLanguage = async function resolveWithLanguage(
	manifest: ConsentManifest,
	inputs: ResolveInitFromManifestInputs
): Promise<InitOutput> {
	const output = resolveInitFromManifest(manifest, inputs, {
		baseTranslations: selectableBaseTranslations(true),
	});
	const { language } = output.translations;
	if (!isOtherLanguage(language) || loadedLanguages.has(language)) {
		return output;
	}
	const copy = await loadLanguage(language);
	return resolveInitFromManifest(manifest, inputs, {
		// Without the copy, resolve against what is loaded, so the visitor
		// gets English rather than English labelled as another language.
		baseTranslations: selectableBaseTranslations(copy !== undefined),
	});
};

/**
 * Resolve init in the browser: the policy, the visitor's language and, for
 * an IAB policy, the vendor list.
 *
 * @param manifest - The manifest.
 * @param inputs - The visitor's decision inputs.
 * @param fetchImpl - Fetch implementation for the vendor list.
 * @returns The init response the kernel applies.
 * @internal
 */
export const resolveLocally = async function resolveLocally(
	manifest: ConsentManifest,
	inputs: ResolveInitFromManifestInputs,
	fetchImpl: typeof globalThis.fetch
): Promise<TransportInitResponse> {
	const output = await resolveWithLanguage(manifest, inputs);
	if (manifest.iab?.enabled === true) {
		// IAB is opt-in, so the vendor list code loads on demand.
		const { attachVendorList } = await import('./manifest-browser-iab');
		await attachVendorList(output, manifest, fetchImpl);
	}
	// Local resolution always produces the v3 wire; the manifest's own
	// schema version decides matched, lifted, or failed inside it.
	return mapInitOutputToInitResponse(
		output,
		inputs.gpc === undefined ? {} : { 'sec-gpc': inputs.gpc ? '1' : '0' },
		{ producerContract: POLICY_CONTRACT_VERSION }
	);
};
