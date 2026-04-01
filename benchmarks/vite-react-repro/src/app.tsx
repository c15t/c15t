import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogTrigger,
	ConsentManagerProvider,
} from '@c15t/react';

export function App() {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'offline',
				disableAnimation: true,
			}}
		>
			<main className="app-shell">
				<div className="copy">
					<p className="eyebrow">Vite Repro</p>
					<h1>@c15t/react bundle inspection</h1>
					<p>
						This app intentionally imports the root `@c15t/react` entrypoint so
						the production bundle can be inspected with the Rollup visualizer.
					</p>
				</div>
				<ConsentBanner />
				<ConsentDialog />
				<ConsentDialogTrigger />
			</main>
		</ConsentManagerProvider>
	);
}
