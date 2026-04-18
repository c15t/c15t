'use client';

import { c15tDevtools } from '@c15t/dev-tools/tanstack';
import { useConsentManager } from '@c15t/react';
import { TanStackDevtools } from '@tanstack/react-devtools';
import {
	QueryClient,
	QueryClientProvider,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import {
	ArrowUpRight,
	DatabaseZap,
	RefreshCcw,
	ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { Button } from './ui/button';

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms);
	});
}

function QueryProbe() {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: ['tanstack-devtools-example'],
		queryFn: async () => {
			await wait(180);

			return {
				generatedAt: new Date().toISOString(),
				seed: Math.random().toString(36).slice(2, 8),
			};
		},
		refetchInterval: 10_000,
		staleTime: 2_500,
	});

	return (
		<div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="font-medium text-muted-foreground text-sm uppercase tracking-[0.2em]">
						Query panel
					</p>
					<h2 className="mt-2 font-semibold text-2xl text-foreground">
						Reference TanStack plugin
					</h2>
					<p className="mt-2 max-w-xl text-muted-foreground text-sm">
						This query gives the built-in TanStack Query panel something live to
						inspect while you switch between plugins.
					</p>
				</div>

				<div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-700 text-xs dark:text-emerald-300">
					{query.isFetching ? 'Refreshing' : 'Idle'}
				</div>
			</div>

			<div className="mt-5 grid gap-3 sm:grid-cols-2">
				<div className="rounded-xl border border-border/80 bg-background/70 p-4">
					<p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]">
						Last payload
					</p>
					<pre className="mt-3 overflow-x-auto rounded-lg bg-muted/50 p-3 font-mono text-foreground text-xs">
						{JSON.stringify(query.data ?? null, null, 2)}
					</pre>
				</div>

				<div className="rounded-xl border border-border/80 bg-background/70 p-4">
					<p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]">
						Actions
					</p>
					<div className="mt-3 flex flex-wrap gap-3">
						<Button
							onClick={() => {
								void query.refetch();
							}}
							size="sm"
							variant="outline"
						>
							<RefreshCcw className="mr-2 h-4 w-4" />
							Refetch query
						</Button>
						<Button
							onClick={() => {
								void queryClient.invalidateQueries({
									queryKey: ['tanstack-devtools-example'],
								});
							}}
							size="sm"
							variant="outline"
						>
							<DatabaseZap className="mr-2 h-4 w-4" />
							Invalidate cache
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

function ConsentProbe() {
	const {
		activeUI,
		consents,
		hasConsented,
		model,
		resetConsents,
		setActiveUI,
	} = useConsentManager();

	return (
		<div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="font-medium text-muted-foreground text-sm uppercase tracking-[0.2em]">
						c15t store
					</p>
					<h2 className="mt-2 font-semibold text-2xl text-foreground">
						Live consent state
					</h2>
					<p className="mt-2 max-w-xl text-muted-foreground text-sm">
						The c15t TanStack panel should stay connected to this store even
						after you switch to other plugins and back again.
					</p>
				</div>

				<div className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 font-medium text-sky-700 text-xs dark:text-sky-300">
					{hasConsented ? 'Has consent' : 'Needs action'}
				</div>
			</div>

			<div className="mt-5 grid gap-3 sm:grid-cols-3">
				<div className="rounded-xl border border-border/80 bg-background/70 p-4">
					<p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]">
						Model
					</p>
					<p className="mt-2 font-semibold text-foreground text-lg">{model}</p>
				</div>
				<div className="rounded-xl border border-border/80 bg-background/70 p-4">
					<p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]">
						Active UI
					</p>
					<p className="mt-2 font-semibold text-foreground text-lg">
						{activeUI ?? 'none'}
					</p>
				</div>
				<div className="rounded-xl border border-border/80 bg-background/70 p-4">
					<p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]">
						Selected consents
					</p>
					<p className="mt-2 font-semibold text-foreground text-lg">
						{
							Object.values(consents ?? {}).filter((value) => value === true)
								.length
						}
					</p>
				</div>
			</div>

			<div className="mt-5 flex flex-wrap gap-3">
				<Button
					onClick={() => {
						setActiveUI('banner');
					}}
					size="sm"
				>
					Show banner
				</Button>
				<Button
					onClick={() => {
						setActiveUI('dialog');
					}}
					size="sm"
					variant="outline"
				>
					Show preferences
				</Button>
				<Button
					onClick={() => {
						resetConsents();
					}}
					size="sm"
					variant="outline"
				>
					Reset consents
				</Button>
			</div>
		</div>
	);
}

function TanStackDevtoolsExampleShell() {
	const [queryClient] = React.useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						retry: false,
						refetchOnWindowFocus: false,
					},
				},
			})
	);

	return (
		<QueryClientProvider client={queryClient}>
			<div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.02),transparent_55%)]">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-24">
					<div className="flex flex-wrap items-center gap-3">
						<div className="rounded-full border border-foreground/10 bg-background/80 px-3 py-1 font-medium text-foreground text-xs">
							Repro page
						</div>
						<div className="rounded-full border border-foreground/10 bg-background/80 px-3 py-1 font-medium text-foreground text-xs">
							/tanstack-devtools
						</div>
					</div>

					<div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
						<div>
							<h1 className="max-w-3xl font-semibold text-4xl text-foreground tracking-tight sm:text-5xl">
								Test the c15t TanStack plugin against real tab switches
							</h1>
							<p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
								This page mounts TanStack Devtools with the official Query panel
								plus the c15t panel. Switch between them repeatedly. The c15t
								panel should keep its store connection and never fall back to
								&quot;can&apos;t connect to store&quot;.
							</p>
						</div>

						<div className="rounded-3xl border border-border bg-card/85 p-6 shadow-sm">
							<p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]">
								How to repro
							</p>
							<ol className="mt-4 space-y-3 text-foreground text-sm">
								<li>
									1. Open the TanStack Devtools tray in the bottom corner.
								</li>
								<li>
									2. Select the `c15t` plugin and confirm it shows live state.
								</li>
								<li>3. Switch to `TanStack Query`, then back to `c15t`.</li>
								<li>
									4. Use the controls below and verify the c15t panel stays
									connected.
								</li>
							</ol>

							<div className="mt-6 flex flex-wrap gap-3">
								<Button asChild size="sm" variant="outline">
									<Link href="/policy-actions">
										Compare with floating DevTools
										<ArrowUpRight className="ml-2 h-4 w-4" />
									</Link>
								</Button>
								<Button asChild size="sm" variant="outline">
									<Link href="/policy">
										Policy pack demo
										<ArrowUpRight className="ml-2 h-4 w-4" />
									</Link>
								</Button>
							</div>
						</div>
					</div>

					<div className="grid gap-6 lg:grid-cols-2">
						<QueryProbe />
						<ConsentProbe />
					</div>

					<div className="rounded-3xl border border-border bg-card/85 p-6 shadow-sm">
						<div className="flex items-start gap-3">
							<div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-300">
								<ShieldCheck className="h-5 w-5" />
							</div>
							<div>
								<h2 className="font-semibold text-foreground text-xl">
									Public API used on this page
								</h2>
								<pre className="mt-3 overflow-x-auto rounded-2xl bg-muted/55 p-4 font-mono text-foreground text-xs">
									{`<TanStackDevtools
  plugins={[
    {
      name: 'TanStack Query',
      render: <ReactQueryDevtoolsPanel />,
    },
    c15tDevtools(),
  ]}
/>`}
								</pre>
							</div>
						</div>
					</div>
				</div>

				<TanStackDevtools
					plugins={[
						{
							name: 'TanStack Query',
							render: <ReactQueryDevtoolsPanel />,
						},
						c15tDevtools({
							defaultOpen: true,
						}),
					]}
				/>
			</div>
		</QueryClientProvider>
	);
}

export function TanStackDevtoolsDemo() {
	return <TanStackDevtoolsExampleShell />;
}
