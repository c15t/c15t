import { legacyPresetMaterial } from './legacy-preset-material';
import type { PolicyRule, PolicyRuleReview } from './policy-rule';
import { policyMatchers } from './policy-runtime';

/**
 * Preset Europe pack mode used by {@link policyRulePresets}.
 */
export type EuropePolicyRuleMode = 'opt-in' | 'iab';

const GPC_SOURCE = 'https://www.w3.org/TR/2026/WD-gpc-20260611/';
const CCPA_SOURCE = 'https://oag.ca.gov/privacy/ccpa';
const ICO_SOURCE =
	'https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/';
const PECR_SOURCE = 'https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1';
const GIBRALTAR_SOURCE =
	'https://www.gra.gi/uploads/documents/data-protection/Documents/Guidance/GN28%20Cookies.pdf';
const MALAYSIA_SCOPE =
	'PDPA sections 2 and 3 govern applicability: commercial transactions, establishment or use of equipment in Malaysia, and the exclusion for overseas processing unless intended for further processing in Malaysia. Visitor location alone neither establishes nor rules out applicability; override the matcher for the actual processing scope.';
const EDPB_SOURCE =
	'https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf';
const QUEBEC_SOURCE =
	'https://www.cai.gouv.qc.ca/protection-renseignements-personnels/sujets-et-domaines-dinteret/principaux-changements-loi-25';

const QUEBEC_CONSENT_SOURCE =
	'https://www.cai.gouv.qc.ca/uploads/pdfs/CAI_Criteres_Validite_Consentement.pdf';

const SHARED_ASSUMPTIONS = [
	'365-day choice and notice validity are independent c15t product defaults, not legal requirements.',
	'A refusal in the requested scope suppresses automatic choice prompts, including after policy changes or grant expiry. New, changed or expired opt-in purposes remain denied until the user opens preferences and grants them.',
	'Equivalent default prominence for accept and reject is a c15t product invariant.',
	'The controller owns processing facts, legal basis, copy and legal review; this preset is starter configuration.',
];

const sourceReview = function sourceReview(
	sources: string[],
	assumptions: string[]
): PolicyRuleReview {
	return {
		assumptions: [...assumptions, ...SHARED_ASSUMPTIONS],
		reviewBy: '2026-12-15',
		reviewedOn: '2026-09-08',
		sources,
		status: 'reviewed',
	};
};

const fullProof = { storeIp: true, storeLanguage: true, storeUserAgent: true };

const europeRule = function europeRule(mode: EuropePolicyRuleMode): PolicyRule {
	const isIab = mode === 'iab';
	return {
		id: isIab ? 'europe_iab' : 'europe_opt_in',
		match: policyMatchers.merge(
			policyMatchers.iab(),
			// Gibraltar has its own cookie-consent law; it is neither EEA nor UK.
			policyMatchers.countries(['GI']),
			policyMatchers.fallback()
		),
		model: mode,
		prompt: 'choice',
		proof: fullProof,
		review: sourceReview(
			[ICO_SOURCE, EDPB_SOURCE, GIBRALTAR_SOURCE],
			isIab
				? [
						'IAB TCF 2.3 only. No TCF 2.4 claim.',
						'Covers consent-requiring processing in the EEA, UK and Gibraltar, including separately geocoded EU territories. National analytics exemptions need separate scoped configurations.',
						'Used as the geo fallback so an unknown location gets the strictest configured behavior.',
					]
				: [
						'Optional categories stay denied until an explicit choice; consent is never inferred from inactivity.',
						'Covers consent-requiring processing in the EEA, UK and Gibraltar, including separately geocoded EU territories. National analytics exemptions need separate scoped configurations.',
						'Used as the geo fallback so an unknown location gets the strictest configured behavior.',
					]
		),
		validity: { choiceDays: 365 },
	};
};

/**
 * Known location with no consent law that grants rights: processing is
 * permitted by default, no prompt, no rights, so no consent UI renders.
 */
const worldNoneRule = function worldNoneRule(): PolicyRule {
	return {
		id: 'world_none',
		match: policyMatchers.default(),
		model: 'none',
		prompt: 'none',
		proof: { storeIp: false, storeLanguage: false, storeUserAgent: false },
		review: {
			assumptions: [
				'Applies where no consent law grants the visitor rights over the optional categories, so no prompt, control or acknowledgement is owed.',
				'Matches known locations no other rule covers. The matcher dataset is finite and does not establish that an unlisted location has no privacy law; review the locations your traffic actually comes from.',
				'No GPC mapping; add privacySignals.gpc where the deployment honors the signal anyway.',
				...SHARED_ASSUMPTIONS,
			],
			reviewBy: '2026-12-15',
			status: 'pending',
		},
	};
};

const californiaRule = function californiaRule(
	mode: 'opt-in' | 'opt-out'
): PolicyRule {
	const isOptOut = mode === 'opt-out';
	const rule: PolicyRule = {
		id: isOptOut ? 'california_opt_out' : 'california_opt_in',
		match: policyMatchers.regions([{ country: 'US', region: 'CA' }]),
		model: mode,
		privacySignals: { gpc: { denyCategories: ['marketing', 'measurement'] } },
		prompt: isOptOut ? 'none' : 'choice',
		proof: fullProof,
		review: sourceReview(
			[CCPA_SOURCE, GPC_SOURCE],
			[
				'The referenced GPC specification is the W3C Working Draft of 11 June 2026, not a final Recommendation.',
				'A user-enabled GPC signal is honored as an opt-out of sale and sharing; it never creates consent.',
				'Mapping GPC to marketing and measurement is a conservative product default and must be checked against actual processing purposes. Not all measurement is sale or sharing.',
				'Removing the browser signal is not a withdrawal of a recorded opt-out.',
				isOptOut
					? 'No first-layer prompt. Disclosure, preferences and the opt-out right stay reachable without a visible banner.'
					: 'Opt-in is an optional deployment choice. It does not establish a general California opt-in mandate.',
			]
		),
		validity: { choiceDays: 365, noticeDays: 365 },
	};
	if (isOptOut) {
		rule.rights = ['preferences'];
	}
	return rule;
};

const quebecRule = function quebecRule(): PolicyRule {
	return {
		id: 'quebec_opt_in',
		match: policyMatchers.regions([{ country: 'CA', region: 'QC' }]),
		model: 'opt-in',
		prompt: 'choice',
		proof: fullProof,
		review: sourceReview(
			[QUEBEC_SOURCE, QUEBEC_CONSENT_SOURCE],
			[
				'Optional identification, location and profiling functions require prior information and activation under section 8.1. Classify technical operations separately.',
				'The CAI consent guidelines describe validity criteria, including purpose-specific choice and duration; they do not establish a blanket cookie opt-in rule.',
				'The Law 25 highest-privacy-default provision does not apply to cookie privacy settings; this preset makes no blanket opt-in claim from it.',
			]
		),
		validity: { choiceDays: 365 },
	};
};

const worldOptOutNoPromptRule = function worldOptOutNoPromptRule(): PolicyRule {
	return {
		i18n: { messageProfile: 'preferences' },
		id: 'world_opt_out_no_prompt',
		match: policyMatchers.default(),
		model: 'opt-out',
		prompt: 'none',
		proof: { storeIp: false, storeLanguage: false, storeUserAgent: true },
		review: sourceReview(
			[],
			[
				'Intentional allow-by-default configuration with no first-layer prompt. Disclosure, preferences and the opt-out right stay reachable.',
				'Include this rule explicitly only after reviewing locations not covered by the pack. The matcher dataset is finite and does not establish that an unlisted location has no privacy law.',
				'This is controller configuration, never the runtime fallback for a failed or unmatched resolution.',
				'No GPC mapping; add privacySignals.gpc where the deployment honors the signal.',
			]
		),
		rights: ['preferences'],
		validity: { choiceDays: 365, noticeDays: 365 },
	};
};

// Curated coverage as of 8 September 2026. Future effective dates are excluded.
const US_PRIVACY_STATES = [
	'CA',
	'CO',
	'CT',
	'DE',
	'FL',
	'IA',
	'IN',
	'KY',
	'MD',
	'MN',
	'MT',
	'NE',
	'NH',
	'NJ',
	'OR',
	'RI',
	'TN',
	'TX',
	'UT',
	'VA',
];

const regionalReview = function regionalReview(
	sources: string[],
	assumptions: string[]
): PolicyRuleReview {
	return {
		...sourceReview(sources, assumptions),
		reviewBy: '2026-12-15',
		reviewedOn: '2026-09-08',
	};
};

const countryOptIn = function countryOptIn(
	id: string,
	country: string,
	sources: string[],
	assumptions: string[]
): PolicyRule {
	return {
		id,
		match: policyMatchers.countries([country]),
		model: 'opt-in',
		prompt: 'choice',
		review: regionalReview(sources, [
			'Optional categories stay denied until an explicit choice. Use this workflow for consent-based processing; other lawful bases and exemptions need their own configuration.',
			'This country matcher does not determine territorial scope, sensitive-data rules, child protections, recipient-specific consent or cross-border transfer requirements.',
			...assumptions,
		]),
		validity: { choiceDays: 365 },
	};
};

const usPrivacyStatesRule = function usPrivacyStatesRule(
	mode: 'opt-in' | 'opt-out'
): PolicyRule {
	const isOptOut = mode === 'opt-out';
	return {
		id: isOptOut ? 'us_privacy_states_opt_out' : 'us_privacy_states_opt_in',
		match: policyMatchers.regions(
			US_PRIVACY_STATES.map((region) => ({ country: 'US', region }))
		),
		model: mode,
		privacySignals: { gpc: { denyCategories: ['marketing', 'measurement'] } },
		prompt: isOptOut ? 'none' : 'choice',
		review: regionalReview(
			[
				CCPA_SOURCE,
				'https://coag.gov/resources/colorado-privacy-act/',
				'https://www.flsenate.gov/Laws/Statutes/2025/501.702',
				'https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4707&enactments=false',
				'https://www.ag.ky.gov/about/Office-Divisions/ODP/KCDPA/Pages/default.aspx',
				'https://www.in.gov/attorneygeneral/files/Consumer_Data-Bill-of-Rights.pdf',
				'https://webserver.rilegislature.gov/Statutes/TITLE6/6-48.1/INDEX.htm',
				'https://www.legis.la.gov/legis/BillInfo.aspx?b=SB386&s=26RS&sbi=y',
				'https://legislature.vermont.gov/Documents/2026/Docs/ACTS/ACT145/ACT145%20Act%20Summary.pdf',
				'https://portal.ct.gov/ag/sections/privacy/the-connecticut-data-privacy-act',
				GPC_SOURCE,
			],
			[
				'Curated coverage of 20 states as of 8 September 2026, including the narrower Florida law. Applicability thresholds and exemptions differ; location alone does not determine applicability.',
				'These variants cover ordinary adult, non-sensitive processing. Child protections, sensitive-data consent or prohibitions, assessments and appeal workflows need separate implementation.',
				isOptOut
					? 'No automatic banner. Supply timely disclosures and persistent opt-out controls; an optional notice dismissal records no consent.'
					: 'Optional categories stay denied until an explicit choice. Opt-in is a deployment choice, not a claim that every covered state requires it.',
				'GPC denies marketing and measurement across the group as a conservative product mapping, not a claim that every state mandates GPC or all measurement is sale, sharing or targeted advertising.',
				'The referenced GPC specification is a Working Draft, not a final Recommendation. Removing the signal does not withdraw a recorded opt-out.',
				'Maryland collection minimization and sensitive-data/minor prohibitions require separate processing controls. Connecticut prohibits sale and targeted advertising using minors data from 1 July 2026. Consent cannot waive these limits.',
				'Louisiana and Oklahoma start 1 January 2027, Alabama 1 May 2027 and Vermont 1 January 2028. These future laws are excluded from the current group. Nevada sale opt-outs and sector laws also apply outside it.',
			]
		),
		validity: isOptOut
			? { choiceDays: 365, noticeDays: 365 }
			: { choiceDays: 365 },
	};
};

/** Non-consent processing defaults; the host establishes the applicable basis. */
const countryOptOut = function countryOptOut(
	id: string,
	country: string,
	sources: string[],
	assumptions: string[]
): PolicyRule {
	return {
		i18n: { messageProfile: 'preferences' },
		id,
		match: policyMatchers.countries([country]),
		model: 'opt-out',
		prompt: 'none',
		review: regionalReview(sources, [
			'Only for processing whose reviewed basis permits it before a consent choice. This preset does not establish that basis.',
			'Supply required information before processing and persistent refusal controls. A no-prompt setting does not remove those duties.',
			...assumptions,
		]),
		validity: { choiceDays: 365 },
	};
};

const CANADA_CONSENT_SOURCE =
	'https://www.priv.gc.ca/en/privacy-topics/technology/online-privacy-tracking-cookies/tracking-and-ads/gl_ba_1112/';

const canadaRule = function canadaRule(mode: 'opt-in' | 'opt-out'): PolicyRule {
	const rule = countryOptOut(
		'canada_opt_out',
		'CA',
		[CANADA_CONSENT_SOURCE],
		[
			'For nonsensitive processing meeting meaningful-consent requirements. The OPC permits opt-out behavioral advertising only with prominent purposes and parties at or before collection, immediate persistent refusal and minimized retention.',
			'Sensitive, unexpected or significantly risky processing requires a separate express-consent assessment. The host must establish federal or provincial applicability.',
			'Quebec is excluded. A missing province must not select this opt-out profile.',
		]
	);
	return {
		...rule,
		id: mode === 'opt-in' ? 'canada_opt_in' : 'canada_opt_out',
		match: policyMatchers.regions(
			[
				'AB',
				'BC',
				'MB',
				'NB',
				'NL',
				'NS',
				'NT',
				'NU',
				'ON',
				'PE',
				'SK',
				'YT',
			].map((region) => ({ country: 'CA', region }))
		),
		model: mode,
		prompt: mode === 'opt-in' ? 'choice' : 'notice',
		validity: { choiceDays: 365, noticeDays: 365 },
	};
};

export interface PolicyRulePresets {
	/** Australia: notified, expected nonsensitive processing with persistent refusal. */
	australiaOptOut: () => PolicyRule;
	/** Japan: no prompt when APPI consent triggers are absent and publication duties are met. */
	japanOptOut: () => PolicyRule;
	/** Canada outside Quebec: express-choice alternative for reviewed processing. */
	canadaOptIn: () => PolicyRule;
	/** Canada outside Quebec: notice and opt-out for eligible nonsensitive processing. */
	canadaOptOut: () => PolicyRule;
	/** UK: service statistics only, with information and free objection. Advertising stays denied. */
	ukStatistics: () => PolicyRule;
	/** Malaysia: solely statistics/research, nonidentifying output and no secondary uses. */
	malaysiaStatistics: () => PolicyRule;

	/** China: opt-in starter for disclosed optional purposes relying on consent. */
	chinaOptIn: () => PolicyRule;
	/** Malaysia: opt-in starter for disclosed optional purposes relying on consent. */
	malaysiaOptIn: () => PolicyRule;
	/** Thailand: opt-in starter for disclosed optional purposes relying on consent. */
	thailandOptIn: () => PolicyRule;
	/** Indonesia: opt-in starter for disclosed optional purposes relying on consent. */
	indonesiaOptIn: () => PolicyRule;
	/** Philippines: opt-in starter for disclosed optional purposes relying on consent. */
	philippinesOptIn: () => PolicyRule;
	/** Vietnam: opt-in starter for disclosed optional purposes relying on consent. */
	vietnamOptIn: () => PolicyRule;
	/** Brunei: opt-in starter for disclosed optional purposes relying on consent. */
	bruneiOptIn: () => PolicyRule;
	/** Laos: opt-in starter for disclosed optional purposes relying on consent. */
	laosOptIn: () => PolicyRule;
	/** Brazil: opt-in starter for disclosed optional purposes relying on consent. */
	brazilOptIn: () => PolicyRule;
	/** Switzerland: opt-in starter for disclosed optional purposes relying on consent. */
	switzerlandOptIn: () => PolicyRule;
	/** Türkiye: opt-in starter for disclosed optional purposes relying on consent. */
	turkeyOptIn: () => PolicyRule;
	/** Switzerland: no prompt for reviewed low-risk processing with prior information and persistent opt-out. */
	switzerlandOptOutNoPrompt: () => PolicyRule;

	/** US privacy states: no automatic prompt, GPC honored, persistent opt-out controls required. */
	usPrivacyStatesOptOut: () => PolicyRule;
	/** US privacy states: opt-in choice, GPC honored. Same state coverage as opt-out. */
	usPrivacyStatesOptIn: () => PolicyRule;
	/** Australia: opt-in starter for optional tracking. */
	australiaOptIn: () => PolicyRule;
	/** Singapore: opt-in starter; does not implement deemed consent. */
	singaporeOptIn: () => PolicyRule;
	/** Japan: opt-in starter for optional tracking. */
	japanOptIn: () => PolicyRule;
	/** South Korea: opt-in starter; review purpose and third-party consent separately. */
	southKoreaOptIn: () => PolicyRule;
	/** India: opt-in starter; DPDP commencement is phased through May 2027. */
	indiaOptIn: () => PolicyRule;
	/** UAE federal opt-in starter; DIFC and ADGM need business-specific configuration. */
	uaeOptIn: () => PolicyRule;
	/** Saudi Arabia: opt-in starter for optional tracking. */
	saudiArabiaOptIn: () => PolicyRule;
	/** Europe opt-in preset (EEA + UK + Gibraltar, geo fallback). Choice prompt. */
	europeOptIn: () => PolicyRule;
	/** Europe IAB TCF 2.3 preset (EEA + UK + Gibraltar, geo fallback). Choice prompt. */
	europeIab: () => PolicyRule;
	/** California opt-in preset (US-CA). Choice prompt, GPC honored. */
	californiaOptIn: () => PolicyRule;
	/** California opt-out preset (US-CA). No prompt, GPC honored, rights persistent. */
	californiaOptOut: () => PolicyRule;
	/** Quebec opt-in preset (CA-QC). Choice prompt. */
	quebecOptIn: () => PolicyRule;
	/**
	 * Known location with no consent law granting rights: `none` model, no
	 * prompt, no rights, no consent UI. The recommended global default.
	 */
	worldNone: () => PolicyRule;
	/**
	 * Explicit global default that keeps preferences reachable: opt-out with
	 * no first-layer prompt. Not part of the recommended pack; choose it when
	 * every uncovered location should still offer a preference center.
	 */
	worldOptOutNoPrompt: () => PolicyRule;
}

/**
 * Built-in v3 policy rule presets for regional starting points.
 *
 * @remarks
 * These are starter configurations. Each carries `review` metadata with the
 * primary sources, review date and assumptions it encodes. A source review
 * checks those assumptions; it does not approve a deployment or determine its
 * legal basis. Review the configuration against your own processing purposes.
 *
 * @example
 * ```ts
 * import { policyRulePresets } from '@c15t/schema';
 *
 * const rules = [
 *   policyRulePresets.europeOptIn(),
 *   policyRulePresets.usPrivacyStatesOptOut(),
 *   policyRulePresets.australiaOptIn(),
 * ];
 * ```
 */
export const policyRulePresets: PolicyRulePresets = {
	australiaOptIn: () =>
		countryOptIn(
			'australia_opt_in',
			'AU',
			[
				'https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/tracking-pixels-and-privacy-obligations',
			],
			[
				'Use opt-in for consent-based processing. Australian Privacy Principles also permit eligible expected nonsensitive processing with notice and refusal; see australiaOptOut.',
			]
		),
	australiaOptOut: () =>
		countryOptOut(
			'australia_opt_out',
			'AU',
			[
				'https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/tracking-pixels-and-privacy-obligations',
				'https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-7-app-7-direct-marketing',
			],
			[
				'APP necessity, notice and purpose limits still apply. Expected nonsensitive direct marketing can use the APP 7 opt-out route; sensitive and unexpected third-party uses need separate consent/basis review.',
			]
		),
	brazilOptIn: () =>
		countryOptIn(
			'brazil_opt_in',
			'BR',
			[
				'https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@display-file/file',
			],
			[
				'ANPD cookie guidance recommends consent for uses such as advertising and behavioral profiling; other legal bases need their own assessment. This preset uses consent for optional categories.',
				'Keep consent-based cookies off until choice, disclose specific purposes, make rejection readily available and support withdrawal.',
			]
		),
	bruneiOptIn: () =>
		countryOptIn(
			'brunei_opt_in',
			'BN',
			['https://pdp.aiti.gov.bn/media/tndpduml/s-1_2025-e.pdf'],
			[
				'The PDPO permits consent, specified deemed-consent routes and exceptions. This preset uses explicit consent for optional processing.',
				'Nonpersonal processing and assessed exceptions can avoid consent requests. Personal-data ad targeting requires consent under PDPC cookie guidance.',
				'Deemed consent by notification requires an assessment and a reasonable opportunity to opt out; it excludes sending direct marketing messages. Dismissing a notice does not implement that route.',
				'The host must notify purposes and honor withdrawal under sections 13 and 17.',
			]
		),
	californiaOptIn: () => ({
		...californiaRule('opt-in'),
		legacyMaterial: structuredClone(legacyPresetMaterial.californiaOptIn),
	}),
	californiaOptOut: () => ({
		...californiaRule('opt-out'),
		legacyMaterial: structuredClone(legacyPresetMaterial.californiaOptOut),
	}),
	canadaOptIn: () => canadaRule('opt-in'),
	canadaOptOut: () => canadaRule('opt-out'),
	chinaOptIn: () =>
		countryOptIn(
			'china_opt_in',
			'CN',
			[
				'https://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559.htm',
				'https://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559_2.htm',
			],
			[
				'PIPL Articles 13–17 govern the processing basis, informed consent and withdrawal. This preset covers ordinary optional processing relying on consent.',
				'A category grant does not establish separate consent for provision to other controllers, sensitive information or overseas transfers under Articles 23, 29 and 39. Keep those operations independently gated until their required permissions and transfer conditions are satisfied.',
				'Personalized commercial recommendations need a non-personalized option or convenient refusal under Article 24.',
			]
		),
	europeIab: () => ({
		...europeRule('iab'),
		legacyMaterial: structuredClone(legacyPresetMaterial.europeIab),
	}),
	europeOptIn: () => ({
		...europeRule('opt-in'),
		legacyMaterial: structuredClone(legacyPresetMaterial.europeOptIn),
	}),
	indiaOptIn: () =>
		countryOptIn(
			'india_opt_in',
			'IN',
			[
				'https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023-1.pdf',
				'https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf',
				'https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf',
			],
			[
				'DPDP commencement is phased, with full enforceability announced for 13 May 2027. This preset is an opt-in product default now, not a claim that every DPDP duty is already in force.',
				'Using c15t does not make a deployment a registered Consent Manager under the DPDP Act.',
			]
		),
	indonesiaOptIn: () =>
		countryOptIn(
			'indonesia_opt_in',
			'ID',
			[
				'https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang%2Bnomor%2B27%2Btahun%2B2022',
			],
			[
				'Law 27/2022 provides several processing bases. This preset uses explicit, recorded consent for disclosed optional purposes, with withdrawal available through preferences.',
				'The controller must supply the required information and retain proof of consent; category settings do not implement transfer safeguards or all data-subject requests.',
			]
		),
	japanOptIn: () =>
		countryOptIn(
			'japan_opt_in',
			'JP',
			['https://www.ppc.go.jp/personalinfo/faq/APPI_QA/'],
			[
				'APPI treatment depends on whether cookie data is personal information or personal-related information, including how a recipient combines it. Review third-party provision and applicable external-transmission notices separately.',
			]
		),
	japanOptOut: () =>
		countryOptOut(
			'japan_opt_out',
			'JP',
			[
				'https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/',
				'https://laws.e-gov.go.jp/law/359AC0000000086',
			],
			[
				'Only where APPI third-party provision, sensitive-data or recipient-matching consent is not triggered. A settings button does not implement the APPI registered third-party-provision opt-out procedure.',
				'Telecommunications Business Act Article 27-12 requires notice or accessible publication for covered telecommunications services, subject to its exemptions. Ordinary corporate and own-retail sites are not automatically covered; APPI still applies. Disclose information sent, recipients and purposes where required.',
			]
		),
	laosOptIn: () =>
		countryOptIn(
			'laos_opt_in',
			'LA',
			['https://lsp.moic.gov.la/?id=289&r=site%2Fdisplaylegal'],
			[
				'Law on Electronic Data Protection 25/NA applies to electronic data. Article 12 requires purpose information and owner approval for collection of specific data, including personal data.',
				'Article 17 addresses permission for sending or transferring data, including transfers abroad. Generic category consent does not establish a separate transfer permission or satisfy all collection notifications.',
				'No general analytics exemption was verified in the available official translation. Obtain local interpretation before relying on an exception.',
			]
		),
	malaysiaOptIn: () =>
		countryOptIn(
			'malaysia_opt_in',
			'MY',
			[
				'https://www.pdp.gov.my/ppdpv1/en/akta/pdp-act-2010-en/',
				'https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-amendment-act-2024/',
				'https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-general-practice/',
				'https://www.pdp.gov.my/ppdpv1/wp-content/uploads/2026/04/Data-Protection-By-Design-Guideline-DpbD.pdf',
			],
			[
				MALAYSIA_SCOPE,
				'PDPA section 6 provides consent and specified exceptions. This preset uses consent for optional processing within the commercial-transactions scope of the Act.',
				'Section 7 requires the written notice in the national language and English. A single automatically selected UI translation does not supply that bilingual notice; the host must provide it.',
				'The General Code describes contextual implied consent, but the 2026 Data Protection by Design guideline recommends opt-in where consent is the basis and gives an essential-cookies-only default example. Do not infer page-load tracking permission from the older Code.',
				'Section 45(2)(c) separately exempts qualifying statistics-only processing. Use malaysiaStatistics only after reviewing all included processing.',
				'Sensitive personal data and international transfers need separate assessment under the amended Act.',
			]
		),
	malaysiaStatistics: () => ({
		...countryOptOut(
			'malaysia_statistics',
			'MY',
			[
				'https://www.pdp.gov.my/ppdpv1/wp-content/uploads/2024/07/UNDANG-UNDANG-MALAYSIA_AKTA_PERLINDUNGAN_DATA_PERIBADI_2010_709_MALAY_AND-ENG_V2022.pdf',
			],
			[
				MALAYSIA_SCOPE,
				'PDPA section 45(2)(c) requires processing solely for statistics/research, no other use and nonidentifying published results. Advertising, profiling for other purposes and vendor reuse are excluded.',
				'This is an exemption-based processing configuration, not implied consent obtained by dismissing a banner. Review every included measurement script. Security, Retention and Data Integrity Principles remain applicable.',
			]
		),
		categories: ['measurement'],
		scopeMode: 'strict',
	}),
	philippinesOptIn: () =>
		countryOptIn(
			'philippines_opt_in',
			'PH',
			[
				'https://privacy.gov.ph/data-privacy-act/',
				'https://privacy.gov.ph/wp-content/uploads/2023/11/NPC-Circular-No.-2023-04_Guidelines-on-Consent_07Nov2023.pdf',
			],
			[
				'Sections 12 and 13 distinguish lawful processing bases and sensitive-information conditions. This preset assumes consent for the configured optional purposes, not that consent is the only lawful basis.',
				'Disclose specific purposes and recipients; a broad category label alone is not an informed consent notice.',
			]
		),
	quebecOptIn: () => ({
		...quebecRule(),
		legacyMaterial: structuredClone(legacyPresetMaterial.quebecOptIn),
	}),
	saudiArabiaOptIn: () =>
		countryOptIn(
			'saudi_arabia_opt_in',
			'SA',
			[
				'https://sdaia.gov.sa/en/SDAIA/about/Documents/ImplementingRegulation.pdf',
			],
			[
				'PDPL Article 26 and Implementing Regulation Article 29 require consent for covered marketing, with refusal available afterward. An assessed Article 16 basis may cover expected nonsensitive analytics; this preset uses consent.',
			]
		),
	singaporeOptIn: () =>
		countryOptIn(
			'singapore_opt_in',
			'SG',
			[
				'https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/ag-on-selected-topics/advisory-guidelines-on-the-pdpa-for-selected-topics-(revised-may-2024).pdf',
				'https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/ag-on-key-concepts/advisory-guidelines-on-key-concepts-in-the-pdpa-17-may-2022.pdf',
			],
			[
				'Nonpersonal processing and assessed exceptions can avoid consent requests. Personal-data ad targeting requires consent under PDPC cookie guidance.',
				'Deemed consent by notification requires an assessment and a reasonable opt-out period. This preset uses explicit choice and does not implement that route.',
			]
		),
	southKoreaOptIn: () =>
		countryOptIn(
			'south_korea_opt_in',
			'KR',
			['https://elaw.klri.re.kr/eng_service/lawViewContent.do?hseq=71740'],
			[
				'PIPA permits multiple processing bases. When relying on consent, purpose disclosures, optional consent and third-party provision need their own assessment; category toggles do not establish those facts.',
			]
		),
	switzerlandOptIn: () =>
		countryOptIn(
			'switzerland_opt_in',
			'CH',
			['https://www.edoeb.admin.ch/en/cookie-guidelines-updated-version'],
			[
				'Use this variant for optional tracking relying on consent, including highly intrusive or high-risk profiling. FDPIC guidance distinguishes these uses from lower-risk information-and-opt-out cases.',
				'Assess sensitive data, profiling, third-party tracking and transfers separately; the CH matcher alone cannot establish a justification for processing.',
			]
		),
	switzerlandOptOutNoPrompt: () => ({
		i18n: { messageProfile: 'preferences' },
		id: 'switzerland_opt_out_no_prompt',
		match: policyMatchers.countries(['CH']),
		model: 'opt-out',
		prompt: 'none',
		review: regionalReview(
			['https://www.edoeb.admin.ch/en/cookie-guidelines-updated-version'],
			[
				'Only for processing with a reviewed justification that does not require prior consent. Unexpected low-intrusion uses require notice prominent enough that first-time visitors cannot ignore it.',
				'The host must provide the required information before processing and a persistent, accessible way to refuse. No prompt does not mean no disclosure.',
				'Do not use this variant for high-risk profiling, third-party advertising networks or unexpected tracking on political, religious or trade-union sites. This preset excludes these cases; assess them separately and use switzerlandOptIn for lawful consent-based processing.',
				'This preset does not map GPC or establish a US sale-or-sharing right. Use a preferences control labelled for the actual processing.',
			]
		),
		rights: ['preferences'],
		validity: { choiceDays: 365 },
	}),
	thailandOptIn: () =>
		countryOptIn(
			'thailand_opt_in',
			'TH',
			[
				'https://www.etda.or.th/getattachment/e820df2c-848f-4e03-86cb-a9dad38cc713/ENG-Version.aspx',
			],
			[
				'PDPA section 19 requires informed, freely given consent and accessible withdrawal when consent is the basis. Sections 24 and 26 provide other bases and sensitive-data conditions.',
				'Describe each consent purpose separately. Optional tracking must not be a condition for unrelated service.',
			]
		),
	turkeyOptIn: () =>
		countryOptIn(
			'turkey_opt_in',
			'TR',
			[
				'https://www.kvkk.gov.tr/Icerik/7595/2022-1358',
				'https://www.kvkk.gov.tr/Icerik/6649/Personal-Data-Protection-Law',
			],
			[
				'KVKK decision 2022/1358 requires opt-in for non-essential cookies when another applicable processing condition is absent. Necessary cookies are assessed separately.',
				'This preset relies on consent for optional purposes; disclosures, sensitive-data conditions and overseas transfers require separate assessment.',
			]
		),
	uaeOptIn: () =>
		countryOptIn(
			'uae_opt_in',
			'AE',
			['https://www.uaelegislation.gov.ae/en/legislations/1972/download'],
			[
				'Federal Decree-Law 45/2021 provides consent and specific exceptions, not a general legitimate-interest basis. The AE location matcher does not select DIFC or ADGM business regimes.',
				'Executive-regulation issuance and the resulting compliance transition were not established in this source review. Verify current federal applicability before deployment.',
			]
		),
	ukStatistics: () => ({
		...countryOptOut(
			'uk_statistics',
			'GB',
			[PECR_SOURCE, ICO_SOURCE],
			[
				'PECR Schedule A1 paragraph 5 requires service-improvement statistics as the sole purpose, limits sharing to assistance with those improvements, and requires information plus a free, simple objection mechanism. Paragraph 5(2) excludes collecting or monitoring automatically emitted device information, such as Wi-Fi probe requests.',
				'ICO guidance limits this route to aggregate service statistics: no advertising, retained individual histories, cross-site tracking or vendor reuse. A provider must act only as a processor for this purpose. Personal-data processing still needs a UK GDPR lawful basis.',
				'Provide clear information and a simple free objection mechanism. Every measurement script must meet these conditions; category membership alone is insufficient.',
			]
		),
		categories: ['measurement'],
		scopeMode: 'strict',
	}),
	usPrivacyStatesOptIn: () => usPrivacyStatesRule('opt-in'),
	usPrivacyStatesOptOut: () => usPrivacyStatesRule('opt-out'),
	vietnamOptIn: () =>
		countryOptIn(
			'vietnam_opt_in',
			'VN',
			[
				'https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup=',
				'https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/7/91qh.signed.pdf',
				'https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/356-nd.signed.pdf',
			],
			[
				'Law 91/2025/QH15 and Decree 356/2025 took effect on 1 January 2026. Article 28(8) requires consent before behavioral/personalized advertising; Decree Article 6 rejects default consent and requires evidence.',
				'Keep distinct purposes separately selectable. This category preset does not implement processing impact assessments, transfer duties or platform-specific tracking obligations.',
			]
		),
	worldNone: () => worldNoneRule(),
	worldOptOutNoPrompt: () => ({
		...worldOptOutNoPromptRule(),
		legacyMaterial: structuredClone(legacyPresetMaterial.worldOptOutNoPrompt),
	}),
};

/** Options for {@link recommendedPolicyRules}. */
export interface RecommendedPolicyRulesOptions {
	/**
	 * Use the IAB TCF 2.3 Europe rule instead of plain opt-in. The runtime
	 * still needs the IAB module enabled for the rule to run as `iab`.
	 * @default false
	 */
	iab?: boolean;
}

/**
 * The recommended global pack, in match order: Europe (EEA, UK, Gibraltar,
 * and the geo fallback for an unknown location) opt-in or IAB, Quebec
 * opt-in, the US privacy states opt-out with GPC, and `none` for every other
 * known location. `offline()` resolves this pack when the host passes no rules.
 *
 * @example
 * ```ts
 * import { recommendedPolicyRules } from '@c15t/schema';
 *
 * const rules = recommendedPolicyRules({ iab: true });
 * ```
 */
export const recommendedPolicyRules = function recommendedPolicyRules(
	options: RecommendedPolicyRulesOptions = {}
): PolicyRule[] {
	return [
		options.iab
			? policyRulePresets.europeIab()
			: policyRulePresets.europeOptIn(),
		policyRulePresets.quebecOptIn(),
		policyRulePresets.usPrivacyStatesOptOut(),
		policyRulePresets.worldNone(),
	];
};
