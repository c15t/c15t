import Link from 'next/link';

import { IntegrationStatesDemo } from '../../../../components/demo/integration-states-demo';

const IntegrationStatesPage = () => {
	return (
		<main className="bg-background min-h-screen">
			<div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6">
				<header className="border-border/80 space-y-3 border-b pb-8">
					<p className="label-pixel text-muted-foreground">
						c15t demo / integration states
					</p>
					<h1 className="text-3xl font-semibold tracking-[-0.04em]">
						Inspect loading, error, and retry
					</h1>
					<p className="text-muted-foreground max-w-3xl text-sm leading-6">
						Deterministic fixtures for states that are normally too brief or
						environment-dependent to inspect. These exercise the real
						integration components and script hook without contacting a broken
						third-party configuration.
					</p>
				</header>

				<IntegrationStatesDemo />

				<p className="text-muted-foreground text-xs">
					Back to the{' '}
					<Link
						href="/dev"
						className="underline"
					>
						development pages
					</Link>{' '}
					or the{' '}
					<Link
						href="/"
						className="underline"
					>
						live integration demo
					</Link>
					.
				</p>
			</div>
		</main>
	);
};

export default IntegrationStatesPage;
