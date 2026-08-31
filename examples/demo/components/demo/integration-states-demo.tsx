'use client';

import type { AllConsentNames } from 'c15t';
import {
	ConsentManagerProvider,
	Frame,
	GoogleMap,
	useConsentScript,
	YouTubeEmbed,
} from 'c15t/react';
import type { YouTubeEmbedProps } from 'c15t/react';
import { Button as C15tButton } from 'c15t/react/primitives';
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

const StateIntroduction = ({
	children,
	description,
	status,
	title,
}: {
	children?: React.ReactNode;
	description: string;
	status: string;
	title: string;
}) => (
	<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div className="max-w-2xl">
			<div className="flex flex-wrap items-center gap-2">
				<h2 className="text-xl font-semibold tracking-tight">{title}</h2>
				<span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 font-mono text-xs">
					{status}
				</span>
			</div>
			<p className="text-muted-foreground mt-2 text-sm leading-6">
				{description}
			</p>
		</div>
		{children}
	</div>
);
const CheckList = ({ items }: { items: string[] }) => (
	<div className="border-border/80 border-t pt-4">
		<p className="text-sm font-medium">What to verify</p>
		<ul className="text-muted-foreground mt-2 space-y-1 text-sm leading-6">
			{items.map((item) => (
				<li
					key={item}
					className="flex gap-2"
				>
					<span
						aria-hidden
						className="text-foreground"
					>
						✓
					</span>
					<span>{item}</span>
				</li>
			))}
		</ul>
	</div>
);
const LoadingState = () => {
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
};
const ErrorState = () => (
	<section className="space-y-6">
		<StateIntroduction
			title="Default integration errors"
			description="These are real component error paths: a dynamic YouTube configuration with no source, and a Google Map with no browser key. TypeScript prevents the YouTube mistake in typed applications, but the runtime fallback still protects JavaScript and API-driven data."
			status="Error"
		/>

		<div className="grid gap-6 lg:grid-cols-2">
			<div className="space-y-3">
				<div>
					<h3 className="text-base font-medium">YouTube configuration</h3>
					<p className="text-muted-foreground text-sm">
						Missing both <code className="font-mono">videoId</code> and{' '}
						<code className="font-mono">src</code>.
					</p>
				</div>
				<YouTubeEmbed {...missingYouTubeSource} />
			</div>

			<div className="space-y-3">
				<div>
					<h3 className="text-base font-medium">Google Maps configuration</h3>
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
const getRetryAnnouncement = function getRetryAnnouncement(
	status: string,
	retryKey: number
) {
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
};
const getRetryFrameTitle = function getRetryFrameTitle(
	status: string,
	hasRetried: boolean,
	attempt?: number
) {
	switch (status) {
		case 'error':
			return hasRetried
				? 'The retry could not be completed.'
				: 'The first request failed as expected.';
		case 'ready':
			return `The fixture script loaded successfully on request ${attempt ?? 2}.`;
		case 'blocked':
			return 'Consent is required to load this script.';
		case 'idle':
			return 'Preparing the fixture script…';
		default:
			return hasRetried
				? 'Retrying the fixture script…'
				: 'Loading the fixture script…';
	}
};
const RetryState = () => {
	const [session, setSession] = useState('');
	const [retryKey, setRetryKey] = useState(0);

	useEffect(() => {
		const frame = requestAnimationFrame(() => {
			setSession(crypto.randomUUID());
		});
		return () => cancelAnimationFrame(frame);
	}, []);

	const result = useConsentScript<{ attempt: number; session: string }>({
		enabled: Boolean(session),
		resolveReady: () => window.__c15tIntegrationFixtures?.[session] ?? false,
		retryKey,
		script: {
			category: 'necessary',
			id: `integration-retry-${session || 'pending'}`,
			src: `/api/integration-fixture?fixture=retry-script&session=${encodeURIComponent(session)}`,
		},
		timeoutMs: 5_000,
	});

	const restart = () => {
		setRetryKey(0);
		setSession(crypto.randomUUID());
	};

	const hasRetried = retryKey > 0;

	return (
		<section className="space-y-5">
			<StateIntroduction
				title="Script failure and retry"
				description="The first request deliberately returns HTTP 503. Retry sends a second request with the same script id and resolves readyValue."
				status="Fails once by design"
			/>

			{result.status === 'error' ? (
				<p
					className="sr-only"
					role="alert"
				>
					{getRetryAnnouncement(result.status, retryKey)}
				</p>
			) : (
				<output
					aria-atomic="true"
					className="sr-only"
				>
					{getRetryAnnouncement(result.status, retryKey)}
				</output>
			)}

			<div
				aria-busy={result.status === 'loading' || undefined}
				className="h-80"
				data-c15t-integration="retry-fixture"
				data-c15t-status={result.status}
			>
				<Frame.Root>
					<Frame.Title>
						{getRetryFrameTitle(
							result.status,
							hasRetried,
							result.readyValue?.attempt
						)}
					</Frame.Title>
					{result.status === 'error' && (
						<C15tButton.Root
							mode="stroke"
							onClick={() => setRetryKey((value) => value + 1)}
							size="small"
							variant="neutral"
						>
							{retryKey === 0 ? 'Retry request' : 'Retry again'}
						</C15tButton.Root>
					)}
					{result.status === 'ready' && (
						<C15tButton.Root
							mode="stroke"
							onClick={restart}
							size="small"
							variant="neutral"
						>
							Run again
						</C15tButton.Root>
					)}
				</Frame.Root>
			</div>

			{result.status === 'error' && (
				<details className="text-sm">
					<summary className="text-muted-foreground hover:text-foreground -ml-2 inline-flex min-h-11 cursor-pointer items-center rounded-md px-2">
						Technical error
					</summary>
					<code className="bg-muted text-muted-foreground block overflow-x-auto rounded-md p-3 text-xs leading-5">
						{result.error?.message ?? 'The fixture script failed to load.'}
					</code>
				</details>
			)}
		</section>
	);
};
export const IntegrationStatesDemo = () => (
	<ConsentManagerProvider options={providerOptions}>
		<Tabs
			defaultValue="loading"
			className="gap-6"
		>
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
