/**
 * Personalised ads, and the Apple request that unlocks them.
 *
 * One hook drives the whole flow. Apple shows its sheet, the preference centre opens
 * when the subject taps Additional Information, and Apple is asked again only while a
 * category the request stands for is still granted. This screen writes none of that,
 * which is why there is no native event listener anywhere near it.
 *
 * The hook is called by the shell and handed down, because the `ConsentPreferences` it
 * opens has to outlive a trip to the Diagnostics tab.
 */

import type {
	TrackingAuthorization,
	TrackingRequest,
} from '@c15t/react-native';
import { useIsTrackingAllowed } from '@c15t/react-native';
import { useState } from 'react';
import { Platform } from 'react-native';

import { Badge, Button, Card, Hint, Text } from './ui';

/**
 * The `unsupported` explanation, which cannot be one string.
 *
 * The core answers `unsupported` for two different builds: Android, where no Apple gate
 * exists at all, and an iOS binary that ships without the usage description. Naming the
 * plist key to an Android reader invents a fix for a thing that is not broken, so the
 * screen says which of the two it is standing in.
 */
const UNSUPPORTED_LINE =
	Platform.OS === 'ios'
		? 'No Apple prompt in this build. iOS wants NSUserTrackingUsageDescription.'
		: 'No Apple prompt exists on this platform, so Marketing alone decides.';

/** What each arm of the platform answer means, in settings-screen words. */
const APPLE_LINES: Record<TrackingAuthorization, string> = {
	authorized: 'Apple already let this app ask. Ads still wait for Marketing.',
	denied: 'Apple will not ask again, so iOS Settings decides from here.',
	'not-determined': 'This build can ask Apple once.',
	restricted: 'A parent or a device policy decides this one, not the app.',
	unsupported: UNSUPPORTED_LINE,
};

/** The card: what Apple says, what the core says, and the one button. */
export const TrackingCard = ({
	tracking,
}: {
	readonly tracking: TrackingRequest;
}) => {
	const allowed = useIsTrackingAllowed('marketing');
	const [outcome, setOutcome] = useState<string | null>(null);

	const ask = (): void => {
		// A binary with no platform gate rejects rather than hanging, and the screen
		// prints that instead of throwing into the press handler.
		void (async () => {
			try {
				const payload = await tracking.request();

				setOutcome(
					`${payload.status} / ${payload.stage} / ${payload.presentation ?? 'no call'}`
				);
			} catch (error: unknown) {
				setOutcome(
					`threw: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		})();
	};

	return (
		<Card title="Personalised ads">
			<Text muted>
				{allowed
					? 'Ads can use your device identifier.'
					: 'Ads stay generic until both Apple and this app say yes.'}
			</Text>
			<Badge
				label={allowed ? 'On' : 'Off'}
				tone={allowed ? 'accent' : 'neutral'}
			/>
			<Button
				busy={tracking.pending}
				label="Use personalised ads"
				onPress={ask}
			/>
			<Hint>{APPLE_LINES[tracking.authorization]}</Hint>
			{outcome === null ? null : <Hint>Last request: {outcome}</Hint>}
			<Hint>
				Apple decides what the device identifier is worth. Whether this app uses
				it for ads is the Marketing choice, and one never sets the other.
			</Hint>
		</Card>
	);
};
