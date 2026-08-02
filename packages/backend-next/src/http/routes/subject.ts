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

export function register({ app, options, run }: RouteContext): void {
	app.get(
		'/subjects',
		describeRoute({
			summary: 'List subjects by external id',
			tags: ['Subject'],
			security: [{ bearerAuth: [] }],
		}),
		async (c) => {
			// Listing subjects by external id exposes consent records for a named
			// person, so it is API-key only — matching @c15t/backend, where the
			// route is documented as requiring a key.
			if (!validateRequestAuth(c.req.raw.headers, options.apiKeys)) {
				return c.json(
					{ message: 'Unauthorized', cause: { code: 'UNAUTHORIZED' } },
					401
				);
			}

			const externalId = c.req.query('externalId');

			const result = await run(
				c,
				Effect.gen(function* () {
					if (externalId === undefined || externalId === '') {
						// Matches 2.x's error shape exactly, code included.
						return yield* new BadRequestError({
							message: 'externalId query parameter is required',
							code: 'EXTERNAL_ID_REQUIRED',
						});
					}

					const subjects = yield* listByExternalId(externalId);
					yield* setFields({
						subject: { matched: subjects.length },
					});

					return {
						subjects: subjects.map((subject) => ({
							id: subject.id,
							// 2.x falls back to the queried value when the stored
							// column is null, and the schema requires a string.
							externalId: subject.externalId ?? externalId,
							createdAt: subject.createdAt,
							consents: subject.consents.map((consent) => ({
								id: consent.id,
								type: consent.type,
								policyId: consent.policyId,
								policyVersion: consent.policyVersion,
								policyHash: consent.policyHash,
								policyEffectiveDate: consent.policyEffectiveDate,
								givenAt: consent.givenAt,
								isLatestPolicy: consent.isLatestPolicy,
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
				Effect.gen(function* () {
					const subject = yield* findById(subjectId);
					if (subject === undefined) {
						return yield* new NotFoundError({
							resource: 'Subject',
							id: subjectId,
						});
					}

					const consents = subject.consents
						.filter(
							(consent) =>
								typeFilter.length === 0 || typeFilter.includes(consent.type)
						)
						.map((consent) => ({
							id: consent.id,
							type: consent.type,
							policyId: consent.policyId,
							policyVersion: consent.policyVersion,
							policyHash: consent.policyHash,
							policyEffectiveDate: consent.policyEffectiveDate,
							givenAt: consent.givenAt,
							isLatestPolicy: consent.isLatestPolicy,
						}));

					return {
						subject: {
							id: subject.id,
							externalId: subject.externalId ?? undefined,
							createdAt: subject.createdAt,
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
				Effect.gen(function* () {
					if (!body?.subjectId) {
						return yield* new BadRequestError({
							message: 'subjectId is required',
							code: 'SUBJECT_ID_REQUIRED',
						});
					}
					if (!body?.domainId) {
						return yield* new BadRequestError({
							message: 'domainId is required',
							code: 'DOMAIN_ID_REQUIRED',
						});
					}

					// givenAt is client-supplied so a queued submission records when
					// consent was *given*, not when it arrived. It is also part of
					// the consent's deterministic id, so an absent one would make
					// every retry a distinct consent.
					const givenAt = body.givenAt ? new Date(body.givenAt) : new Date();
					if (Number.isNaN(givenAt.getTime())) {
						return yield* new BadRequestError({
							message: 'givenAt must be a valid ISO-8601 string',
							code: 'INPUT_VALIDATION_FAILED',
						});
					}

					const submission = yield* submit({
						subjectId: body.subjectId,
						domainId: body.domainId,
						externalId: body.externalId ?? null,
						identityProvider: body.identityProvider ?? null,
						policyId: body.policyId ?? null,
						purposeIds: body.purposeIds ?? [],
						givenAt,
						metadata: body.metadata,
						ipAddress: getIpAddress(c.req.raw.headers, options.ipAddress),
						userAgent: c.req.header('user-agent') ?? null,
						decision: body.decision,
					});

					// `created` is the fact worth querying on: a replay is a normal,
					// expected outcome here, and telling the two apart is how you
					// see a client stuck in a retry loop.
					yield* setFields({
						consent: {
							created: submission.created,
							id: submission.consentId,
							decisionId: submission.decisionId ?? null,
						},
					});

					return {
						subjectId: submission.subjectId,
						consentId: submission.consentId,
						givenAt,
					};
				})
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
				Effect.gen(function* () {
					if (!body?.externalId) {
						return yield* new BadRequestError({
							message: 'externalId is required',
							code: 'EXTERNAL_ID_REQUIRED',
						});
					}

					const linked = yield* linkExternalId({
						subjectId,
						externalId: body.externalId,
						// Matches @c15t/backend's default: an identity supplied
						// without a named provider is still externally sourced.
						identityProvider: body.identityProvider ?? 'external',
						ipAddress: getIpAddress(c.req.raw.headers, options.ipAddress),
						userAgent: c.req.header('user-agent') ?? null,
					});

					if (linked === undefined) {
						return yield* new NotFoundError({
							resource: 'Subject',
							id: subjectId,
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
}
