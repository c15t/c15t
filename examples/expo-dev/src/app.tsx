/**
 * The shell: two tabs, the built-in surfaces, and the fake-core notice.
 *
 * The banner, the dialog, and the preference centre are mounted here rather than
 * inside a tab. The banner decides for itself whether a prompt is owed and unmounts
 * once the subject has acted, so it has to outlive whichever tab is on screen.
 */

import {
	ConsentBanner,
	ConsentDialog,
	ConsentPreferences,
	useTrackingRequest,
} from '@c15t/react-native';
import { Component, useState } from 'react';
import type { ReactNode } from 'react';
import { Text as NativeText, View } from 'react-native';

import { useConsentSource } from './c15t/consent-source';
import { Button, Card, Hint, Screen } from './components/ui';
import { HomeScreen } from './screens/home';
import { PreferencesScreen } from './screens/preferences';

const TABS = ['home', 'preferences'] as const;
type Tab = (typeof TABS)[number];

/**
 * The categories this app's tracking request stands for.
 *
 * The journey returns to Apple after the preference centre closes only while one of
 * these is granted, so a subject who refuses both is finished without a second sheet.
 * A module constant rather than a literal, because the hook keys its callbacks to it.
 */
const TRACKING_CATEGORIES = ['measurement', 'marketing'] as const;

const shellStyles = {
	banner: {
		backgroundColor: '#5c0000',
		padding: 10,
	},
	bannerText: { color: '#ffffff', fontSize: 12 },
	root: { backgroundColor: '#ffffff', flex: 1 },
	tabs: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
} as const;

/** Catch-all so a bridge failure reads as a message instead of a red box. */
class ErrorBoundary extends Component<
	{ readonly children: ReactNode },
	{ readonly error: Error | null }
> {
	public constructor(props: { readonly children: ReactNode }) {
		super(props);
		this.state = { error: null };
	}

	public static getDerivedStateFromError(error: Error): {
		readonly error: Error;
	} {
		return { error };
	}

	public render(): ReactNode {
		if (this.state.error === null) {
			return this.props.children;
		}

		return (
			<Screen>
				<Card title="The SDK stopped the app">
					<NativeText
						selectable
						style={{ fontSize: 13 }}
					>
						{this.state.error.message}
					</NativeText>
					<Hint>
						`C15tProvider` throws on purpose when the binary cannot speak the
						protocol this bundle expects. Rebuild the app, or install the
						@c15t/react-native version that shipped with the binary.
					</Hint>
				</Card>
			</Screen>
		);
	}
}

/** Shown when the binary has no c15t module, which is a build fact. */
const MissingNativeCore = () => {
	const { enableFake, nativeError } = useConsentSource();

	return (
		<Screen>
			<Card title="No native consent core in this binary">
				<NativeText
					selectable
					style={{ fontSize: 13 }}
				>
					{nativeError?.message ?? 'The c15t TurboModule is not registered.'}
				</NativeText>
				<Hint>
					Rebuild after installing @c15t/react-native. On iOS run pod install
					and build again; on Android clean and rebuild. The fake core below is
					a fixture, not a substitute for that.
				</Hint>
				<Button
					label="Continue with the fake core"
					onPress={enableFake}
				/>
			</Card>
		</Screen>
	);
};

/** The app, once a core is attached. */
export const App = () => {
	const { kind } = useConsentSource();
	const [tab, setTab] = useState<Tab>('home');
	const [dialogOpen, setDialogOpen] = useState(false);
	const [preferencesOpen, setPreferencesOpen] = useState(false);

	// One hook, one call, and the Apple flow is driven from there: the sheet, the
	// centre when the subject taps Additional Information, and the sheet again only
	// while a category the request stands for is still granted. It is called here
	// because the centre it opens has to outlive whichever tab its button is on, for
	// the same reason the banner does. The app's own centre is handed in as the hook's
	// `preferences`, so the card the subject opens is the one Apple's button raises.
	const tracking = useTrackingRequest({
		categories: TRACKING_CATEGORIES,
		preferences: {
			onRequestClose: () => {
				setPreferencesOpen(false);
			},
			open: preferencesOpen,
		},
	});

	return (
		<View style={shellStyles.root}>
			{kind === 'fake' ? (
				<View style={shellStyles.banner}>
					<NativeText style={shellStyles.bannerText}>
						FIXTURE: fake native core. Nothing here proves the Swift or Kotlin
						kernel.
					</NativeText>
				</View>
			) : null}

			<View style={shellStyles.tabs}>
				{TABS.map((value) => (
					<Button
						key={value}
						label={value === 'home' ? 'Consent' : 'Preferences'}
						onPress={() => {
							setTab(value);
						}}
					/>
				))}
			</View>

			<ErrorBoundary>
				{tab === 'home' ? (
					<HomeScreen
						onOpenDialog={() => {
							setDialogOpen(true);
						}}
						onOpenPreferences={() => {
							setPreferencesOpen(true);
						}}
						tracking={tracking}
					/>
				) : (
					<PreferencesScreen
						onOpenCentre={() => {
							setPreferencesOpen(true);
						}}
					/>
				)}
			</ErrorBoundary>

			<ConsentBanner
				onCustomize={() => {
					setPreferencesOpen(true);
				}}
			/>
			<ConsentDialog
				onOpenPreferences={() => {
					setDialogOpen(false);
					setPreferencesOpen(true);
				}}
				onRequestClose={() => {
					setDialogOpen(false);
				}}
				open={dialogOpen}
			/>
			{/*
			 * One centre doing both jobs: the subject opens it from either tab, and it is
			 * the same card the tracking journey raises mid-request.
			 */}
			<ConsentPreferences {...tracking.preferences} />
		</View>
	);
};

/** Exported for the missing-module case, which cannot render the normal shell. */
export const UnavailableScreen = MissingNativeCore;
