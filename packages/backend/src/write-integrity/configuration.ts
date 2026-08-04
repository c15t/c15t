import type {
	AnonymousConsentSubmissionOptions,
	IdentityAssertionOptions,
	IdentityLinkingOptions,
	SubjectCapabilityOptions,
	WriteDomainOptions,
	WriteIntegrityOptions,
} from '../types';

const DEFAULT_CAPABILITY_TTL_SECONDS = 300;
const DEFAULT_ASSERTION_MAX_AGE_SECONDS = 300;

const LEGACY_ANONYMOUS_CONSENT_WARNING =
	'`writeIntegrity.anonymousConsent` is using deprecated legacy behavior. Configure `public`, `capability`, or `disabled` before upgrading to v3.';
const LEGACY_IDENTITY_LINKING_WARNING =
	'`writeIntegrity.identityLinking` is using deprecated legacy behavior. Configure an explicit proof mode or `disabled` before upgrading to v3.';
const LEGACY_DOMAIN_WARNING =
	'`writeIntegrity.domains` is not configured, so request-provided domains use deprecated legacy behavior. Configure an allowlist, a server resolver, or both before upgrading to v3.';

/**
 * Fully resolved domain controls.
 */
export interface ResolvedWriteDomainOptions extends WriteDomainOptions {
	/** Whether legacy request-provided domain behavior remains active. */
	mode: 'legacy' | 'configured';
	/** Copied configured allowlist. */
	allowlist: readonly string[];
}

/**
 * Write-integrity options with compatibility defaults applied.
 */
export interface ResolvedWriteIntegrityOptions
	extends Omit<
		WriteIntegrityOptions,
		'anonymousConsent' | 'identityLinking' | 'domains'
	> {
	anonymousConsent: AnonymousConsentSubmissionOptions;
	identityLinking: Omit<IdentityLinkingOptions, 'reassignment'> & {
		reassignment: 'legacy' | 'disabled' | 'capability-and-assertion';
	};
	domains: ResolvedWriteDomainOptions;
	subjectCapability?: Omit<
		SubjectCapabilityOptions,
		'ttlSeconds' | 'verificationKey'
	> & {
		ttlSeconds: number;
		verificationKey: string;
	};
	identityAssertion?: Omit<IdentityAssertionOptions, 'maxAgeSeconds'> & {
		maxAgeSeconds: number;
	};
}

/**
 * Result of resolving and validating write-integrity configuration.
 */
export interface WriteIntegrityConfigurationResult {
	/** Configuration with backwards-compatible defaults applied. */
	config: ResolvedWriteIntegrityOptions;
	/** Fatal configuration problems in deterministic validation order. */
	errors: string[];
	/** Compatibility and migration warnings in deterministic order. */
	warnings: string[];
}

function hasDomainControl(options: WriteDomainOptions | undefined): boolean {
	return Boolean(
		options?.resolve ||
			options?.allowlist?.some((domain) => domain.trim() !== '')
	);
}

function isPositiveInteger(value: number | undefined): boolean {
	return value === undefined || (Number.isInteger(value) && value > 0);
}

function requiresCapability(options: WriteIntegrityOptions): boolean {
	const anonymousMode = options.anonymousConsent?.mode;
	const identityMode = options.identityLinking?.mode;
	const reassignment = options.identityLinking?.reassignment;

	return (
		anonymousMode === 'capability' ||
		identityMode === 'capability' ||
		identityMode === 'capability-and-assertion' ||
		reassignment === 'capability-and-assertion'
	);
}

function requiresAssertion(options: WriteIntegrityOptions): boolean {
	const identityMode = options.identityLinking?.mode;
	const reassignment = options.identityLinking?.reassignment;

	return (
		identityMode === 'assertion' ||
		identityMode === 'capability-and-assertion' ||
		reassignment === 'capability-and-assertion'
	);
}

function hasEnabledSecureWrite(options: WriteIntegrityOptions): boolean {
	const anonymousMode = options.anonymousConsent?.mode ?? 'legacy';
	const identityMode = options.identityLinking?.mode ?? 'legacy';
	const reassignment = options.identityLinking?.reassignment;

	return (
		(anonymousMode !== 'legacy' && anonymousMode !== 'disabled') ||
		(identityMode !== 'legacy' && identityMode !== 'disabled') ||
		reassignment === 'capability-and-assertion'
	);
}

/**
 * Resolves write-integrity defaults and validates dependencies between modes.
 *
 * This function is pure: it returns warnings for the caller to log and never
 * mutates the supplied options. Omitted configuration deliberately resolves to
 * the legacy v2 behavior so adopting this minor release is non-breaking.
 *
 * @param options - Optional write-integrity configuration
 * @returns Resolved configuration, validation errors, and migration warnings
 */
export function resolveWriteIntegrityOptions(
	options: WriteIntegrityOptions | undefined
): WriteIntegrityConfigurationResult {
	const source = options ?? {};
	const anonymousConsent = source.anonymousConsent ?? { mode: 'legacy' };
	const identityLinking = source.identityLinking ?? { mode: 'legacy' };
	const domainsConfigured = hasDomainControl(source.domains);
	const warnings: string[] = [];
	const errors: string[] = [];

	if (anonymousConsent.mode === 'legacy') {
		warnings.push(LEGACY_ANONYMOUS_CONSENT_WARNING);
	}

	if (identityLinking.mode === 'legacy') {
		warnings.push(LEGACY_IDENTITY_LINKING_WARNING);
	}

	if (!domainsConfigured) {
		warnings.push(LEGACY_DOMAIN_WARNING);
	}

	if (hasEnabledSecureWrite(source) && !domainsConfigured) {
		errors.push(
			'Enabled secure write modes require `writeIntegrity.domains.allowlist`, `writeIntegrity.domains.resolve`, or both.'
		);
	}

	if (source.domains?.allowlist?.some((domain) => domain.trim() === '')) {
		errors.push(
			'`writeIntegrity.domains.allowlist` cannot contain empty domains.'
		);
	}

	if (requiresCapability(source) && !source.subjectCapability) {
		errors.push(
			'Capability modes require `writeIntegrity.subjectCapability` configuration.'
		);
	}

	if (
		source.subjectCapability &&
		source.subjectCapability.signingKey.trim() === ''
	) {
		errors.push(
			'`writeIntegrity.subjectCapability.signingKey` cannot be empty.'
		);
	}

	if (
		source.subjectCapability?.verificationKey !== undefined &&
		source.subjectCapability.verificationKey.trim() === ''
	) {
		errors.push(
			'`writeIntegrity.subjectCapability.verificationKey` cannot be empty.'
		);
	}

	if (
		source.subjectCapability &&
		!isPositiveInteger(source.subjectCapability.ttlSeconds)
	) {
		errors.push(
			'`writeIntegrity.subjectCapability.ttlSeconds` must be a positive integer.'
		);
	}

	if (requiresAssertion(source) && !source.identityAssertion) {
		errors.push(
			'Assertion modes require `writeIntegrity.identityAssertion` configuration.'
		);
	}

	if (
		source.identityAssertion &&
		source.identityAssertion.verificationKey.trim() === ''
	) {
		errors.push(
			'`writeIntegrity.identityAssertion.verificationKey` cannot be empty.'
		);
	}

	if (
		source.identityAssertion &&
		!isPositiveInteger(source.identityAssertion.maxAgeSeconds)
	) {
		errors.push(
			'`writeIntegrity.identityAssertion.maxAgeSeconds` must be a positive integer.'
		);
	}

	const resolvedIdentityReassignment =
		identityLinking.reassignment ??
		(identityLinking.mode === 'legacy' ? 'legacy' : 'disabled');

	return {
		config: {
			...source,
			anonymousConsent: { ...anonymousConsent },
			identityLinking: {
				...identityLinking,
				reassignment: resolvedIdentityReassignment,
			},
			domains: {
				...source.domains,
				mode: domainsConfigured ? 'configured' : 'legacy',
				allowlist: [...(source.domains?.allowlist ?? [])],
			},
			subjectCapability: source.subjectCapability
				? {
						...source.subjectCapability,
						ttlSeconds:
							source.subjectCapability.ttlSeconds ??
							DEFAULT_CAPABILITY_TTL_SECONDS,
						verificationKey:
							source.subjectCapability.verificationKey ??
							source.subjectCapability.signingKey,
					}
				: undefined,
			identityAssertion: source.identityAssertion
				? {
						...source.identityAssertion,
						maxAgeSeconds:
							source.identityAssertion.maxAgeSeconds ??
							DEFAULT_ASSERTION_MAX_AGE_SECONDS,
					}
				: undefined,
		},
		errors,
		warnings,
	};
}
