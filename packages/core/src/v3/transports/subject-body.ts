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

export function buildSubjectPostBody(
	payload: SavePayload,
	opts: BuildSubjectPostBodyOptions
): SubjectPostBody {
	return {
		subjectId: payload.subjectId,
		externalSubjectId: payload.user?.externalId,
		identityProvider: payload.user?.identityProvider,
		domain: opts.domain,
		type: 'cookie_banner',
		preferences: { ...payload.consents },
		givenAt: Date.now(),
		jurisdictionModel: payload.model ?? undefined,
		uiSource: payload.uiSource ?? undefined,
		consentAction: payload.consentAction,
		policySnapshotToken: payload.policySnapshotToken ?? undefined,
		tcString: payload.tcString ?? undefined,
		metadata: payload.user?.properties
			? { userProperties: payload.user.properties }
			: undefined,
	};
}
