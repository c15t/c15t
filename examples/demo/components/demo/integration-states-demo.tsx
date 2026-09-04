'use client';

import { ConsentProvider, Frame, offline } from 'c15t/react';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

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

const LoadingState = () => {
	const [attempt, setAttempt] = useState(0);

	return (
		<section className="space-y-5">
			<StateIntroduction
				description="The iframe is mounted only after consent. Its local response is delayed by eight seconds so the reserved frame can be inspected."
				status="Loading → ready"
				title="Consent-gated iframe"
			>
				<Button
					onClick={() => setAttempt((value) => value + 1)}
					size="sm"
					variant="outline"
				>
					<RotateCcw aria-hidden />
					Restart load
				</Button>
			</StateIntroduction>

			<Frame category="necessary">
				<iframe
					className="aspect-video w-full rounded-lg"
					sandbox="allow-scripts"
					src={`/api/integration-fixture?fixture=iframe&delay=8000&attempt=${attempt}`}
					title="Delayed iframe loading fixture"
				/>
			</Frame>
		</section>
	);
};

const BlockedState = () => (
	<section className="space-y-5">
		<StateIntroduction
			description="Frame leaves the third-party child unmounted until marketing consent is granted and renders its accessible placeholder in the meantime."
			status="Blocked"
			title="Consent placeholder"
		/>
		<Frame category="marketing">
			<iframe
				className="aspect-video w-full rounded-lg"
				sandbox="allow-presentation allow-scripts"
				src="https://www.youtube-nocookie.com/embed/gwqYfNWVPpk"
				title="Marketing consent-gated video"
			/>
		</Frame>
	</section>
);

export const IntegrationStatesDemo = () => (
	<ConsentProvider
		options={{
			consentCategories: ['necessary', 'measurement', 'marketing'],
			mode: offline(),
		}}
	>
		<Tabs
			defaultValue="loading"
			className="gap-6"
		>
			<TabsList
				aria-label="Integration state to inspect"
				className="h-auto max-w-full flex-wrap justify-start"
			>
				<TabsTrigger value="loading">Loading</TabsTrigger>
				<TabsTrigger value="blocked">Blocked</TabsTrigger>
			</TabsList>

			<TabsContent value="loading">
				<LoadingState />
			</TabsContent>
			<TabsContent value="blocked">
				<BlockedState />
			</TabsContent>
		</Tabs>
	</ConsentProvider>
);
