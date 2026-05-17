import { Hono } from 'hono';
import { openAPIRouteHandler } from 'hono-openapi';
import { describe, expect, it } from 'vitest';
import type { C15TContext } from '~/types';
import { createConsentRoutes } from './consent';
import { createLegalDocumentRoutes } from './legal-document';
import { createSubjectRoutes } from './subject';

type OpenAPIObject = Record<string, unknown>;

/**
 * Narrows an unknown OpenAPI value to an object and fails the test if missing.
 */
function asObject(value: unknown): OpenAPIObject {
	expect(value).toEqual(expect.any(Object));
	return value as OpenAPIObject;
}

/**
 * Narrows an unknown OpenAPI value to an array and fails the test if missing.
 */
function asArray(value: unknown): unknown[] {
	expect(Array.isArray(value)).toBe(true);
	return value as unknown[];
}

/**
 * Finds an operation in the generated OpenAPI paths map.
 */
function getOperation(
	spec: OpenAPIObject,
	path: string,
	method: string
): OpenAPIObject {
	const paths = asObject(spec.paths);
	const pathCandidates = [
		path,
		path.endsWith('/') ? path.slice(0, -1) : `${path}/`,
	];
	const resolvedPath = pathCandidates
		.map((candidate) => paths[candidate])
		.find(Boolean);
	const pathItem = asObject(resolvedPath);
	return asObject(pathItem[method]);
}

/**
 * Finds a named OpenAPI parameter in the expected location.
 */
function getParameter(
	operation: OpenAPIObject,
	name: string,
	location: string
): OpenAPIObject {
	const parameters = asArray(operation.parameters);
	const parameter = parameters.find((item) => {
		const candidate = asObject(item);
		return candidate.name === name && candidate.in === location;
	});

	expect(parameter).toEqual(expect.any(Object));
	return parameter as OpenAPIObject;
}

/**
 * Returns the JSON request schema for an OpenAPI operation.
 */
function getRequestSchema(operation: OpenAPIObject): OpenAPIObject {
	const requestBody = asObject(operation.requestBody);
	const content = asObject(requestBody.content);
	const json = asObject(content['application/json']);
	return asObject(json.schema);
}

/**
 * Recursively finds a property across composed OpenAPI schemas.
 */
function findProperty(
	schema: OpenAPIObject,
	propertyName: string
): OpenAPIObject | undefined {
	const properties = schema.properties;

	if (properties && typeof properties === 'object') {
		const property = (properties as OpenAPIObject)[propertyName];

		if (property && typeof property === 'object') {
			return property as OpenAPIObject;
		}
	}

	for (const key of ['oneOf', 'anyOf', 'allOf']) {
		const variants = schema[key];

		if (!Array.isArray(variants)) {
			continue;
		}

		for (const variant of variants) {
			if (!(variant && typeof variant === 'object')) {
				continue;
			}

			const property = findProperty(variant as OpenAPIObject, propertyName);

			if (property) {
				return property;
			}
		}
	}
}

/**
 * Generates the local OpenAPI spec from the route factories under test.
 */
async function getOpenAPISpec() {
	const app = new Hono<{ Variables: { c15tContext: C15TContext } }>();

	app.route('/legal-documents', createLegalDocumentRoutes());
	app.route('/subjects', createSubjectRoutes());
	app.route('/consents', createConsentRoutes());
	app.get(
		'/openapi.json',
		openAPIRouteHandler(app, {
			documentation: {
				openapi: '3.1.0',
				info: {
					title: 'c15t API',
					version: 'test',
				},
			},
		})
	);

	const response = await app.request('http://localhost/openapi.json');

	expect(response.status).toBe(200);

	return response.json() as Promise<OpenAPIObject>;
}

describe('OpenAPI route documentation', () => {
	it('documents consent and subject request parameters and bodies', async () => {
		const spec = await getOpenAPISpec();

		const getSubject = getOperation(spec, '/subjects/{id}', 'get');
		const subjectId = getParameter(getSubject, 'id', 'path');
		const consentTypes = getParameter(getSubject, 'type', 'query');

		expect(subjectId.required).toBe(true);
		expect(subjectId.description).toContain('subject ID');
		expect(consentTypes.required).not.toBe(true);
		expect(consentTypes.description).toContain('comma-separated');

		const checkConsent = getOperation(spec, '/consents/check', 'get');

		expect(
			getParameter(checkConsent, 'externalId', 'query').description
		).toContain('External user ID');
		expect(getParameter(checkConsent, 'type', 'query').description).toContain(
			'policy type'
		);

		const listSubjects = getOperation(spec, '/subjects/', 'get');

		expect(
			getParameter(listSubjects, 'externalId', 'query').description
		).toContain('External user ID');

		const patchSubject = getOperation(spec, '/subjects/{id}', 'patch');
		const patchSchema = getRequestSchema(patchSubject);

		expect(getParameter(patchSubject, 'id', 'path').description).toContain(
			'subject ID'
		);
		expect(findProperty(patchSchema, 'externalId')?.description).toContain(
			'External user ID'
		);

		const postSubject = getOperation(spec, '/subjects/', 'post');
		const postSchema = getRequestSchema(postSubject);

		expect(findProperty(postSchema, 'subjectId')?.description).toContain(
			'Client-generated subject ID'
		);
		expect(findProperty(postSchema, 'domain')?.description).toContain(
			'Domain where consent'
		);
		expect(findProperty(postSchema, 'givenAt')?.description).toContain(
			'epoch milliseconds'
		);
		expect(findProperty(postSchema, 'preferences')?.description).toContain(
			'Consent preferences'
		);
	});
});
