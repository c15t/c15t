import { runFrontendCommand } from './vendor/frontend/index.ts';

try {
	const args = process.argv.slice(2);
	if (args[0] !== 'c15t') {
		throw new Error('Usage: inth c15t <command>');
	}
	const result = runFrontendCommand(args.slice(1), {
		authentication: {
			expiresAt: 123,
			isExpired: process.env.C15T_TEST_EXPIRED === 'true',
			isLoggedIn: process.env.C15T_TEST_LOGGED_OUT !== 'true',
			origin: 'https://inth.com',
			selectedProject: 'one',
		},
		generation: { framework: 'react' },
		projects: [
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
		],
		selectedProject: process.env.C15T_TEST_PROJECT ?? 'one',
	});
	process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`
	);
	process.exitCode = 1;
}
