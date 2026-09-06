import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogTrigger,
	ConsentProvider,
	offline,
} from '@c15t/react';

export const App = () => (
	<ConsentProvider
		options={{
			disableAnimation: true,
			mode: offline(),
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
	</ConsentProvider>
);
