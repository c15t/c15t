/**
 * Transport factories. Each export is optional — consumers pick the one
 * that matches their backend shape. Adapter authors who want to build
 * their own transport should import from `./contract` (re-exports below)
 * for the typed surface.
 *
 * Public subpath: `@c15t/core/transports`.
 */

export type {
	InitContext,
	InitResponse,
	InitResult,
	KernelTransport,
	SavePayload,
	SaveResult,
} from './contract';
export type { HostedKernelTransport, HostedTransportOptions } from './hosted';
export { createHostedTransport } from './hosted';
export type {
	MapInitOutputOptions,
	TransportInitResponse,
	TransportKernelConfig,
} from './init-output';
export {
	initOutputToKernelConfig,
	initResponseToKernelConfig,
	mapInitOutputToInitResponse,
	mapPrivacySignals,
	mergeInitOutputIntoKernelConfig,
	mergeInitResponseIntoKernelConfig,
	resolveInitPolicyWire,
} from './init-output';
export type {
	HostedModeOptions,
	ProviderTransportContext,
	ProviderTransportFactory,
	ProviderTransportKind,
} from './mode';
export { custom, hosted } from './mode';
export type {
	OfflineKernelTransport,
	OfflineTransportOptions,
} from './offline';
export { createOfflineTransport } from './offline';
export type { SubjectPostBody, SubjectSavePayload } from './subject-body';
export { buildConfirmedChoiceWire, buildSubjectPostBody } from './subject-body';
export type {
	MapSubjectRecordOptions,
	SubjectRecordWire,
	TransportHydrationRecords,
} from './subject-record';
export {
	mapSubjectRecordToHydrationRecords,
	reviveSubjectRecord,
} from './subject-record';
export {
	C15T_POLICY_CONTRACT_HEADER,
	C15T_VERSION_HEADER,
	c15tProtocolHeaders,
	c15tVersionHeaders,
	readProducerPolicyContract,
} from './version-header';
