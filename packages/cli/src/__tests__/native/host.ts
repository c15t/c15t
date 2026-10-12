import { runGenerateCommand } from './vendor/generate/index.ts';

try {
	const args = process.argv.slice(2);
	if (args[0] !== 'c15t' || args[1] !== 'generate') {
		throw new Error('Usage: inth c15t generate <mode> --framework <framework>');
	}
	const plan = runGenerateCommand(args.slice(2));
	process.stdout.write(`${JSON.stringify(plan)}\n`);
} catch (error) {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`
	);
	process.exitCode = 1;
}
