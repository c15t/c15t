/**
 * The fixture's own controls: the harness that drives the SDK, and the receipts it
 * leaves behind.
 *
 * These buttons are named after the method each one calls, not after a consent
 * surface. The banner next to them says `Accept All` because that is the served
 * label a subject reads; a button here says `acceptAll()` because it is a call into
 * the package, and a reader who sees both on one screen should know which is which.
 * The same calls answer to the demo links listed below them, so a step written at a
 * shell and a step done with a thumb drive the same code path.
 */

import { useConsentActions } from '@c15t/react-native';
import { useState } from 'react';

import { useConsentSource } from '../c15t/consent-source';
import type { FakeLogEntry, PermissionSample } from '../c15t/fake-native';
import type { DemoLinks } from '../deep-links/use-deep-links';
import { DEMO_VERB_LINES } from '../deep-links/verbs';
import { Button, ButtonGrid, Card, Flag, Hint, Mono, Row, Toggle } from './ui';

/** Clock time with milliseconds, the resolution the samples are taken at. */
const time = (at: number): string =>
	at === 0 ? 'never' : new Date(at).toISOString().slice(11, 23);

/** Region the override button cycles through, in order. */
const OVERRIDE_STEPS = [
	{ country: 'DE', label: 'DE' },
	{ country: 'US', label: 'US' },
	{ country: null, label: 'clear' },
] as const;

/** External id the identify call sends. */
const EXTERNAL_ID = 'runner-42';

/** The calls a subject's consent can be moved by, one button each. */
export const ActionsCard = ({
	onOpenDialog,
	onOpenPreferences,
}: {
	readonly onOpenDialog: () => void;
	readonly onOpenPreferences: () => void;
}) => {
	const actions = useConsentActions();
	const [busy, setBusy] = useState(false);
	const [lastResult, setLastResult] = useState('nothing yet');
	const [overrideStep, setOverrideStep] = useState(0);

	const run = (label: string, work: () => Promise<unknown>): void => {
		if (busy) {
			return;
		}

		setBusy(true);

		// The busy flag has to clear whichever way this lands, and the fixture has to
		// print a failure rather than throw into the button's press handler.
		void (async () => {
			try {
				const result = await work();

				setLastResult(
					typeof result === 'object' && result !== null
						? `${label} -> ${JSON.stringify(result)}`
						: `${label} -> done`
				);
			} catch (error: unknown) {
				setLastResult(
					`${label} threw: ${error instanceof Error ? error.message : String(error)}`
				);
			}

			// Nothing below the catch can throw, so this is the only exit left.
			setBusy(false);
		})();
	};

	return (
		<Card title="Harness calls">
			<ButtonGrid>
				<Button
					busy={busy}
					label="acceptAll()"
					onPress={() => {
						run('acceptAll', actions.acceptAll);
					}}
					variant="secondary"
				/>
				<Button
					busy={busy}
					label="rejectAll()"
					onPress={() => {
						run('rejectAll', actions.rejectAll);
					}}
					variant="secondary"
				/>
				<Button
					busy={busy}
					label="save({ experience: true, marketing: false })"
					onPress={() => {
						run('save', () =>
							actions.save({ experience: true, marketing: false })
						);
					}}
					variant="secondary"
				/>
				<Button
					busy={busy}
					label={`identify('${EXTERNAL_ID}')`}
					onPress={() => {
						run('identify', () => actions.identify(EXTERNAL_ID));
					}}
					variant="secondary"
				/>
				<Button
					busy={busy}
					label="logout()"
					onPress={() => {
						run('logout', actions.logout);
					}}
					variant="secondary"
				/>
				<Button
					busy={busy}
					label="refresh()"
					onPress={() => {
						run('refresh', actions.refresh);
					}}
					variant="secondary"
				/>
				<Button
					busy={busy}
					label={`setOverrides({ country: ${OVERRIDE_STEPS[overrideStep]?.label ?? 'null'} })`}
					onPress={() => {
						const step = OVERRIDE_STEPS[overrideStep] ?? OVERRIDE_STEPS[0];
						setOverrideStep((index) => (index + 1) % OVERRIDE_STEPS.length);
						run('setOverrides', () =>
							actions.setOverrides({ country: step.country })
						);
					}}
					variant="secondary"
				/>
				<Button
					label="dismissNotice()"
					onPress={() => {
						actions.dismissNotice();
						setLastResult('dismissNotice -> local, nothing sent');
					}}
					variant="secondary"
				/>
				<Button
					label="open ConsentDialog"
					onPress={onOpenDialog}
					variant="secondary"
				/>
				<Button
					label="open ConsentPreferences"
					onPress={onOpenPreferences}
					variant="secondary"
				/>
			</ButtonGrid>
			<Hint>Last: {lastResult}</Hint>
		</Card>
	);
};

/** The verbs a link can call, and the ones this run called. */
export const DeepLinkCard = ({ links }: { readonly links: DemoLinks }) => (
	<Card title="Demo links">
		<Row
			label="last link"
			value={<Mono>{links.url}</Mono>}
		/>
		<Row
			label="answered"
			value={<Mono>{links.receipt}</Mono>}
		/>
		{links.receipts.slice(1).map((entry) => (
			<Hint key={`${String(entry.at)}-${entry.url}`}>
				{`${time(entry.at)} ${entry.url} -> ${entry.receipt}`}
			</Hint>
		))}
		<Hint>
			{DEMO_VERB_LINES.map((line) => `c15t-demo://${line}`).join('\n')}
		</Hint>
	</Card>
);

/** Sampler readings, the timer-driven view of the same permissions. */
const SamplerCard = ({
	log,
	samples,
}: {
	readonly log: readonly FakeLogEntry[];
	readonly samples: readonly PermissionSample[];
}) => (
	<Card title="Fake core samples and log">
		{samples.length === 0 ? (
			<Hint>No samples yet.</Hint>
		) : (
			samples.map((sample) => (
				<Row
					key={`${String(sample.at)}-${String(sample.revision)}`}
					label={`${time(sample.at)} rev ${String(sample.revision)}`}
					value={
						<Mono>
							{`f:${Number(sample.allowed.functionality)} e:${Number(sample.allowed.experience)} m:${Number(sample.allowed.measurement)} k:${Number(sample.allowed.marketing)}`}
						</Mono>
					}
				/>
			))
		)}
		{log.slice(0, 10).map((entry, index) => (
			<Hint key={`${String(entry.at)}-${String(index)}`}>
				{`${time(entry.at)} ${entry.text}`}
			</Hint>
		))}
	</Card>
);

/** Controls for the fake core, absent when the real one is loaded. */
export const FakeCoreCard = () => {
	const { fake, restart } = useConsentSource();
	const [, setTick] = useState(0);

	if (fake === null) {
		return null;
	}

	const bump = (): void => {
		setTick((value) => value + 1);
	};

	return (
		<>
			<Card title="Fake core">
				<Toggle
					label="Online"
					onValueChange={(value) => {
						fake.setOnline(value);
						bump();
					}}
					value={fake.isOnline}
				/>
				<Toggle
					label="Permission drift timer"
					onValueChange={(value) => {
						fake.setDriftEnabled(value);
						bump();
					}}
					value={fake.isDriftEnabled}
				/>
				<Row
					label="Queued payloads"
					value={String(fake.pendingCount)}
				/>
				<Row
					label="Stored envelope"
					value={<Flag value={fake.hasStoredSnapshot} />}
				/>
				<ButtonGrid>
					<Button
						label="restart the client"
						onPress={() => {
							restart();
						}}
						variant="secondary"
					/>
					<Button
						label="wipe storage (uninstall)"
						onPress={() => {
							fake.resetStorage();
							restart();
						}}
						variant="secondary"
					/>
				</ButtonGrid>
				<Hint>
					Storage here lives in JavaScript for as long as the bundle runs. To
					check the real Keychain and encrypted-store behaviour, kill the app
					and relaunch it instead of using this button.
				</Hint>
			</Card>
			<SamplerCard
				log={fake.log}
				samples={fake.samples}
			/>
		</>
	);
};
