interface SubjectIdentifiers {
	externalId?: unknown;
	identityProvider?: unknown;
}

interface SanitizedSubjectIdentifiers {
	externalId?: string;
	identityProvider?: string;
}

const sanitizeIdentifier = function sanitizeIdentifier(
	value: unknown
): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.trim();

	if (
		normalized === '' ||
		normalized === 'undefined' ||
		normalized === 'null'
	) {
		return undefined;
	}

	return normalized;
};

/**
 * Sanitizes optional subject identifiers loaded from storage or request state.
 *
 * Treats nullish values, empty strings, and serialized sentinel strings from
 * previous buggy writes as absent fields.
 */
export const sanitizeSubjectIdentifiers = function sanitizeSubjectIdentifiers(
	identifiers: SubjectIdentifiers
): SanitizedSubjectIdentifiers {
	const externalId = sanitizeIdentifier(identifiers.externalId);
	const identityProvider = sanitizeIdentifier(identifiers.identityProvider);
	const sanitized: SanitizedSubjectIdentifiers = {};

	if (externalId) {
		sanitized.externalId = externalId;
	}
	if (identityProvider) {
		sanitized.identityProvider = identityProvider;
	}

	return sanitized;
};
