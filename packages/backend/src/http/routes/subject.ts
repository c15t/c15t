/**
 * Subject endpoints: list, read, submit and identify.
 *
 * Registered by `createApp`. Split by resource, mirroring `@c15t/backend`'s
 * `routes/` layout — a single file holding every route grows past the point
 * where a reviewer can hold it in mind, and makes the eventual cutover diff
 * harder to read than it needs to be.
 */

import { getSubjectOutputSchema, listSubjectsOutputSchema } from '@c15t/schema';
import { getIpAddress } from '@c15t/schema/geo';
import { Effect } from 'effect';
import { describeRoute } from 'hono-openapi';
import * as v from 'valibot';

import { setFields } from '../../observability/log';
import { submit } from '../../repository/record-consent';
import {
	findById,
	linkExternalId,
	listByExternalId,
} from '../../repository/subject';
import { validateRequestAuth } from '../auth';
import type { RouteContext } from '../context';
import { BadRequestError, NotFoundError } from '../errors';

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
							consents: subject.consents.map((consent) => ({
								givenAt: consent.givenAt,
								id: consent.id,
								isLatestPolicy: consent.isLatestPolicy,
								policyEffectiveDate: consent.policyEffectiveDate,
								policyHash: consent.policyHash,
								policyId: consent.policyId,
								policyVersion: consent.policyVersion,
								type: consent.type,
							})),
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

					const consents = subject.consents
						.filter(
							(consent) =>
								typeFilter.length === 0 || typeFilter.includes(consent.type)
						)
						.map((consent) => ({
							givenAt: consent.givenAt,
							id: consent.id,
							isLatestPolicy: consent.isLatestPolicy,
							policyEffectiveDate: consent.policyEffectiveDate,
							policyHash: consent.policyHash,
							policyId: consent.policyId,
							policyVersion: consent.policyVersion,
							type: consent.type,
						}));

					// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
					return {
						subject: {
							createdAt: subject.createdAt,
							externalId: subject.externalId ?? undefined,
							id: subject.id,
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

			const result = await run(
				c,
				Effect.gen(function* result() {
					if (!body?.subjectId) {
						return yield* new BadRequestError({
							code: 'SUBJECT_ID_REQUIRED',
							message: 'subjectId is required',
						});
					}
					if (!body?.domainId) {
						return yield* new BadRequestError({
							code: 'DOMAIN_ID_REQUIRED',
							message: 'domainId is required',
						});
					}

					// givenAt is client-supplied so a queued submission records when
					// consent was *given*, not when it arrived. It is also part of
					// the consent's deterministic id, so an absent one would make
					// every retry a distinct consent.
					const givenAt = body.givenAt ? new Date(body.givenAt) : new Date();
					if (Number.isNaN(givenAt.getTime())) {
						return yield* new BadRequestError({
							code: 'INPUT_VALIDATION_FAILED',
							message: 'givenAt must be a valid ISO-8601 string',
						});
					}

					const submission = yield* submit({
						decision: body.decision,
						domainId: body.domainId,
						externalId: body.externalId ?? null,
						givenAt,
						identityProvider: body.identityProvider ?? null,
						ipAddress: getIpAddress(c.req.raw.headers, options.ipAddress),
						metadata: body.metadata,
						policyId: body.policyId ?? null,
						purposeIds: body.purposeIds ?? [],
						subjectId: body.subjectId,
						userAgent: c.req.header('user-agent') ?? null,
					});

					// `created` is the fact worth querying on: a replay is a normal,
					// expected outcome here, and telling the two apart is how you
					// see a client stuck in a retry loop.
					yield* setFields({
						consent: {
							created: submission.created,
							decisionId: submission.decisionId ?? null,
							id: submission.consentId,
						},
					});

					return {
						consentId: submission.consentId,
						givenAt,
						subjectId: submission.subjectId,
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
					// submitted purposes differ from what was recorded. Answering 200
					// would tell the client its purposes were stored when they were
					// not.
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
