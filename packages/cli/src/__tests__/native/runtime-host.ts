import { runGenerationWorkflow } from './vendor/frontend/runtime/index.ts';

try {
	const args = process.argv.slice(2);
	if (args[0] !== 'c15t') {
		throw new Error('Usage: inth c15t generate [options]');
	}
	const result = await runGenerationWorkflow(
		args.slice(1),
		{
			generation: {
				backendURL: 'https://consent.example.com',
				framework: 'react',
			},
		},
		{ cwd: process.cwd(), packageManager: 'npm' }
	);
	process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`
	);
	process.exitCode = 1;
}
