import { Tabs, Tab } from 'fumadocs-ui/components/tabs';

export function RunCommand({ command }: { command: string }) {
	const packageManagers = {
		npm: `npx ${command}`,
		pnpm: `pnpm dlx ${command}`,
		yarn: `npx ${command}`,
		bun: `bunx --bun ${command}`,
	} as const;

	return (
		<Tabs items={Object.keys(packageManagers)}>
			{Object.entries(packageManagers).map(([name, cmd]) => (
				<Tab key={name} value={name}>
					{cmd}
				</Tab>
			))}
		</Tabs>
	);
}
