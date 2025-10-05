/**
 * @fileoverview Example usage of c15t analytics integration
 *
 * This file demonstrates how to use the new analytics functionality
 * integrated into c15t core and React packages.
 */

import {
	ConsentManagerProvider,
	PageTracker,
	useAnalyticsState,
	useIdentify,
	usePage,
	useTrack,
} from '../index';

/**
 * Example component that tracks user interactions
 */
function TrackingExample() {
	const track = useTrack();
	const page = usePage();
	const identify = useIdentify();
	const state = useAnalyticsState();

	const handleButtonClick = async () => {
		await track({
			name: 'button_clicked',
			properties: {
				button: 'example_cta',
				page: '/example',
			},
		});
	};

	const handlePageView = async () => {
		await page({
			name: 'Example Page',
			properties: {
				section: 'demo',
				category: 'analytics',
			},
		});
	};

	const handleUserLogin = async () => {
		await identify({
			userId: 'user-123',
			traits: {
				email: 'user@example.com',
				plan: 'premium',
				signupDate: '2024-01-01',
			},
		});
	};

	return (
		<div>
			<h2>Analytics Example</h2>

			<div>
				<h3>Current State</h3>
				<p>Loaded: {state.loaded ? 'Yes' : 'No'}</p>
				<p>User ID: {state.userId || 'Anonymous'}</p>
				<p>Consent: {JSON.stringify(state.consent, null, 2)}</p>
			</div>

			<div>
				<h3>Actions</h3>
				<button type="button" onClick={handleButtonClick}>
					Track Button Click
				</button>
				<button type="button" onClick={handlePageView}>
					Track Page View
				</button>
				<button type="button" onClick={handleUserLogin}>
					Identify User
				</button>
			</div>
		</div>
	);
}

/**
 * Main app component with both consent and analytics providers
 */
function App() {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'offline',
				consentCategories: [
					'necessary',
					'measurement',
					'marketing',
					'functionality',
					'experience',
				],
				store: {
					analytics: {
						uploadUrl: '/api/analytics',
						debug: true,
						debounceInterval: 300,
						offlineQueue: true,
					},
				},
			}}
		>
			{/* Automatic page tracking */}
			<PageTracker
				enabled
				trackOnMount
				properties={{
					app: 'example',
					version: '1.0.0',
				}}
			/>

			<TrackingExample />
		</ConsentManagerProvider>
	);
}

export default App;
