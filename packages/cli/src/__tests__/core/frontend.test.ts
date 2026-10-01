import { describe, expect, it } from 'vitest';

import { getAuthenticationStatus, runFrontendCommand } from '../../frontend';
import type { FrontendCommandContext, HostedProject } from '../../frontend';
import { generate, runGenerateCommand } from '../../generate';

const projects: HostedProject[] = [
	{
		id: 'one',
		name: 'app',
		organizationSlug: 'one',
		status: 'active',
		url: 'https://one.example.com',
	},
	{
		id: 'two',
		name: 'app',
		organizationSlug: 'two',
		status: 'active',
		url: 'https://two.example.com',
	},
	{ id: 'pending', name: 'pending', status: 'pending', url: '' },
];

describe('host-owned frontend commands', () => {
	it('uses host defaults without requiring a backend flag or mode', () => {
		const context: FrontendCommandContext = {
			generation: {
				backendURL: 'https://host.example.com',
				framework: 'react',
				output: 'src/privacy',
				scripts: ['google-tag'],
			},
		};
		expect(runFrontendCommand(['setup'], context)).toEqual({
			command: 'setup',
			data: generate({
				...context.generation,
				framework: 'react',
				mode: 'hosted',
			}),
		});
		expect(context.generation?.mode).toBeUndefined();
	});

	it('uses the selected provisioned project to populate the backend URL', () => {
		expect(
			runFrontendCommand(['generate', '--framework', 'react'], {
				projects,
				selectedProject: 'two/app',
			})
		).toEqual({
			command: 'generate',
			data: generate({
				backendURL: 'https://two.example.com',
				framework: 'react',
				mode: 'hosted',
			}),
		});
	});

	it('lets explicit flags override defaults without accessing a pending project', () => {
		expect(
			runFrontendCommand(
				[
					'setup',
					'--backend-url',
					'https://override.example.com',
					'--framework',
					'vue',
					'--output',
					'privacy',
					'--scripts',
					'microsoft-clarity',
				],
				{
					generation: {
						framework: 'react',
						output: 'src/consent',
						scripts: ['google-tag'],
					},
					projects,
					selectedProject: 'pending',
				}
			)
		).toEqual({
			command: 'setup',
			data: generate({
				backendURL: 'https://override.example.com',
				framework: 'vue',
				mode: 'hosted',
				output: 'privacy',
				scripts: ['microsoft-clarity'],
			}),
		});
	});

	it('supports offline generation without reading a selected backend', () => {
		expect(
			runFrontendCommand(['setup', 'offline'], {
				generation: {
					backendURL: 'https://host.example.com',
					framework: 'react',
				},
				projects,
				selectedProject: 'pending',
			})
		).toEqual({
			command: 'setup',
			data: generate({ framework: 'react', mode: 'offline' }),
		});
		expect(() =>
			runFrontendCommand(
				['setup', 'offline', '--backend-url', 'https://host.example.com'],
				{ generation: { framework: 'react' } }
			)
		).toThrow('requires hosted');
	});

	it('refuses to use a pending, missing, ambiguous, or malformed project backend', () => {
		for (const selectedProject of ['pending', 'missing', 'app']) {
			expect(() =>
				runFrontendCommand(['setup', '--framework', 'react'], {
					projects,
					selectedProject,
				})
			).toThrow();
		}
		for (const url of ['ftp://example.com', 'https://user:pass@example.com']) {
			expect(() =>
				runFrontendCommand(['setup', '--framework', 'react'], {
					projects: [{ id: 'bad', name: 'bad', status: 'active', url }],
					selectedProject: 'bad',
				})
			).toThrow('HTTP or HTTPS');
		}
	});

	it('lists and selects projects without changing the host selection', () => {
		const context = { projects, selectedProject: 'one' };
		expect(runFrontendCommand(['projects'], context)).toEqual({
			command: 'projects list',
			data: { projects, selectedProject: 'one' },
		});
		expect(
			runFrontendCommand(['projects', 'select', 'two/app'], context)
		).toEqual({
			command: 'projects select',
			data: { project: projects[1], selectedProject: 'two' },
		});
		expect(context.selectedProject).toBe('one');
	});

	it('returns account status without leaking host credentials', () => {
		const authentication = {
			accessToken: 'access-secret',
			expiresAt: 123,
			isExpired: false,
			isLoggedIn: true,
			origin: 'https://inth.com',
			refreshToken: 'refresh-secret',
			selectedProject: 'one',
		};
		const result = runFrontendCommand(['status'], { authentication });
		expect(result).toEqual({
			command: 'status',
			data: {
				authenticated: true,
				expiresAt: 123,
				origin: 'https://inth.com',
				selectedProject: 'one',
				status: 'logged-in',
			},
		});
		expect(JSON.stringify(result)).not.toContain('secret');
	});

	it.each([
		{ isExpired: false, isLoggedIn: false, status: 'logged-out' },
		{ isExpired: true, isLoggedIn: false, status: 'logged-out' },
		{ isExpired: true, isLoggedIn: true, status: 'expired' },
	])(
		'reports $status from the supplied session',
		({ isExpired, isLoggedIn, status }) => {
			expect(getAuthenticationStatus({ isExpired, isLoggedIn })).toMatchObject({
				authenticated: false,
				status,
			});
		}
	);

	it.each(
		[
			[],
			['self-host', 'migrate'],
			['codemods'],
			['login'],
			['logout'],
			['projects', 'create', 'app'],
			['projects', 'select'],
			['projects', 'list', '--json'],
			['projects', 'list', '', 'extra'],
			['projects', 'select', 'one', 'extra'],
			['status', '--json'],
			['setup', '--apply'],
			['setup', '--framework', 'react', '--framework', 'vue'],
		].map((args) => ({ args }))
	)('rejects unsupported arguments $args', ({ args }) => {
		expect(() =>
			runFrontendCommand(args, {
				authentication: { isExpired: false, isLoggedIn: true },
				generation: {
					backendURL: 'https://host.example.com',
					framework: 'react',
				},
				projects,
			})
		).toThrow();
	});

	it.each(
		[['status'], ['projects'], ['setup', '--framework', 'react']].map(
			(args) => ({ args })
		)
	)('requires explicit host state for $args', ({ args }) => {
		expect(() => runFrontendCommand(args)).toThrow();
	});

	it('allows direct generation callers to supply defaults', () => {
		expect(
			runGenerateCommand([], {
				backendURL: 'https://host.example.com',
				framework: 'react',
				mode: 'hosted',
			})
		).toEqual(
			generate({
				backendURL: 'https://host.example.com',
				framework: 'react',
				mode: 'hosted',
			})
		);
	});
});
