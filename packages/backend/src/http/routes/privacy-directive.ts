/**
 * Privacy directive routes.
 *
 * Registered by `createApp`. A directive is a privacy request recorded from a
 * user-agent signal (Global Privacy Control). It never touches the consent
 * table: recording one writes no consent row, no runtime decision and no
 * `consent_given` audit entry, and a later consent save never removes it.
 *
 * A directive stores the subject or identity association, the tenant, who
 * asserted it, the source, the categories and the times. No client IP or
 * user agent is captured for it.
 *
 * Three routes, split by who is asserting what:
 *
 * - `POST /subjects/:id/privacy-directives` — a subject's own device records
 *   a directive for that subject. The subject id is the capability, as it is
 *   for `GET /subjects/:id`, and the directive reaches nothing else.
 * - `GET /subjects/:id/privacy-directives` — what applies to that subject:
 *   its own directives, plus identity-level ones only when the identity link
 *   was asserted through the authenticated path.
 * - `POST /privacy-directives` and `GET /privacy-directives` — API-key only.
 *   An identity-level directive for `(externalId, identityProvider)` that
 *   applies to every subject holding a trusted link to that identity, and the
 *   read a host uses to project it into its own session.
 */

import {
	identityPrivacyDirectiveInputSchema,
	subjectPrivacyDirectiveInputSchema,
} from '@c15t/schema';
import type { PrivacyDirectiveWire } from '@c15t/schema';
import { Effect } from 'effect';
import { describeRoute } from 'hono-openapi';
import * as v from 'valibot';

import { setFields } from '../../observability/log';
import {
	listDirectivesForIdentity,
	listDirectivesForSubject,
	recordIdentityDirective,
	recordSubjectDirective,
} from '../../repository/privacy-directive';
import type { PrivacyDirective } from '../../repository/privacy-directive';
import { validateRequestAuth } from '../auth';
import type { RouteContext } from '../context';
import { BadRequestError, NotFoundError } from '../errors';

const toWire = (directive: PrivacyDirective): PrivacyDirectiveWire => ({
	authority: directive.authority,
	categories: [...directive.categories] as PrivacyDirectiveWire['categories'],
	id: directive.id,
	recordedAt: directive.recordedAt.getTime(),
	signalHeader: directive.signalHeader,
	source: directive.source,
});

const describeIssues = (issues: readonly v.BaseIssue<unknown>[]): string =>
	issues
		.slice(0, 5)
		.map((issue) => {
			const path = issue.path?.map((segment) => String(segment.key)).join('.');
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join('; ');

/** Exactly `Sec-GPC: 1` counts; the spec defines no other affirmative value. */
const signalHeader = (headers: Headers): boolean =>
	headers.get('sec-gpc') === '1';

const unauthorized = {
	cause: { code: 'UNAUTHORIZED' },
	message: 'Unauthorized',
};

export const register = function register({
	app,
	options,
	run,
}: RouteContext): void {
	app.post(
		'/subjects/:id/privacy-directives',
		describeRoute({
			summary: 'Record a privacy opt-out directive for this subject',
			tags: ['Privacy'],
		}),
		async (c) => {
			const subjectId = c.req.param('id');
			const body = await c.req.json().catch(() => undefined);
			const now = Date.now();

			const result = await run(
				c,
				Effect.gen(function* result() {
					const parsed = v.safeParse(subjectPrivacyDirectiveInputSchema, body);
					if (!parsed.success) {
						return yield* new BadRequestError({
							code: 'INPUT_VALIDATION_FAILED',
							message: `Invalid privacy directive: ${describeIssues(parsed.issues)}`,
						});
					}
					if (parsed.output.recordedAt > now) {
						// Recorded as sent, never adjusted: a request time the server
						// has not reached yet is refused, not clamped.
						return yield* new BadRequestError({
							code: 'INPUT_VALIDATION_FAILED',
							message: 'recordedAt is later than the server clock',
						});
					}

					const recorded = yield* recordSubjectDirective({
						categories: parsed.output.categories,
						recordedAt: new Date(parsed.output.recordedAt),
						signalHeader: signalHeader(c.req.raw.headers),
						source: parsed.output.source,
						subjectId,
					});
					if (recorded === undefined) {
						return yield* new NotFoundError({
							id: subjectId,
							resource: 'Subject',
						});
					}

					yield* setFields({
						privacyDirective: {
							authority: 'subject',
							created: recorded.created,
							id: recorded.directive.id,
						},
					});

					return {
						created: recorded.created,
						directive: toWire(recorded.directive),
						ok: true as const,
					};
				})
			);

			if (!result.ok) {
				return c.json(result.failure.body, result.failure.status);
			}
			return c.json(result.value);
		}
	);

	app.get(
		'/subjects/:id/privacy-directives',
		describeRoute({
			summary: 'List the privacy directives that apply to this subject',
			tags: ['Privacy'],
		}),
		async (c) => {
			const subjectId = c.req.param('id');

			const result = await run(
				c,
				Effect.gen(function* result() {
					const directives = yield* listDirectivesForSubject(subjectId);
					if (directives === undefined) {
						return yield* new NotFoundError({
							id: subjectId,
							resource: 'Subject',
						});
					}
					return { directives: directives.map(toWire) };
				})
			);

			if (!result.ok) {
				return c.json(result.failure.body, result.failure.status);
			}
			// The subject's own state, never cacheable across visitors.
			c.header('Cache-Control', 'no-store');
			return c.json(result.value);
		}
	);

	app.post(
		'/privacy-directives',
		describeRoute({
			security: [{ bearerAuth: [] }],
			summary: 'Record a privacy opt-out directive for an external identity',
			tags: ['Privacy'],
		}),
		async (c) => {
			// The only path that reaches beyond one subject, so it is the one
			// that needs proof the caller speaks for the identity.
			if (!validateRequestAuth(c.req.raw.headers, options.apiKeys)) {
				return c.json(unauthorized, 401);
			}
			const body = await c.req.json().catch(() => undefined);
			const now = Date.now();

			const result = await run(
				c,
				Effect.gen(function* result() {
					const parsed = v.safeParse(identityPrivacyDirectiveInputSchema, body);
					if (!parsed.success) {
						return yield* new BadRequestError({
							code: 'INPUT_VALIDATION_FAILED',
							message: `Invalid privacy directive: ${describeIssues(parsed.issues)}`,
						});
					}
					if (parsed.output.recordedAt > now) {
						return yield* new BadRequestError({
							code: 'INPUT_VALIDATION_FAILED',
							message: 'recordedAt is later than the server clock',
						});
					}

					const recorded = yield* recordIdentityDirective({
						categories: parsed.output.categories,
						externalId: parsed.output.externalId,
						identityProvider: parsed.output.identityProvider,
						recordedAt: new Date(parsed.output.recordedAt),
						signalHeader: signalHeader(c.req.raw.headers),
						source: parsed.output.source,
					});

					yield* setFields({
						privacyDirective: {
							authority: 'api',
							created: recorded.created,
							id: recorded.directive.id,
							subjects: recorded.subjects,
						},
					});

					return {
						created: recorded.created,
						directive: toWire(recorded.directive),
						ok: true as const,
						subjects: recorded.subjects,
					};
				})
			);

			if (!result.ok) {
				return c.json(result.failure.body, result.failure.status);
			}
			return c.json(result.value);
		}
	);

	app.get(
		'/privacy-directives',
		describeRoute({
			security: [{ bearerAuth: [] }],
			summary:
				'List identity-level privacy directives for an external identity',
			tags: ['Privacy'],
		}),
		async (c) => {
			if (!validateRequestAuth(c.req.raw.headers, options.apiKeys)) {
				return c.json(unauthorized, 401);
			}
			const externalId = c.req.query('externalId');
			const identityProvider = c.req.query('identityProvider');

			const result = await run(
				c,
				Effect.gen(function* result() {
					if (!externalId) {
						return yield* new BadRequestError({
							code: 'EXTERNAL_ID_REQUIRED',
							message: 'externalId query parameter is required',
						});
					}
					if (!identityProvider) {
						return yield* new BadRequestError({
							code: 'IDENTITY_PROVIDER_REQUIRED',
							message: 'identityProvider query parameter is required',
						});
					}
					const directives = yield* listDirectivesForIdentity({
						externalId,
						identityProvider,
					});
					return { directives: directives.map(toWire) };
				})
			);

			if (!result.ok) {
				return c.json(result.failure.body, result.failure.status);
			}
			c.header('Cache-Control', 'no-store');
			return c.json(result.value);
		}
	);
};
