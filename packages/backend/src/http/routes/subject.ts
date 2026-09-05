/**
 * Subject endpoints: list, read, submit and identify.
 *
 * Registered by `createApp`. Split by resource, mirroring `@c15t/backend`'s
 * `routes/` layout — a single file holding every route grows past the point
 * where a reviewer can hold it in mind, and makes the eventual cutover diff
 * harder to read than it needs to be.
 *
 * `POST /subjects` accepts the documented wire (`postSubjectInputSchema`),
 * which is what every c15t client transport sends: a domain name, an
 * effective `preferences` map, an epoch `givenAt`, and for v3 clients the
 * per-category receipts this act confirmed. The mapping onto storage lives in
 * `../consent-submission.ts`; this file is transport only.
 */

import { getSubjectOutputSchema, listSubjectsOutputSchema } from '@c15t/schema';
import type { ConsentItem } from '@c15t/schema';
import { getIpAddress } from '@c15t/schema/geo';
import { Effect } from 'effect';
import { describeRoute } from 'hono-openapi';
import * as v from 'valibot';

import { setFields } from '../../observability/log';
import { findOrCreateRuntimePolicy } from '../../repository/consent-policy';
import { findOrCreatePurposeIds } from '../../repository/consent-purpose';
import { findOrCreateDomain } from '../../repository/domain';
import { listDirectivesForSubject } from '../../repository/privacy-directive';
import type { PrivacyDirective } from '../../repository/privacy-directive';
import { submit } from '../../repository/record-consent';
import {
	findById,
	linkExternalId,
	listByExternalId,
} from '../../repository/subject';
import type { ConsentRow } from '../../repository/subject';
import { validateRequestAuth } from '../auth';
import { prepareSubmission } from '../consent-submission';
import type { RouteContext } from '../context';
import { BadRequestError, NotFoundError } from '../errors';

/** One consent as the wire reports it, with 2.x fields plus v3 receipts. */
const toConsentItem = (consent: ConsentRow): ConsentItem => ({
	choice: consent.choice,
	givenAt: consent.givenAt,
	id: consent.id,
	isLatestPolicy: consent.isLatestPolicy,
	policyEffectiveDate: consent.policyEffectiveDate,
	policyHash: consent.policyHash,
	policyId: consent.policyId,
	policyVersion: consent.policyVersion,
	preferences: consent.preferences,
	type: consent.type,
});

const toDirectiveWire = (directive: PrivacyDirective) => ({
	authority: directive.authority,
	categories: [...directive.categories],
	id: directive.id,
	recordedAt: directive.recordedAt.getTime(),
	signalHeader: directive.signalHeader,
	source: directive.source,
});

export const register = function register({
	app,
	options,
	run,
}: RouteContext): void {
	app.get(
		'/subjects',
		describeRoute({
			security: [{ bearerAuth: [] }],
			summary: 'List subjects by external id',
			tags: ['Subject'],
		}),
		async (c) => {
			// Listing subjects by external id exposes consent records for a named
			// person, so it is API-key only — matching @c15t/backend, where the
			// route is documented as requiring a key.
			if (!validateRequestAuth(c.req.raw.headers, options.apiKeys)) {
				return c.json(
					{ cause: { code: 'UNAUTHORIZED' }, message: 'Unauthorized' },
					401
				);
			}

			const externalId = c.req.query('externalId');

			const result = await run(
				c,
				Effect.gen(function* result() {
					if (externalId === undefined || externalId === '') {
						// Matches 2.x's error shape exactly, code included.
						return yield* new BadRequestError({
							code: 'EXTERNAL_ID_REQUIRED',
							message: 'externalId query parameter is required',
						});
					}

					const subjects = yield* listByExternalId(externalId);
					yield* setFields({
						subject: { matched: subjects.length },
					});

					return {
						// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
						subjects: subjects.map((subject) => ({
							id: subject.id,
							// 2.x falls back to the queried value when the stored
							// column is null, and the schema requires a string.
							externalId: subject.externalId ?? externalId,
							createdAt: subject.createdAt,
							consents: subject.consents.map(toConsentItem),
						})),
					};
				})
			);

			if (!result.ok) {
				return c.json(result.failure.body, result.failure.status);
			}

			// The contract check. Parsing against the shared schema means a drift
			// from 2.x is a test failure here, not a surprise for a client.
			const parsed = v.safeParse(listSubjectsOutputSchema, result.value);
			if (!parsed.success) {
				throw new Error(
					`Response does not satisfy listSubjectsOutputSchema: ${v
						.flatten(parsed.issues)
						.root?.join(', ')}`
				);
			}

			return c.json(result.value);
		}
	);

	app.get(
		'/subjects/:id',
		describeRoute({
			summary: 'Get a subject consent status',
			tags: ['Subject'],
		}),
		async (c) => {
			// Unauthenticated, matching @c15t/backend: a visitor's own device reads
			// its own consent status by subject id, and the id is the capability.
			const subjectId = c.req.param('id');
			// `?type=a,b` narrows to those policy types and additionally decides
			// isValid — with no filter every subject is trivially valid.
			const typeFilter = (c.req.query('type') ?? '')
				.split(',')
				.map((entry) => entry.trim())
				.filter(Boolean);

			const result = await run(
				c,
				Effect.gen(function* result() {
					const subject = yield* findById(subjectId);
					if (subject === undefined) {
						return yield* new NotFoundError({
							id: subjectId,
							resource: 'Subject',
						});
					}
					const directives = (yield* listDirectivesForSubject(subjectId)) ?? [];

					const consents = subject.consents
						.filter(
							(consent) =>
								typeFilter.length === 0 || typeFilter.includes(consent.type)
						)
						.map(toConsentItem);

					// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
					return {
						subject: {
							createdAt: subject.createdAt,
							externalId: subject.externalId ?? undefined,
							id: subject.id,
							identityProvider:
								subject.externalId === null
									? undefined
									: (subject.identityProvider ?? undefined),
						},
						consents,
						// Valid only if every requested type has consent against the
						// *current* policy — consent to a superseded policy does not
						// count, which is the whole point of tracking isLatestPolicy.
						isValid:
							typeFilter.length === 0 ||
							typeFilter.every((type) =>
								consents.some(
									(consent) => consent.type === type && consent.isLatestPolicy
								)
							),
						// The merged receipt view is independent of the type filter:
						// it is derived from cookie-banner rows only and a client
						// asking about legal documents still needs its category state.
						subjectChoice: subject.choice,
						privacyDirectives: directives.map(toDirectiveWire),
					};
				})
			);

			if (!result.ok) {
				return c.json(result.failure.body, result.failure.status);
			}

			const parsedSubject = v.safeParse(getSubjectOutputSchema, result.value);
			if (!parsedSubject.success) {
				throw new Error(
					`Response does not satisfy getSubjectOutputSchema: ${JSON.stringify(
						v.flatten(parsedSubject.issues)
					)}`
				);
			}

			// A subject's own state, never cacheable across visitors.
			c.header('Cache-Control', 'no-store');
			return c.json(result.value);
		}
	);

	app.post(
		'/subjects',
		describeRoute({
			summary: 'Record a consent submission',
			tags: ['Subject'],
		}),
		async (c) => {
			const body = await c.req.json().catch(() => undefined);
			const authenticated = validateRequestAuth(
				c.req.raw.headers,
				options.apiKeys
			);
			// One clock reading per request, so every timestamp check and every
			// stored `createdAt` agree about when the request happened.
			const now = Date.now();

			const result = await run(
				c,
				Effect.gen(function* result() {
					const prepared = yield* prepareSubmission(body, {
						authenticated,
						headers: c.req.raw.headers,
						ipAddress: options.ipAddress,
						manifest: options.manifest,
						now,
						policySnapshot: options.policySnapshot,
						// The same tenant the init route scoped the token audience to.
						tenantId: options.tenantId ?? options.manifest?.tenantId,
					});
					const { input } = prepared;

					const domain = yield* findOrCreateDomain(input.domain);
					const policy = yield* findOrCreateRuntimePolicy(input.type);
					const purposeIds = yield* findOrCreatePurposeIds(
						prepared.grantedCodes
					);

					const submission = yield* submit({
						choice: prepared.choice ?? null,
						consentAction: prepared.consentAction ?? null,
						decision: prepared.decision?.input,
						domainId: domain.id,
						externalId: input.externalSubjectId ?? null,
						givenAt: prepared.givenAt,
						identityAuthority: authenticated ? 'api' : 'browser',
						identityProvider: input.identityProvider ?? null,
						ipAddress: prepared.ipAddress,
						jurisdiction: prepared.jurisdiction,
						jurisdictionModel: prepared.jurisdictionModel ?? null,
						metadata: prepared.metadata,
						policyId: policy.id,
						purposeIds,
						runtimePolicySource: prepared.decision?.source,
						subjectId: input.subjectId,
						tcString: input.tcString ?? null,
						uiSource: input.uiSource ?? null,
						userAgent: prepared.userAgent,
						validUntil: prepared.validUntil ?? null,
					});

					// `created` is the fact worth querying on: a replay is a normal,
					// expected outcome here, and telling the two apart is how you
					// see a client stuck in a retry loop.
					yield* setFields({
						consent: {
							created: submission.created,
							decisionId: submission.decisionId ?? null,
							id: submission.consentId,
							receipts: prepared.choice
								? Object.keys(prepared.choice.categories)
								: null,
						},
					});

					return {
						appliedPreferences: prepared.appliedPreferences,
						consentId: submission.consentId,
						domain: domain.name,
						domainId: domain.id,
						givenAt: prepared.givenAt,
						metadata: input.metadata,
						ok: true as const,
						subjectId: submission.subjectId,
						type: input.type,
						uiSource: input.uiSource,
					};
				}).pipe(
					// The client chose this `subjectId` and it is already taken by
					// another tenant. Reported rather than absorbed: writing under the
					// other tenant's subject would disclose its consents, and dropping
					// the submission would lose a legal record.
					Effect.catchTag('SubjectTenantConflictError', (error) =>
						Effect.fail(
							new BadRequestError({ code: 'CONFLICT', message: error.message })
						)
					),
					// Same shape, different cause: the identity exists but the
					// submitted purposes or receipts differ from what was recorded.
					// Answering 200 would tell the client its choice was stored when
					// it was not.
					Effect.catchTag('ConsentPurposeConflictError', (error) =>
						Effect.fail(
							new BadRequestError({ code: 'CONFLICT', message: error.message })
						)
					)
				)
			);

			if (!result.ok) {
				return c.json(result.failure.body, result.failure.status);
			}

			return c.json(result.value);
		}
	);

	app.patch(
		'/subjects/:id',
		describeRoute({
			summary: 'Link a subject to an external identity',
			tags: ['Subject'],
		}),
		async (c) => {
			const subjectId = c.req.param('id');
			const body = await c.req.json().catch(() => undefined);
			// Who is asserting the link decides what it may unlock later: a
			// browser-asserted link never exposes identity-level privacy data.
			const authority = validateRequestAuth(c.req.raw.headers, options.apiKeys)
				? 'api'
				: 'browser';

			const result = await run(
				c,
				Effect.gen(function* result() {
					if (!body?.externalId) {
						return yield* new BadRequestError({
							code: 'EXTERNAL_ID_REQUIRED',
							message: 'externalId is required',
						});
					}

					const linked = yield* linkExternalId({
						authority,
						externalId: body.externalId,
						// Matches @c15t/backend's default: an identity supplied
						// without a named provider is still externally sourced.
						identityProvider: body.identityProvider ?? 'external',
						ipAddress: getIpAddress(c.req.raw.headers, options.ipAddress),
						subjectId,
						userAgent: c.req.header('user-agent') ?? null,
					});

					if (linked === undefined) {
						return yield* new NotFoundError({
							id: subjectId,
							resource: 'Subject',
						});
					}

					return { subject: linked };
				})
			);

			if (!result.ok) {
				return c.json(result.failure.body, result.failure.status);
			}

			return c.json(result.value);
		}
	);
};
