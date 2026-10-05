/**
 * `@c15t/iab/gpp` — IAB Global Privacy Platform (GPP 1.1) for the c15t
 * consent kernel.
 *
 * Installs `__gpp` and keeps the GPP string in step with the visitor's
 * choices: the TCF EU section under an `iab` policy, and a US state section
 * or the MSPA US National section for US visitors. A separate entry point,
 * so sites that only use TCF do not load it.
 *
 * @packageDocumentation
 */

export { createGPP } from './gpp/create-gpp';
export type { CreateGPPOptions, GPPHandle } from './gpp/create-gpp';
export { destroyGPPStub, initializeGPPStub } from './gpp/stub';
export {
	encodeGPPString,
	encodeUSSection,
	type EncodedGPPSection,
	type GPPFieldValues,
	type USSectionValues,
} from './gpp/encoder';
export {
	GPP_VERSION,
	US_NATIONAL_SECTION,
	US_SECTIONS,
	US_STATE_SECTIONS,
	type GPPFieldSpec,
	type USSectionDefinition,
	type USSectionPrefix,
} from './gpp/sections';
export {
	resolveUSSectionDefinition,
	resolveUSSectionValues,
	type GPPMspaMode,
	type GPPUSApproach,
	type GPPUSFallback,
} from './gpp/us-section';
export type {
	GPPApi,
	GPPCallback,
	GPPCmpStatus,
	GPPDisplayStatus,
	GPPEventData,
	GPPParsedSubsection,
	GPPPingData,
	GPPSignalStatus,
} from './gpp/types';
