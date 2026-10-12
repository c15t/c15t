import { getScenarioConfig } from './_bench/fixtures';
import type { ScriptLifecycleScenarioConfig } from './_bench/fixtures';
import { ScriptLifecyclePageShell } from './_bench/page-shell';
import { ScriptLifecycleProvider } from './_bench/provider';

const HomePage = async ({
	searchParams,
}: {
	searchParams?: Promise<{ scenario?: string | string[] }>;
}) => {
	const resolvedSearchParams = await searchParams;
	const config: ScriptLifecycleScenarioConfig = getScenarioConfig(
		resolvedSearchParams?.scenario
	);

	return (
		<ScriptLifecycleProvider config={config}>
			<ScriptLifecyclePageShell config={config} />
		</ScriptLifecycleProvider>
	);
};

export default HomePage;
