import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

// The root compiler API checks the declarations consumers resolve.
import ts from '../../../node_modules/typescript/lib/typescript.js';

const root = fileURLToPath(new URL('../../..', import.meta.url));

test('Customer.io calls compile through the published declaration export', () => {
	const file = resolve(
		root,
		'packages/integrations/src/customer-io-consumer.ts'
	);
	const code = `
import type { CustomerIoApi, CustomerIoQueue } from '@c15t/integrations/customer-io';
// @ts-expect-error The global can be absent before consent.
const required: CustomerIoApi | CustomerIoQueue = window.cioanalytics;
void required;
const analytics = window.cioanalytics;
if (analytics) {
	analytics.identify('customer-123', { email: 'person@example.com' });
	analytics.track('Signed up', { plan: 'pro' });
	analytics.page('Pricing');
	analytics.identify();
	analytics.identify({ email: 'person@example.com' }, context => context.event);
	analytics.identify('id', context => context.event);
	analytics.identify('id', null, {}, context => context.event);
	analytics.identify(123, {}, { integrations: { All: false } }, context => context.event);
	analytics.track('Clicked', context => context.event);
	analytics.track('Clicked', null, null, context => context.event);
	analytics.track({ type: 'track', event: 'Clicked', properties: { plan: 'pro' } }, {}, context => context.event);
	analytics.page();
	analytics.page({ path: '/pricing' });
	analytics.page('Marketing', 'Pricing', { plan: 'pro' }, {}, context => context.event);
	analytics.page(context => context.event);
	analytics.page(undefined, 'Pricing', null, {}, context => context.event);
	analytics.group();
	analytics.group('team', { name: 'Acme' }, {}, context => context.event);
	analytics.group({ name: 'Acme' });
	analytics.group('team', null, {}, context => context.event);
	analytics.alias('new', 'old', {}, context => context.event);
	analytics.alias(123, context => context.event);
	analytics.reset();
	analytics.ready();
	analytics.ready(results => results.length);
	analytics.debug(true);
	const listener = (name: string) => name.length;
	analytics.on('track', listener);
	analytics.once('track', listener);
	analytics.off('track', listener);
	analytics.setAnonymousId();
	analytics.setAnonymousId('anonymous');
	analytics.addSourceMiddleware(({ payload, integrations, next }) => {
		payload.obj.event = 'Changed';
		void integrations;
		next(payload);
	});
	analytics.addDestinationMiddleware('Customer.io Data Pipelines', async ({ payload, integration, next }) => {
		integration.toLowerCase();
		next(null);
	});
	analytics.addIntegrationMiddleware('legacy', () => {});
	const link = document.createElement('a');
	analytics.trackLink(link, 'Clicked', element => ({ tag: element.tagName }));
	analytics.trackClick({ toArray: () => [link] }, element => element.tagName);
	const form = document.createElement('form');
	analytics.trackForm([form], form => form.action, form => ({ action: form.action }));
	analytics.trackSubmit(null, 'Submitted', {}, { integrations: { All: false } });
	analytics.pageview('/pricing');
	// @ts-expect-error Event name is required.
	analytics.track();
	// @ts-expect-error Debug requires an explicit boolean.
	analytics.debug('true');
	// @ts-expect-error DOM helpers require elements, not CSS selectors.
	analytics.trackLink('a', 'Clicked');
	// @ts-expect-error Removing a listener requires that listener.
	analytics.off('track');
	const cdn: string | undefined = analytics._cdn;
	const custom: unknown = analytics.customMetadata;
	void [cdn, custom];
	if (Array.isArray(analytics)) {
		const queue: CustomerIoQueue = analytics;
		const chained: CustomerIoQueue = queue.identify('id').track('Signed up').page('Pricing').reset().ready();
		const tuple: [string, ...unknown[]] | undefined = queue[0];
		void [chained, tuple];
	} else {
		const runtime: CustomerIoApi = analytics;
		const event: Promise<{ event: Record<string, unknown> }> = runtime.identify('id');
		const group: string | null | undefined = runtime.group().id();
		const trackedGroup: Promise<{ event: Record<string, unknown> }> = runtime.group('team');
		const reset: void = runtime.reset();
		const ready: Promise<unknown[]> = runtime.ready();
		const owner: CustomerIoApi = runtime.debug(true).on('track', listener).off('track', listener);
		const anonymous: string | null | undefined = runtime.setAnonymousId('anonymous');
		const middleware: Promise<CustomerIoApi> = runtime.addSourceMiddleware(({ payload, next }) => next(payload));
		const destination: Promise<CustomerIoApi> = runtime.addDestinationMiddleware('name', () => {});
		const linked: Promise<CustomerIoApi> = runtime.trackLink(link, 'Clicked');
		const pageview: Promise<CustomerIoApi> = runtime.pageview('/path');
		const legacy: void = runtime.addIntegrationMiddleware();
		// @ts-expect-error Loaded identify returns a promise, not a fluent owner.
		runtime.identify('id').track('Signed up');
		// @ts-expect-error The loaded runtime is not an array.
		runtime.push(['track', 'Signed up']);
		void [event, group, trackedGroup, reset, ready, owner, anonymous, middleware, destination, linked, pageview, legacy];
	}
}
`;
	const options: ts.CompilerOptions = {
		lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		noEmit: true,
		skipLibCheck: true,
		strict: true,
		target: ts.ScriptTarget.ES2022,
		types: [],
	};
	const host = ts.createCompilerHost(options);
	const resolved = ts.resolveModuleName(
		'@c15t/integrations/customer-io',
		file,
		options,
		host
	).resolvedModule;
	expect(resolved?.extension).toBe(ts.Extension.Dts);
	expect(resolved?.resolvedFileName).toBe(
		resolve(
			root,
			'packages/integrations/dist-types/vendors/email-and-sms/customer-io.d.ts'
		)
	);
	const { getSourceFile } = host;
	host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) =>
		fileName === file
			? ts.createSourceFile(fileName, code, languageVersion)
			: getSourceFile(fileName, languageVersion, onError, shouldCreate);
	const program = ts.createProgram([file], options, host);
	expect(
		ts.formatDiagnosticsWithColorAndContext(
			ts.getPreEmitDiagnostics(program),
			host
		)
	).toBe('');
});
