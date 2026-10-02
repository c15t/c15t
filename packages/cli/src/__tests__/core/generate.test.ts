import { describe, expect, it } from 'vitest';

import {
	generate,
	generateBoilerplateTemplate,
	runGenerateCommand,
} from '../../generate';
import { getInstallSpecifier } from '../../generate/dependencies';
import { toCamelCase } from '../../generate/scripts';

describe('reusable generation', () => {
	it.each([undefined, '', 'not-a-url'])(
		'explains how to supply a hosted backend URL: %s',
		(backendURL) => {
			expect(() =>
				runGenerateCommand(['hosted', '--framework', 'react'], {
					backendURL,
				})
			).toThrow('--backend-url');
		}
	);
	it('accepts the mode flag forwarded by a host and rejects conflicting modes', () => {
		expect(
			runGenerateCommand(['--mode', 'offline', '--framework', 'react'])
		).toEqual(generate({ framework: 'react', mode: 'offline' }));
		expect(() =>
			runGenerateCommand([
				'hosted',
				'--mode',
				'offline',
				'--framework',
				'react',
			])
		).toThrow('one mode');
	});
	it('deduplicates integrations without mutating the caller inputs', () => {
		const scripts = ['google-tag', 'google-tag'];
		expect(generate({ framework: 'react', mode: 'offline', scripts })).toEqual(
			generate({ framework: 'react', mode: 'offline', scripts: ['google-tag'] })
		);
		expect(scripts).toEqual(['google-tag', 'google-tag']);
		expect(
			runGenerateCommand([
				'offline',
				'--framework',
				'react',
				'--scripts',
				' google-tag,google-tag, ',
			])
		).toEqual(
			generate({ framework: 'react', mode: 'offline', scripts: ['google-tag'] })
		);
	});
	it('returns app-relative files and alpha installation arguments', () => {
		const plan = generate({
			backendURL: 'https://consent.example.com',
			framework: 'react',
			mode: 'hosted',
			output: 'src/privacy',
			scripts: ['google-tag'],
		});
		expect(plan.files['src/privacy/consent-manager.tsx']).toContain(
			'hosted({ url: "https://consent.example.com" })'
		);
		expect(plan.files['src/privacy/consent-manager.tsx']).toContain('gtag(');
		expect(plan.files['src/privacy/README.md']).toContain(
			'src/privacy/consent-manager'
		);
		expect(plan.dependencies).toEqual([
			'@c15t/react@alpha',
			'@c15t/integrations@alpha',
		]);
	});
	it('accepts arguments forwarded by another CLI', () => {
		expect(
			runGenerateCommand([
				'offline',
				'--framework',
				'react',
				'--scripts',
				'google-tag,microsoft-clarity',
			])
		).toEqual(
			generate({
				framework: 'react',
				mode: 'offline',
				scripts: ['google-tag', 'microsoft-clarity'],
			})
		);
	});
	it.each([
		'../outside',
		'/absolute',
		'C:/absolute',
		'src/../../outside',
		'src\\outside',
	])('rejects output outside the application: %s', (output) => {
		expect(() =>
			generate({ framework: 'react', mode: 'offline', output })
		).toThrow('relative directory');
	});
	it.each([
		'ftp://example.com',
		'https://user:pass@example.com',
		'https://example.com:invalid',
	])('rejects an invalid backend URL: %s', (backendURL) => {
		expect(() =>
			generateBoilerplateTemplate({
				backendURL,
				framework: 'react',
				mode: 'hosted',
				scripts: [],
			})
		).toThrow();
	});
	it.each(['constructor', 'toString', '__proto__', 'unknown'])(
		'rejects an unknown integration: %s',
		(script) => {
			expect(() =>
				generate({ framework: 'react', mode: 'offline', scripts: [script] })
			).toThrow('Unknown script');
		}
	);
	it.each([
		['google-tag-manager', 'googleTagManager'],
		['custom--script', 'custom-Script'],
		['custom-1-script-', 'custom-1Script-'],
		['UPPER-Case', 'UPPER-Case'],
	])('retains script-name conversion for %s', (input, expected) => {
		expect(toCamelCase(input)).toBe(expected);
	});
});

it.each([
	['c15t', 'c15t@alpha'],
	['@c15t/react', '@c15t/react@alpha'],
	['@c15t/backend', '@c15t/backend@alpha'],
	['@c15t/react@3.0.0-alpha.3', '@c15t/react@3.0.0-alpha.3'],
	['c15t@canary', 'c15t@canary'],
	['svelte', 'svelte'],
	['@effect/sql-pg', '@effect/sql-pg'],
])('selects the install channel for %s', (dependency, expected) => {
	expect(getInstallSpecifier(dependency)).toBe(expected);
});
