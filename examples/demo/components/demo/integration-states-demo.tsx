'use client';

import {
	ConsentManagerProvider,
	GoogleMap,
	useConsentScript,
	YouTubeEmbed,
	type YouTubeEmbedProps,
} from '@c15t/react';
import type { AllConsentNames } from 'c15t';
import {
	CircleAlert,
	CircleCheck,
	LoaderCircle,
	RotateCcw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const providerOptions = {
	consentCategories: [
		'necessary',
		'measurement',
		'marketing',
	] as AllConsentNames[],
	mode: 'offline' as const,
};

const missingYouTubeSource = {
	consentCategory: 'necessary',
	title: 'Misconfigured YouTube embed',
} as unknown as YouTubeEmbedProps;

declare global {
	interface Window {
		__c15tIntegrationFixtures?: Record<
			string,
			{ attempt: number; session: string }
		>;
	}
}

export function IntegrationStatesDemo() {
	return (
		<ConsentManagerProvider options={providerOptions}>
			<Tabs defaultValue="loading" className="gap-6">
				<TabsList
					aria-label="Integration state to inspect"
					className="h-auto max-w-full flex-wrap justify-start"
				>
					<TabsTrigger value="loading">Loading</TabsTrigger>
					<TabsTrigger value="error">Error</TabsTrigger>
					<TabsTrigger value="retry">Retry</TabsTrigger>
				</TabsList>

				<TabsContent value="loading">
					<LoadingState />
				</TabsContent>
				<TabsContent value="error">
					<ErrorState />
				</TabsContent>
				<TabsContent value="retry">
					<RetryState />
				</TabsContent>
			</Tabs>
		</ConsentManagerProvider>
	);
}

function LoadingState() {
	const [attempt, setAttempt] = useState(0);

	return (
		<section className="space-y-5">
			<StateIntroduction
				title="YouTube loading state"
				description="This uses the real YouTubeEmbed lifecycle with a local iframe response delayed by eight seconds. Restart it whenever you need more time to inspect the default loading UI."
				status="Loading → ready"
			>
				<Button
					onClick={() => setAttempt((value) => value + 1)}
					size="sm"
					variant="outline"
				>
					<RotateCcw aria-hidden />
					Restart 8-second load
				</Button>
			</StateIntroduction>

			<YouTubeEmbed
				key={attempt}
				consentCategory="necessary"
				src={`/api/integration-fixture?fixture=iframe&delay=8000&attempt=${attempt}`}
				title="Delayed iframe loading fixture"
			/>

			<CheckList
				items={[
					'The frame reserves its final 16:9 dimensions while loading.',
					'The message is exposed with role="status" and aria-live="polite".',
					'After eight seconds, the iframe replaces the loading fallback without a layout shift.',
				]}
			/>
		</section>
	);
}

function ErrorState() {
	return (
		<section className="space-y-6">
			<StateIntroduction
				title="Default integration errors"
				description="These are real component error paths: a dynamic YouTube configuration with no source, and a Google Map with no browser key. TypeScript prevents the YouTube mistake in typed applications, but the runtime fallback still protects JavaScript and API-driven data."
				status="Error"
			/>

			<div className="grid gap-6 lg:grid-cols-2">
				<div className="space-y-3">
					<div>
						<h3 className="font-medium text-base">YouTube configuration</h3>
						<p className="text-muted-foreground text-sm">
							Missing both <code className="font-mono">videoId</code> and{' '}
							<code className="font-mono">src</code>.
						</p>
					</div>
					<YouTubeEmbed {...missingYouTubeSource} />
				</div>

				<div className="space-y-3">
					<div>
						<h3 className="font-medium text-base">Google Maps configuration</h3>
						<p className="text-muted-foreground text-sm">
							Empty browser API key; no Google request is made.
						</p>
					</div>
					<GoogleMap
						apiKey=""
						center={{ lat: 40.7128, lng: -74.006 }}
						consentCategory="necessary"
					/>
				</div>
			</div>

			<CheckList
				items={[
					'Both fallbacks use the active c15t error translation.',
					'Each message is exposed as an assertive role="alert".',
					'Neither broken integration mounts a third-party resource.',
				]}
			/>
		</section>
	);
}

function RetryState() {
	const [session, setSession] = useState('');
	const [retryKey, setRetryKey] = useState(0);

	useEffect(() => {
		setSession(crypto.randomUUID());
	}, []);

	const result = useConsentScript<{ attempt: number; session: string }>({
		enabled: Boolean(session),
		script: {
			category: 'necessary',
			id: `integration-retry-${session || 'pending'}`,
			src: `/api/integration-fixture?fixture=retry-script&session=${encodeURIComponent(session)}`,
		},
		resolveReady: () => window.__c15tIntegrationFixtures?.[session] ?? false,
		retryKey,
		timeoutMs: 5_000,
	});

	const restart = () => {
		setRetryKey(0);
		setSession(crypto.randomUUID());
	};

	const firstAttemptState = getFirstAttemptState(result.status, retryKey);
	const retryAttemptState = getRetryAttemptState(result.status, retryKey);

	return (
		<section className="space-y-5">
			<StateIntroduction
				title="Script failure and retry"
				description="The first request deliberately returns HTTP 503. Retry sends a second request with the same script id and resolves readyValue."
				status="Fails once by design"
			/>

			{result.status === 'error' ? (
				<p className="sr-only" role="alert">
					{getRetryAnnouncement(result.status, retryKey)}
				</p>
			) : (
				<p aria-atomic="true" className="sr-only" role="status">
					{getRetryAnnouncement(result.status, retryKey)}
				</p>
			)}

			<div className="divide-y divide-border/80 border-border/80 border-y">
				<RetryAttemptRow
					description={getFirstAttemptDescription(firstAttemptState)}
					number={1}
					state={firstAttemptState}
					title="Initial request"
				/>
				<RetryAttemptRow
					description={getRetryAttemptDescription(
						retryAttemptState,
						result.readyValue?.attempt
					)}
					number={2}
					state={retryAttemptState}
					title="Retry request"
				>
					{result.status === 'error' && (
						<Button
							className="min-h-11"
							onClick={() => setRetryKey((value) => value + 1)}
						>
							{retryKey === 0 ? 'Retry request' : 'Retry again'}
						</Button>
					)}
					{result.status === 'ready' && (
						<Button className="min-h-11" onClick={restart} variant="outline">
							<RotateCcw aria-hidden />
							Run again
						</Button>
					)}
				</RetryAttemptRow>
			</div>

			{result.status === 'error' && (
				<details className="text-sm">
					<summary className="-ml-2 inline-flex min-h-11 cursor-pointer items-center rounded-md px-2 text-muted-foreground hover:text-foreground">
						Technical error
					</summary>
					<code className="block overflow-x-auto rounded-md bg-muted p-3 text-muted-foreground text-xs leading-5">
						{result.error?.message ?? 'The fixture script failed to load.'}
					</code>
				</details>
			)}
		</section>
	);
}

type RetryAttemptState = 'blocked' | 'failed' | 'loading' | 'ready' | 'waiting';

function RetryAttemptRow({
	children,
	description,
	number,
	state,
	title,
}: {
	children?: React.ReactNode;
	description: string;
	number: number;
	state: RetryAttemptState;
	title: string;
}) {
	return (
		<div
			className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
			data-state={state}
		>
			<div className="flex min-w-0 gap-3">
				<RetryAttemptIcon number={number} state={state} />
				<div>
					<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
						<h3 className="font-medium text-base">{title}</h3>
						<span className="font-mono text-muted-foreground text-xs">
							{getRetryAttemptLabel(state, number)}
						</span>
					</div>
					<p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-6">
						{description}
					</p>
				</div>
			</div>
			{children && <div className="shrink-0 pl-10 sm:pl-0">{children}</div>}
		</div>
	);
}

function RetryAttemptIcon({
	number,
	state,
}: {
	number: number;
	state: RetryAttemptState;
}) {
	const className =
		'flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs';

	switch (state) {
		case 'failed':
			return (
				<span
					aria-hidden
					className={`${className} border-destructive/40 text-destructive`}
				>
					<CircleAlert aria-hidden className="size-4" />
				</span>
			);
		case 'ready':
			return (
				<span
					aria-hidden
					className={`${className} border-foreground text-foreground`}
				>
					<CircleCheck aria-hidden className="size-4" />
				</span>
			);
		case 'loading':
			return (
				<span
					aria-hidden
					className={`${className} border-foreground text-foreground`}
				>
					<LoaderCircle
						aria-hidden
						className="size-4 motion-safe:animate-spin"
					/>
				</span>
			);
		default:
			return (
				<span
					aria-hidden
					className={`${className} border-border text-muted-foreground`}
				>
					{number}
				</span>
			);
	}
}

function StateIntroduction({
	children,
	description,
	status,
	title,
}: {
	children?: React.ReactNode;
	description: string;
	status: string;
	title: string;
}) {
	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div className="max-w-2xl">
				<div className="flex flex-wrap items-center gap-2">
					<h2 className="font-semibold text-xl tracking-tight">{title}</h2>
					<span className="rounded-full bg-muted px-2.5 py-1 font-mono text-muted-foreground text-xs">
						{status}
					</span>
				</div>
				<p className="mt-2 text-muted-foreground text-sm leading-6">
					{description}
				</p>
			</div>
			{children}
		</div>
	);
}

function CheckList({ items }: { items: string[] }) {
	return (
		<div className="border-border/80 border-t pt-4">
			<p className="font-medium text-sm">What to verify</p>
			<ul className="mt-2 space-y-1 text-muted-foreground text-sm leading-6">
				{items.map((item) => (
					<li key={item} className="flex gap-2">
						<span aria-hidden className="text-foreground">
							✓
						</span>
						<span>{item}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function getFirstAttemptState(
	status: string,
	retryKey: number
): RetryAttemptState {
	if (retryKey === 0 && (status === 'idle' || status === 'loading')) {
		return 'loading';
	}
	if (status === 'blocked') {
		return 'blocked';
	}
	return 'failed';
}

function getRetryAttemptState(
	status: string,
	retryKey: number
): RetryAttemptState {
	if (retryKey === 0) {
		return 'waiting';
	}
	switch (status) {
		case 'ready':
			return 'ready';
		case 'error':
			return 'failed';
		case 'blocked':
			return 'blocked';
		default:
			return 'loading';
	}
}

function getRetryAttemptLabel(state: RetryAttemptState, number: number) {
	switch (state) {
		case 'failed':
			return number === 1 ? 'Expected failure' : 'Failed';
		case 'loading':
			return 'In progress';
		case 'ready':
			return 'Ready';
		case 'blocked':
			return 'Blocked';
		default:
			return 'Waiting';
	}
}

function getFirstAttemptDescription(state: RetryAttemptState) {
	switch (state) {
		case 'loading':
			return 'Requesting the local fixture.';
		case 'blocked':
			return 'Waiting for the configured consent category.';
		default:
			return 'Returned HTTP 503 as designed.';
	}
}

function getRetryAttemptDescription(
	state: RetryAttemptState,
	attempt?: number
) {
	switch (state) {
		case 'loading':
			return 'Sending request 2 with the same script id.';
		case 'ready':
			return `Resolved readyValue successfully on request ${attempt ?? 2}.`;
		case 'failed':
			return 'The retry failed unexpectedly. Open the technical error below for details.';
		case 'blocked':
			return 'Waiting for the configured consent category.';
		default:
			return 'Reuses the script id and replaces only the failed owned registration.';
	}
}

function getRetryAnnouncement(status: string, retryKey: number) {
	switch (status) {
		case 'error':
			return retryKey === 0
				? 'Initial request failed as designed. Retry is available.'
				: 'The retry request failed. Retry is available again.';
		case 'ready':
			return 'Retry succeeded. The fixture SDK is ready.';
		case 'blocked':
			return 'The retry fixture is blocked by consent.';
		case 'idle':
			return 'Preparing an isolated retry test session.';
		default:
			return retryKey === 0
				? 'Sending the initial request.'
				: 'Retrying the request.';
	}
}
