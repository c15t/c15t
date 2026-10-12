import { prepareBoilerplatePackages } from '../packages/cli/src/commands/generate/boilerplate/package-source';

const dependencies = process.argv.slice(2);
if (!dependencies.length || dependencies.includes('--help')) {
	process.stdout.write(
		'Usage: bun scripts/prepare-cli-packages.ts <package ...>\nBuild the requested workspace packages first. Prepares local snapshots without publishing.\n'
	);
	process.exitCode = dependencies.includes('--help') ? 0 : 1;
} else {
	try {
		const result = await prepareBoilerplatePackages({
			dependencies,
			packageSource: process.cwd(),
		});
		process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
	} catch (error) {
		process.stderr.write(
			`${error instanceof Error ? error.message : String(error)}\n`
		);
		process.exitCode = 1;
	}
}
