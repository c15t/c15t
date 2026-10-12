import {
	createAgentSetupPlan,
	launchAgentSetup,
} from './vendor/frontend/agent/index.ts';

const buildPlan = () => {
	if (process.argv[3] === 'default') {
		return createAgentSetupPlan();
	}
	if (process.argv[3] === 'offline') {
		return createAgentSetupPlan({ mode: 'offline' });
	}
	return createAgentSetupPlan({
		backendURL: 'https://consent.example.com',
		framework: 'react',
		mode: 'hosted',
		scripts: ['google-tag'],
	});
};

const run = async () => {
	try {
		const plan = buildPlan();
		if (process.argv[2] === '--plan') {
			process.stdout.write(`${JSON.stringify(plan)}\n`);
		} else {
			const controller = new AbortController();
			if (process.argv[2] === '--cancel') {
				setTimeout(() => {
					controller.abort();
				}, 100);
			}
			process.exitCode = await launchAgentSetup(
				process.cwd(),
				plan,
				controller.signal
			);
		}
	} catch (error) {
		process.stderr.write(
			`${error instanceof Error ? error.message : String(error)}\n`
		);
		process.exitCode = 1;
	}
};

await run();
