/**
 * The screen the app opens on: what this app may use, and the one thing to do about
 * it.
 *
 * It is a plain app screen on purpose. The prompt is the banner's job and the
 * per-category switches are the sheet's job, so this screen keeps the standing answer
 * and the entry point back to the sheet, which is what a person returns to an app
 * for. The ads card is the one control here that asks the platform rather than the
 * core. Every diagnostic read lives on the Diagnostics tab.
 */

import type { AllConsentNames, TrackingRequest } from '@c15t/react-native';
import { useConsent, useIsAllowed } from '@c15t/react-native';
import { View } from 'react-native';

import { TrackingCard } from '../components/tracking';
import {
	Badge,
	Button,
	Card,
	Heading,
	Screen,
	TextLink,
	Text,
	useHostStyles,
} from '../components/ui';
import { IAB_DEMO_DISPLAY_MODEL } from '../fixtures/iab-display-model';
import {
	categoryTitle,
	partnersLabel,
	preferencesLabel,
} from '../surface-copy';

/** The categories a subject decides on, in the order the policy lists them. */
const CHOICES = [
	'necessary',
	'experience',
	'functionality',
	'measurement',
	'marketing',
] as const;

/** The pill a category earns, spelled the way a person reads a settings screen. */
const stateLabel = (category: AllConsentNames, allowed: boolean): string => {
	if (category === 'necessary') {
		return 'Always';
	}

	return allowed ? 'On' : 'Off';
};

/** One category: its name from the served bundle, its state from the core. */
const CategoryLine = ({ category }: { readonly category: AllConsentNames }) => {
	const snapshot = useConsent();
	const allowed = useIsAllowed(category);
	const { theme } = useHostStyles();
	const { spacing } = theme;

	return (
		<View
			style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.m }}
		>
			<Text>{categoryTitle(snapshot, category)}</Text>
			<View style={{ marginLeft: 'auto' }}>
				<Badge
					label={stateLabel(category, allowed)}
					tone={allowed ? 'accent' : 'neutral'}
				/>
			</View>
		</View>
	);
};

/** The one line that says whether what is on screen is stored state or a live answer. */
const statusLabel = (snapshot: ReturnType<typeof useConsent>): string => {
	if (!snapshot.ready) {
		return 'Loading stored consent';
	}

	return snapshot.policyPending
		? 'Waiting on the policy'
		: `Revision ${String(snapshot.revision)}`;
};

/** The privacy screen itself. */
export const PrivacyScreen = ({
	onOpenIabDrawer,
	onOpenPreferences,
	tracking,
}: {
	readonly onOpenIabDrawer: () => void;
	readonly onOpenPreferences: () => void;
	readonly tracking: TrackingRequest;
}) => {
	const snapshot = useConsent();
	const { theme } = useHostStyles();
	const { spacing } = theme;
	const granted = CHOICES.filter(
		(category) =>
			category !== 'necessary' && snapshot.effectivePermissions[category]
	);

	return (
		<Screen>
			<View style={{ gap: spacing.xs }}>
				<Heading>Privacy</Heading>
				<Text muted>
					{granted.length === 0
						? 'Only what the app needs to run is switched on.'
						: `Switched on: ${granted.map((category) => categoryTitle(snapshot, category)).join(', ')}.`}
				</Text>
			</View>

			<Button
				label={preferencesLabel(snapshot)}
				onPress={onOpenPreferences}
			/>

			{/*
			 * The web puts this link inside the banner's own sentence and uses it to
			 * open the IAB panel straight on the partner list. This app has no banner of
			 * its own -- the prompt is the package's -- so the link sits beside the
			 * entry point to the preference centre instead, and does the same job.
			 */}
			<TextLink
				onPress={() => {
					onOpenIabDrawer();
				}}
			>
				{partnersLabel(IAB_DEMO_DISPLAY_MODEL.vendorTabCount)}
			</TextLink>

			<Card title="What this app uses">
				{CHOICES.map((category) => (
					<CategoryLine
						category={category}
						key={category}
					/>
				))}
			</Card>

			<TrackingCard tracking={tracking} />

			<Badge label={statusLabel(snapshot)} />
		</Screen>
	);
};
