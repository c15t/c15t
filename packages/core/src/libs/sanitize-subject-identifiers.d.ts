type SubjectIdentifiers = {
	externalId?: unknown;
	identityProvider?: unknown;
};
type SanitizedSubjectIdentifiers = {
	externalId?: string;
	identityProvider?: string;
};
/**
 * Sanitizes optional subject identifiers loaded from storage or request state.
 *
 * Treats nullish values, empty strings, and serialized sentinel strings from
 * previous buggy writes as absent fields.
 */
export declare function sanitizeSubjectIdentifiers(
	identifiers: SubjectIdentifiers
): SanitizedSubjectIdentifiers;
export {};
