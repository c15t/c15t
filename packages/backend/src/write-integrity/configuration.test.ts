import { describe, expect, it, vi } from 'vitest';
import { resolveWriteIntegrityOptions } from './configuration';

describe('resolveWriteIntegrityOptions', () => {
	it('preserves legacy v2 behavior when configuration is omitted', () => {
		const result = resolveWriteIntegrityOptions(undefined);

		expect(result.config).toMatchObject({
			anonymousConsent: { mode: 'legacy' },
			identityLinking: {
				mode: 'legacy',
				reassignment: 'legacy',
			},
			domains: {
				mode: 'legacy',
				allowlist: [],
			},
		});
		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([
			'`writeIntegrity.anonymousConsent` is using deprecated legacy behavior. Configure `public`, `capability`, or `disabled` before upgrading to v3.',
			'`writeIntegrity.identityLinking` is using deprecated legacy behavior. Configure an explicit proof mode or `disabled` before upgrading to v3.',
			'`writeIntegrity.domains` is not configured, so request-provided domains use deprecated legacy behavior. Configure an allowlist, a server resolver, or both before upgrading to v3.',
		]);
	});

	it('resolves a public anonymous mode without changing identity defaults', () => {
		const result = resolveWriteIntegrityOptions({
			anonymousConsent: { mode: 'public' },
			domains: { allowlist: ['example.com'] },
		});

		expect(result.config.anonymousConsent.mode).toBe('public');
		expect(result.config.identityLinking).toEqual({
			mode: 'legacy',
			reassignment: 'legacy',
		});
		expect(result.config.domains).toMatchObject({
			mode: 'configured',
			allowlist: ['example.com'],
		});
		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([
			'`writeIntegrity.identityLinking` is using deprecated legacy behavior. Configure an explicit proof mode or `disabled` before upgrading to v3.',
		]);
	});

	it('accepts a resolver and allowlist together', () => {
		const resolve = vi.fn(() => 'example.com');
		const result = resolveWriteIntegrityOptions({
			anonymousConsent: { mode: 'public' },
			identityLinking: { mode: 'disabled' },
			domains: {
				allowlist: ['example.com'],
				resolve,
			},
		});

		expect(result.config.domains).toEqual({
			mode: 'configured',
			allowlist: ['example.com'],
			resolve,
		});
		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
	});

	it('requires domain controls for enabled secure writes', () => {
		const result = resolveWriteIntegrityOptions({
			anonymousConsent: { mode: 'public' },
			identityLinking: { mode: 'disabled' },
		});

		expect(result.errors).toEqual([
			'Enabled secure write modes require `writeIntegrity.domains.allowlist`, `writeIntegrity.domains.resolve`, or both.',
		]);
	});

	it('honors secure reassignment controls during a legacy linking migration', () => {
		const result = resolveWriteIntegrityOptions({
			identityLinking: {
				mode: 'legacy',
				reassignment: 'capability-and-assertion',
			},
			subjectCapability: { signingKey: 'capability-secret' },
			identityAssertion: { verificationKey: 'assertion-secret' },
		});

		expect(result.config.identityLinking.reassignment).toBe(
			'capability-and-assertion'
		);
		expect(result.errors).toEqual([
			'Enabled secure write modes require `writeIntegrity.domains.allowlist`, `writeIntegrity.domains.resolve`, or both.',
		]);
	});

	it('requires capability and assertion configuration for combined proof', () => {
		const result = resolveWriteIntegrityOptions({
			anonymousConsent: { mode: 'disabled' },
			identityLinking: { mode: 'capability-and-assertion' },
			domains: { allowlist: ['example.com'] },
		});

		expect(result.errors).toEqual([
			'Capability modes require `writeIntegrity.subjectCapability` configuration.',
			'Assertion modes require `writeIntegrity.identityAssertion` configuration.',
		]);
	});

	it('applies credential lifetime defaults for secure configuration', () => {
		const result = resolveWriteIntegrityOptions({
			anonymousConsent: { mode: 'capability' },
			identityLinking: {
				mode: 'assertion',
				reassignment: 'capability-and-assertion',
			},
			domains: { allowlist: ['example.com'] },
			subjectCapability: { signingKey: 'capability-secret' },
			identityAssertion: { verificationKey: 'assertion-public-key' },
		});

		expect(result.config.subjectCapability?.ttlSeconds).toBe(300);
		expect(result.config.subjectCapability?.verificationKey).toBe(
			'capability-secret'
		);
		expect(result.config.identityAssertion?.maxAgeSeconds).toBe(300);
		expect(result.config.identityLinking.reassignment).toBe(
			'capability-and-assertion'
		);
		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
	});

	it('rejects invalid credential lifetimes, keys, and allowlist entries', () => {
		const result = resolveWriteIntegrityOptions({
			anonymousConsent: { mode: 'capability' },
			identityLinking: { mode: 'assertion' },
			domains: { allowlist: [''] },
			subjectCapability: { signingKey: '', ttlSeconds: 0 },
			identityAssertion: { verificationKey: '', maxAgeSeconds: -1 },
		});

		expect(result.errors).toEqual([
			'Enabled secure write modes require `writeIntegrity.domains.allowlist`, `writeIntegrity.domains.resolve`, or both.',
			'`writeIntegrity.domains.allowlist` cannot contain empty domains.',
			'`writeIntegrity.subjectCapability.signingKey` cannot be empty.',
			'`writeIntegrity.subjectCapability.ttlSeconds` must be a positive integer.',
			'`writeIntegrity.identityAssertion.verificationKey` cannot be empty.',
			'`writeIntegrity.identityAssertion.maxAgeSeconds` must be a positive integer.',
		]);
	});

	it('does not mutate caller-owned arrays or option objects', () => {
		const allowlist = ['example.com'];
		const options = {
			anonymousConsent: { mode: 'public' as const },
			identityLinking: { mode: 'disabled' as const },
			domains: { allowlist },
		};

		const result = resolveWriteIntegrityOptions(options);
		allowlist.push('later.example.com');

		expect(result.config.domains.allowlist).toEqual(['example.com']);
		expect(options).not.toHaveProperty('subjectCapability');
	});
});
