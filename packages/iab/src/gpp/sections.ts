/**
 * GPP section definitions.
 *
 * Field order and widths follow the IAB GPP section specifications. Every US
 * field c15t encodes is a fixed-width integer or a list of 2-bit integers,
 * so one table per section is enough to encode it and to describe it to
 * `getSection` callers.
 *
 * @packageDocumentation
 */

/** GPP CMP API version reported by `ping`. */
export const GPP_VERSION = '1.1';

/** Section ID of the GPP header. */
export const GPP_HEADER_ID = 3;

/** Version of the GPP header. */
export const GPP_HEADER_VERSION = 1;

/** Section ID of IAB TCF EU v2. */
export const TCF_EU_SECTION_ID = 2;

/** API prefix of IAB TCF EU v2. */
export const TCF_EU_PREFIX = 'tcfeuv2';

/**
 * One field: its name, its width in bits and, for a list, the number of
 * entries. Field names are the section specification's names, which
 * `getField` callers use.
 */
export type GPPFieldSpec = readonly [
	name: string,
	bits: number,
	count?: number,
];

/** API prefixes of the US sections c15t encodes. */
export type USSectionPrefix =
	| 'usnat'
	| 'usca'
	| 'usva'
	| 'usco'
	| 'usut'
	| 'usct'
	| 'usfl'
	| 'usmt'
	| 'usor'
	| 'ustx'
	| 'usde'
	| 'usia'
	| 'usne'
	| 'usnh'
	| 'usnj'
	| 'ustn'
	| 'usmn';

/** A US section c15t can encode. */
export interface USSectionDefinition {
	/** GPP section ID. */
	id: number;
	/** API prefix, used by `getSection` and `getField`. */
	prefix: USSectionPrefix;
	/** Section version encoded in the `Version` field. */
	version: number;
	/** Core subsection fields, in encoding order. */
	core: readonly GPPFieldSpec[];
	/** Whether the section defines a GPC subsection. */
	gpc: boolean;
}

/** Fields of the GPC subsection shared by every US section that has one. */
export const GPC_SUBSECTION: readonly GPPFieldSpec[] = [
	['SubsectionType', 2],
	['Gpc', 1],
];

/** `SubsectionType` value of a GPC subsection. */
export const GPC_SUBSECTION_TYPE = 1;

const int = (name: string): GPPFieldSpec => [name, 2];
const list = (name: string, count: number): GPPFieldSpec => [name, 2, count];
const VERSION: GPPFieldSpec = ['Version', 6];
const MSPA: readonly GPPFieldSpec[] = [
	int('MspaCoveredTransaction'),
	int('MspaOptOutOptionMode'),
	int('MspaServiceProviderMode'),
];

/**
 * Child consents: a single field in some sections, a list in others.
 * `1` stands for the single field.
 */
const childConsents = (count: number): GPPFieldSpec =>
	count === 1
		? int('KnownChildSensitiveDataConsents')
		: list('KnownChildSensitiveDataConsents', count);

/**
 * The layout shared by Virginia, Colorado and Connecticut: a sharing notice,
 * sale and targeted advertising opt-outs, sensitive data and child consents.
 */
const sharingNoticeLayout = (
	sensitive: number,
	children: number
): GPPFieldSpec[] => [
	VERSION,
	int('SharingNotice'),
	int('SaleOptOutNotice'),
	int('TargetedAdvertisingOptOutNotice'),
	int('SaleOptOut'),
	int('TargetedAdvertisingOptOut'),
	list('SensitiveDataProcessing', sensitive),
	childConsents(children),
	...MSPA,
];

/**
 * The layout most later state sections share: a processing notice, sale and
 * targeted advertising opt-outs, sensitive data, child consents and
 * additional processing consent.
 */
const processingNoticeLayout = (
	sensitive: number,
	children: number,
	firstNotice = 'ProcessingNotice'
): GPPFieldSpec[] => [
	VERSION,
	int(firstNotice),
	int('SaleOptOutNotice'),
	int('TargetedAdvertisingOptOutNotice'),
	int('SaleOptOut'),
	int('TargetedAdvertisingOptOut'),
	list('SensitiveDataProcessing', sensitive),
	childConsents(children),
	int('AdditionalDataProcessingConsent'),
	...MSPA,
];

/** The MSPA US National section, version 2. */
export const US_NATIONAL_SECTION: USSectionDefinition = {
	core: [
		VERSION,
		int('SharingNotice'),
		int('SaleOptOutNotice'),
		int('SharingOptOutNotice'),
		int('TargetedAdvertisingOptOutNotice'),
		int('SensitiveDataProcessingOptOutNotice'),
		int('SensitiveDataLimitUseNotice'),
		int('SaleOptOut'),
		int('SharingOptOut'),
		int('TargetedAdvertisingOptOut'),
		list('SensitiveDataProcessing', 16),
		list('KnownChildSensitiveDataConsents', 3),
		int('PersonalDataConsents'),
		...MSPA,
	],
	gpc: true,
	id: 7,
	prefix: 'usnat',
	version: 2,
};

const state = (
	id: number,
	prefix: USSectionPrefix,
	core: GPPFieldSpec[],
	gpc = true
): USSectionDefinition => ({ core, gpc, id, prefix, version: 1 });

/**
 * State sections keyed by ISO 3166-2 subdivision code.
 *
 * Indiana, Kentucky, Maryland and Rhode Island are absent: their published
 * specifications put a section header before the core subsection, which the
 * IAB reference implementation does not encode, so no string for them can be
 * checked against it yet.
 */
export const US_STATE_SECTIONS: Readonly<Record<string, USSectionDefinition>> =
	{
		CA: state(8, 'usca', [
			VERSION,
			int('SaleOptOutNotice'),
			int('SharingOptOutNotice'),
			int('SensitiveDataLimitUseNotice'),
			int('SaleOptOut'),
			int('SharingOptOut'),
			list('SensitiveDataProcessing', 9),
			list('KnownChildSensitiveDataConsents', 2),
			int('PersonalDataConsents'),
			...MSPA,
		]),
		CO: state(10, 'usco', sharingNoticeLayout(7, 1)),
		CT: state(12, 'usct', sharingNoticeLayout(8, 3)),
		DE: state(17, 'usde', processingNoticeLayout(9, 5)),
		FL: state(13, 'usfl', processingNoticeLayout(8, 3), false),
		IA: state(18, 'usia', [
			VERSION,
			int('ProcessingNotice'),
			int('SaleOptOutNotice'),
			int('TargetedAdvertisingOptOutNotice'),
			int('SensitiveDataOptOutNotice'),
			int('SaleOptOut'),
			int('TargetedAdvertisingOptOut'),
			list('SensitiveDataProcessing', 8),
			int('KnownChildSensitiveDataConsents'),
			...MSPA,
		]),
		MN: state(23, 'usmn', processingNoticeLayout(8, 1)),
		MT: state(14, 'usmt', processingNoticeLayout(8, 3, 'SharingNotice')),
		NE: state(19, 'usne', processingNoticeLayout(8, 1)),
		NH: state(20, 'usnh', processingNoticeLayout(8, 3)),
		NJ: state(21, 'usnj', processingNoticeLayout(10, 5)),
		OR: state(15, 'usor', processingNoticeLayout(11, 3)),
		TN: state(22, 'ustn', processingNoticeLayout(8, 1)),
		TX: state(16, 'ustx', processingNoticeLayout(8, 1)),
		UT: state(
			11,
			'usut',
			[
				VERSION,
				int('SharingNotice'),
				int('SaleOptOutNotice'),
				int('TargetedAdvertisingOptOutNotice'),
				int('SensitiveDataProcessingOptOutNotice'),
				int('SaleOptOut'),
				int('TargetedAdvertisingOptOut'),
				list('SensitiveDataProcessing', 8),
				int('KnownChildSensitiveDataConsents'),
				...MSPA,
			],
			false
		),
		VA: state(9, 'usva', sharingNoticeLayout(8, 1), false),
	};

/** Every US section c15t can encode, ordered by section ID. */
export const US_SECTIONS: readonly USSectionDefinition[] = [
	US_NATIONAL_SECTION,
	...Object.values(US_STATE_SECTIONS),
].sort((left, right) => left.id - right.id);
