/**
 * The preferences screen: what the subject already decided, and the built-in
 * centre that lets them change it at any time.
 *
 * `ConsentPreferences` is the same category list the dialog shows, except it does
 * not wait for a policy to owe an interaction. This screen exists to prove that:
 * it is reachable with no prompt outstanding, and closing it without saving
 * writes nothing.
 */

import { useConsent } from '@c15t/react-native';

import { OPTIONAL_CATEGORIES } from '../c15t/fake-native';
import type { OptionalCategory } from '../c15t/fake-native';
import {
	Button,
	ButtonGrid,
	Card,
	Flag,
	Hint,
	Row,
	Screen,
	Text,
} from '../components/ui';

const formatWhen = (at: number): string =>
	new Date(at).toISOString().slice(0, 16);

/** One receipt line per category the subject has actually touched. */
const ReceiptLine = ({ category }: { readonly category: OptionalCategory }) => {
	const snapshot = useConsent();
	const decision = snapshot.explicitChoice?.categories[category];

	if (decision === undefined) {
		return (
			<Row
				label={category}
				value={<Text muted>no receipt: the policy default applies</Text>}
			/>
		);
	}

	return (
		<Row
			label={category}
			value={
				<>
					<Flag value={decision.value} />
					<Text muted>{`  ${formatWhen(decision.confirmedAt)}`}</Text>
				</>
			}
		/>
	);
};

/** The screen itself. */
export const PreferencesScreen = ({
	onOpenCentre,
}: {
	readonly onOpenCentre: () => void;
}) => {
	const snapshot = useConsent();
	const restrictions = Object.entries(snapshot.restrictions);

	return (
		<Screen>
			<Card title="Preference centre">
				<Hint>
					Opens the built-in centre. It is not gated on a prompt, so it works
					after the subject has already answered, which is where a revision
					normally comes from.
				</Hint>
				<ButtonGrid>
					<Button
						label="Open ConsentPreferences"
						onPress={onOpenCentre}
					/>
				</ButtonGrid>
			</Card>

			<Card title="Receipts">
				{OPTIONAL_CATEGORIES.map((category) => (
					<ReceiptLine
						category={category}
						key={category}
					/>
				))}
				<Hint>
					A category with no receipt was never shown to the subject, so a save
					from here does not renew it.
				</Hint>
			</Card>

			<Card title="Policy context">
				<Row
					label="model"
					value={<Text>{snapshot.model}</Text>}
				/>
				<Row
					label="policy id"
					value={<Text>{snapshot.resolution.policyId ?? 'none'}</Text>}
				/>
				<Row
					label="fingerprint"
					value={<Text>{snapshot.resolution.fingerprint ?? 'none'}</Text>}
				/>
				<Row
					label="scope"
					value={
						<Text>
							{snapshot.consentCategories === null
								? 'full policy scope'
								: snapshot.consentCategories.join(', ')}
						</Text>
					}
				/>
				<Row
					label="language"
					value={
						<Text>{snapshot.translations?.language ?? 'no bundle served'}</Text>
					}
				/>
				<Row
					label="next deadline"
					value={
						<Text>
							{snapshot.nextDeadline === null
								? 'none'
								: formatWhen(snapshot.nextDeadline)}
						</Text>
					}
				/>
			</Card>

			<Card title="Restrictions">
				{restrictions.length === 0 ? (
					<Hint>No category is restricted right now.</Hint>
				) : (
					restrictions.map(([category, reasons]) => (
						<Row
							key={category}
							label={category}
							value={<Text>{reasons.join(', ')}</Text>}
						/>
					))
				)}
				<Hint>
					A restriction denies a category whatever the subject granted, and says
					why.
				</Hint>
			</Card>
		</Screen>
	);
};
