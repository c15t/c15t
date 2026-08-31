import type { SavePayload } from '../types';

export interface BuildSubjectPostBodyOptions {
	domain: string;
}

export interface SubjectPostBody {
	subjectId: string;
	externalSubjectId?: string;
	identityProvider?: string;
	domain: string;
	type: 'cookie_banner';
	preferences: Record<string, boolean>;
	givenAt: number;
	jurisdictionModel?: NonNullable<SavePayload['model']>;
	uiSource?: NonNullable<SavePayload['uiSource']>;
	consentAction: SavePayload['consentAction'];
	policySnapshotToken?: string;
	tcString?: string;
	metadata?: {
		userProperties: NonNullable<SavePayload['user']>['properties'];
	};
}

export const buildSubjectPostBody = function buildSubjectPostBody(
	payload: SavePayload,
	opts: BuildSubjectPostBodyOptions
): SubjectPostBody {
	return {
		consentAction: payload.consentAction,
		domain: opts.domain,
		externalSubjectId: payload.user?.externalId,
		givenAt: Date.now(),
		identityProvider: payload.user?.identityProvider,
		jurisdictionModel: payload.model ?? undefined,
		metadata: payload.user?.properties
			? { userProperties: payload.user.properties }
			: undefined,
		policySnapshotToken: payload.policySnapshotToken ?? undefined,
		preferences: { ...payload.consents },
		subjectId: payload.subjectId,
		tcString: payload.tcString ?? undefined,
		type: 'cookie_banner',
		uiSource: payload.uiSource ?? undefined,
	};
};
