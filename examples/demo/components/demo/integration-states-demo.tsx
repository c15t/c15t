'use client';

import {
	ConsentManagerProvider,
	GoogleMap,
	useConsentScript,
	YouTubeEmbed,
	type YouTubeEmbedProps,
} from '@c15t/react';
import type { AllConsentNames } from 'c15t';
import { RotateCcw } from 'lucide-react';
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

	return (
		<section className="space-y-5">
			<StateIntroduction
				title="Script failure and retry"
				description="The local SDK endpoint intentionally returns an error on its first request and succeeds on its second. This exercises useConsentScript with the same script id throughout the retry."
				status="Loading → error → ready"
			/>

			<div
				aria-live={result.status === 'error' ? 'assertive' : 'polite'}
				className="min-h-48 border-border/80 border-y py-8"
				role={result.status === 'error' ? 'alert' : 'status'}
			>
				<p className="font-mono text-muted-foreground text-xs">
					status: {result.status}
				</p>
				<h3 className="mt-3 font-medium text-lg">
					{getRetryStatusTitle(result.status)}
				</h3>
				<p className="mt-1 max-w-2xl break-words text-muted-foreground text-sm leading-6">
					{result.status === 'error'
						? (result.error?.message ?? 'The fixture script failed to load.')
						: getRetryStatusDescription(
								result.status,
								result.readyValue?.attempt
							)}
				</p>

				<div className="mt-5 flex flex-wrap gap-2">
					{result.status === 'error' && (
						<Button onClick={() => setRetryKey((value) => value + 1)}>
							Retry same script
						</Button>
					)}
					{result.status === 'ready' && (
						<Button onClick={restart} variant="outline">
							<RotateCcw aria-hidden />
							Restart scenario
						</Button>
					)}
				</div>
			</div>

			<CheckList
				items={[
					'The first request fails and exposes the hook error state.',
					'Retry removes only the failed owned registration and keeps the same script id.',
					'The second request resolves readyValue and reaches the ready state.',
				]}
			/>
		</section>
	);
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

function getRetryStatusTitle(status: string) {
	switch (status) {
		case 'error':
			return 'First attempt failed as expected';
		case 'ready':
			return 'Fixture SDK is ready';
		case 'blocked':
			return 'Consent is required';
		case 'idle':
			return 'Preparing fixture';
		default:
			return 'Loading fixture SDK';
	}
}

function getRetryStatusDescription(status: string, attempt?: number) {
	switch (status) {
		case 'ready':
			return `The SDK resolved successfully on request ${attempt ?? 2}.`;
		case 'blocked':
			return 'Grant the configured consent category to start loading.';
		case 'idle':
			return 'Creating an isolated test session.';
		default:
			return 'Waiting for the intentionally failing first response.';
	}
}
