/**
 * Apple's tracking journey, driven by one hook.
 *
 * `useTrackingRequest` runs the whole flow: Apple's sheet, the preference centre when
 * the subject taps Additional Information, and a trip back to Apple only while a
 * category the request stands for is still granted. Nothing on this screen listens for
 * native events, branches on the arm to decide what comes next, or saves consent on
 * the strength of an Apple yes. That absence is the thing worth checking here.
 *
 * The hook is called by the shell and handed down, because the `ConsentPreferences` it
 * feeds has to outlive the tab this card sits on.
 */

import type {
	TrackingRequest,
	TrackingRequestPayload,
} from '@c15t/react-native';
import { useIsTrackingAllowed } from '@c15t/react-native';
import { useState } from 'react';

import { Button, Card, Flag, Hint, Row, Text } from './ui';

/** What one finished journey reported, in the words the bridge used. */
const outcomeText = (outcome: TrackingRequestPayload): string =>
	JSON.stringify(outcome);

/** The arm, the in-flight flag, and the one button that starts the journey. */
export const TrackingCard = ({
	tracking,
}: {
	readonly tracking: TrackingRequest;
}) => {
	const allowed = useIsTrackingAllowed('marketing');
	const [outcome, setOutcome] = useState('not asked yet');

	const ask = (): void => {
		// The same shape as the harness buttons: a build with no platform gate rejects,
		// and the screen prints that rather than throwing into the press handler.
		void (async () => {
			try {
				setOutcome(outcomeText(await tracking.request()));
			} catch (error: unknown) {
				setOutcome(
					`threw: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		})();
	};

	return (
		<Card title="Tracking request">
			<Row
				label="authorization"
				value={<Text>{tracking.authorization}</Text>}
			/>
			<Row
				label="pending"
				value={<Flag value={tracking.pending} />}
			/>
			<Row
				label="marketing runs"
				value={<Flag value={allowed} />}
			/>
			<Button
				busy={tracking.pending}
				label="tracking.request()"
				onPress={ask}
			/>
			<Hint>Last journey: {outcome}</Hint>
			<Hint>
				`authorization` is the platform arm, never a consent decision.
				`marketing runs` is what `useIsTrackingAllowed` says, and that wants the
				c15t answer too, so an Apple yes on its own changes nothing here.
				Against the fake core, and on Android, the request rejects with
				`C15T_TRACKING_UNSUPPORTED`: there is no platform sheet to show.
			</Hint>
		</Card>
	);
};
