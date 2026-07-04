type SubjectIdentifiers = {
	externalId?: unknown;
	identityProvider?: unknown;
};

type SanitizedSubjectIdentifiers = {
	externalId?: string;
	identityProvider?: string;
};

function sanitizeIdentifier(value: unknown): string | undefined {
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
}

/**
 * Sanitizes optional subject identifiers loaded from storage or request state.
 *
 * Treats nullish values, empty strings, and serialized sentinel strings from
 * previous buggy writes as absent fields.
 */
export function sanitizeSubjectIdentifiers(
	identifiers: SubjectIdentifiers
): SanitizedSubjectIdentifiers {
	const externalId = sanitizeIdentifier(identifiers.externalId);
	const identityProvider = sanitizeIdentifier(identifiers.identityProvider);

	return {
		...(externalId ? { externalId } : {}),
		...(identityProvider ? { identityProvider } : {}),
	};
}
