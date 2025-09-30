import * as github from '@actions/github';
import { describe, expect, it, vi } from 'vitest';

describe('change detection', () => {
	describe('shouldDeployByPolicy', () => {
		it('should allow main branch for push events', async () => {
			const ctx = github.context as unknown as {
				eventName: string;
				ref: string;
			};
			ctx.eventName = 'push';
			ctx.ref = 'refs/heads/main';

			vi.resetModules();
			const { shouldDeployByPolicy } = await import('../src/steps/changes');

			const result = shouldDeployByPolicy('main,canary', 'main,canary');
			expect(result).toBe(true);
		});

		it('should allow canary branch for push events', async () => {
			const ctx = github.context as unknown as {
				eventName: string;
				ref: string;
			};
			ctx.eventName = 'push';
			ctx.ref = 'refs/heads/canary';

			vi.resetModules();
			const { shouldDeployByPolicy } = await import('../src/steps/changes');

			const result = shouldDeployByPolicy('main,canary', 'main,canary');
			expect(result).toBe(true);
		});

		it('should reject feature branch for push events', async () => {
			const ctx = github.context as unknown as {
				eventName: string;
				ref: string;
			};
			ctx.eventName = 'push';
			ctx.ref = 'refs/heads/feature/new-feature';

			vi.resetModules();
			const { shouldDeployByPolicy } = await import('../src/steps/changes');

			const result = shouldDeployByPolicy('main,canary', 'main,canary');
			expect(result).toBe(false);
		});

		it('should allow main branch for PR events', async () => {
			const ctx = github.context as unknown as {
				eventName: string;
				payload: {
					pull_request: {
						base: { ref: string };
					};
				};
			};
			ctx.eventName = 'pull_request';
			ctx.payload = {
				pull_request: {
					base: { ref: 'main' },
				},
			};

			vi.resetModules();
			const { shouldDeployByPolicy } = await import('../src/steps/changes');

			const result = shouldDeployByPolicy('main,canary', 'main,canary');
			expect(result).toBe(true);
		});

		it('should allow canary branch for PR events', async () => {
			const ctx = github.context as unknown as {
				eventName: string;
				payload: {
					pull_request: {
						base: { ref: string };
					};
				};
			};
			ctx.eventName = 'pull_request';
			ctx.payload = {
				pull_request: {
					base: { ref: 'canary' },
				},
			};

			vi.resetModules();
			const { shouldDeployByPolicy } = await import('../src/steps/changes');

			const result = shouldDeployByPolicy('main,canary', 'main,canary');
			expect(result).toBe(true);
		});

		it('should reject feature branch for PR events', async () => {
			const ctx = github.context as unknown as {
				eventName: string;
				payload: {
					pull_request: {
						base: { ref: string };
					};
				};
			};
			ctx.eventName = 'pull_request';
			ctx.payload = {
				pull_request: {
					base: { ref: 'feature/new-feature' },
				},
			};

			vi.resetModules();
			const { shouldDeployByPolicy } = await import('../src/steps/changes');

			const result = shouldDeployByPolicy('main,canary', 'main,canary');
			expect(result).toBe(false);
		});
	});

	describe('parseCsv', () => {
		it('should parse comma-separated values', async () => {
			vi.resetModules();
			const { parseCsv } = await import('../src/steps/changes');

			const result = parseCsv('main,canary,develop', ['default']);
			expect(result).toEqual(['main', 'canary', 'develop']);
		});

		it('should use fallback when input is undefined', async () => {
			vi.resetModules();
			const { parseCsv } = await import('../src/steps/changes');

			const result = parseCsv(undefined, ['main', 'canary']);
			expect(result).toEqual(['main', 'canary']);
		});

		it('should filter out empty values', async () => {
			vi.resetModules();
			const { parseCsv } = await import('../src/steps/changes');

			const result = parseCsv('main,,canary,', ['default']);
			expect(result).toEqual(['main', 'canary']);
		});

		it('should trim whitespace', async () => {
			vi.resetModules();
			const { parseCsv } = await import('../src/steps/changes');

			const result = parseCsv(' main , canary ', ['default']);
			expect(result).toEqual(['main', 'canary']);
		});
	});
});
