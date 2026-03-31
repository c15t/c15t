import {
	getScenarioConfig,
	type ScriptLifecycleScenarioConfig,
} from './_bench/fixtures';
import { ScriptLifecyclePageShell } from './_bench/page-shell';
import { ScriptLifecycleProvider } from './_bench/provider';

export default async function HomePage({
	searchParams,
}: {
	searchParams?: Promise<{ scenario?: string | string[] }>;
}) {
	const resolvedSearchParams = await searchParams;
	const config: ScriptLifecycleScenarioConfig = getScenarioConfig(
		resolvedSearchParams?.scenario
	);

	return (
		<ScriptLifecycleProvider config={config}>
			<ScriptLifecyclePageShell config={config} />
		</ScriptLifecycleProvider>
	);
}
