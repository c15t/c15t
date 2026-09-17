/**
 * The main fixture screen: what the core says, and every action a subject can take.
 *
 * Read it as the headless surface laid out in one column. The snapshot card is
 * what `useConsent` returns, the permissions card is what `useIsAllowed` returns
 * per category, and the actions card calls one method of `useConsentActions` per
 * button, including the ones a consent UI normally hides behind a prompt.
 */

import {
	useConsent,
	useConsentActions,
	useC15tBootstrap,
} from '@c15t/react-native';
import { useState } from 'react';

import { config } from '../c15t/config';
import { useConsentSource } from '../c15t/consent-source';
import type { FakeLogEntry, PermissionSample } from '../c15t/fake-native';
import {
	GatedVendor,
	GatingHint,
	LifecycleCard,
	PermissionList,
} from '../components/gating';
import {
	Button,
	ButtonGrid,
	Card,
	Flag,
	Hint,
	Row,
	Screen,
	Text,
	Toggle,
} from '../components/ui';

/** External id the identify button sends. */
const EXTERNAL_ID = 'runner-42';

/** Region overrides the button cycles through, in order. */
const OVERRIDE_STEPS = [
	{ country: 'DE', label: 'Germany (EEA, opt-in)' },
	{ country: 'US', label: 'United States (opt-out)' },
	{ country: null, label: 'no override (backend detects)' },
] as const;

const time = (at: number): string =>
	at === 0 ? 'never' : new Date(at).toISOString().slice(11, 23);

type Snapshot = ReturnType<typeof useConsent>;

const promptLabel = (requirement: Snapshot['promptRequirement']): string =>
	'reason' in requirement
		? `${requirement.kind} (${requirement.reason})`
		: requirement.kind;

const subjectLabel = (snapshot: Snapshot): string => {
	if (snapshot.subject === null) {
		return 'none';
	}

	const id = snapshot.subject.subjectId ?? 'no id';

	return snapshot.subject.externalId === undefined
		? id
		: `${id} / ${snapshot.subject.externalId}`;
};

const locationLabel = (snapshot: Snapshot): string => {
	if (snapshot.location === null) {
		return 'none';
	}

	return [
		snapshot.location.countryCode ?? '?',
		snapshot.location.regionCode ?? '-',
	].join(' ');
};

const overrideLabel = (snapshot: Snapshot): string => {
	const { country, gpc, language, region } = snapshot.overrides;

	return [
		country ?? 'auto',
		region ?? '-',
		language,
		`gpc ${String(gpc ?? 'unset')}`,
	].join(' / ');
};

/** Actions card: one button per action, each reporting what came back. */
const ActionsCard = ({
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
						? `${label}: ${JSON.stringify(result)}`
						: `${label}: done`
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
		<Card title="Actions">
			<ButtonGrid>
				<Button
					busy={busy}
					label="Accept all"
					onPress={() => {
						run('acceptAll', actions.acceptAll);
					}}
				/>
				<Button
					busy={busy}
					label="Reject all"
					onPress={() => {
						run('rejectAll', actions.rejectAll);
					}}
				/>
				<Button
					busy={busy}
					label="Save custom"
					onPress={() => {
						run('save', () =>
							actions.save({ experience: true, marketing: false })
						);
					}}
				/>
				<Button
					busy={busy}
					label={`Identify ${EXTERNAL_ID}`}
					onPress={() => {
						run('identify', () => actions.identify(EXTERNAL_ID));
					}}
				/>
				<Button
					busy={busy}
					label="Logout"
					onPress={() => {
						run('logout', actions.logout);
					}}
				/>
				<Button
					busy={busy}
					label="Refresh"
					onPress={() => {
						run('refresh', actions.refresh);
					}}
				/>
				<Button
					busy={busy}
					label={`setOverrides: ${OVERRIDE_STEPS[overrideStep]?.label ?? 'cycle'}`}
					onPress={() => {
						const step = OVERRIDE_STEPS[overrideStep] ?? OVERRIDE_STEPS[0];
						setOverrideStep((index) => (index + 1) % OVERRIDE_STEPS.length);
						run('setOverrides', () =>
							actions.setOverrides({ country: step.country })
						);
					}}
				/>
				<Button
					busy={busy}
					label="Dismiss notice"
					onPress={() => {
						actions.dismissNotice();
						setLastResult('dismissNotice: local, nothing sent');
					}}
				/>
				<Button
					label="Open built-in dialog"
					onPress={onOpenDialog}
				/>
				<Button
					label="Open built-in preferences"
					onPress={onOpenPreferences}
				/>
			</ButtonGrid>
			<Hint>Last result: {lastResult}</Hint>
		</Card>
	);
};

/** Sampler readings, which is the timer-driven view of the same permissions. */
const SamplerCard = ({
	log,
	samples,
}: {
	readonly log: readonly FakeLogEntry[];
	readonly samples: readonly PermissionSample[];
}) => (
	<Card title="Fake core: samples and log">
		{samples.length === 0 ? (
			<Hint>No samples yet.</Hint>
		) : (
			samples.map((sample) => (
				<Row
					key={`${String(sample.at)}-${String(sample.revision)}`}
					label={`${time(sample.at)} rev ${String(sample.revision)}`}
					value={
						<Text>
							{`f:${Number(sample.allowed.functionality)} e:${Number(sample.allowed.experience)} m:${Number(sample.allowed.measurement)} k:${Number(sample.allowed.marketing)}`}
						</Text>
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
const FakeCoreCard = () => {
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
					value={<Text>{String(fake.pendingCount)}</Text>}
				/>
				<Row
					label="Stored envelope"
					value={<Flag value={fake.hasStoredSnapshot} />}
				/>
				<ButtonGrid>
					<Button
						label="Simulate cold start"
						onPress={() => {
							restart();
						}}
					/>
					<Button
						label="Wipe storage (uninstall)"
						onPress={() => {
							fake.resetStorage();
							restart();
						}}
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

/** The screen a runner lands on. */
export const HomeScreen = ({
	onOpenDialog,
	onOpenPreferences,
}: {
	readonly onOpenDialog: () => void;
	readonly onOpenPreferences: () => void;
}) => {
	const snapshot = useConsent();
	const bootstrap = useC15tBootstrap();
	const { kind } = useConsentSource();

	return (
		<Screen>
			<Card title="Core">
				<Row
					label="Consent core"
					value={
						<Text>
							{kind === 'native'
								? 'native (TurboModule)'
								: 'fake stub, not a device core'}
						</Text>
					}
				/>
				<Row
					label="Backend"
					value={<Text>{config.backendURL}</Text>}
				/>
				<Row
					label="Publishable key"
					value={<Text>{config.publicKey}</Text>}
				/>
			</Card>

			<Card title="Snapshot">
				<Row
					label="revision"
					value={<Text>{String(snapshot.revision)}</Text>}
				/>
				<Row
					label="ready"
					value={<Flag value={snapshot.ready} />}
				/>
				<Row
					label="policyPending"
					value={<Flag value={snapshot.policyPending} />}
				/>
				<Row
					label="model"
					value={<Text>{snapshot.model}</Text>}
				/>
				<Row
					label="activeUI"
					value={<Text>{snapshot.activeUI ?? 'null'}</Text>}
				/>
				<Row
					label="prompt"
					value={<Text>{promptLabel(snapshot.promptRequirement)}</Text>}
				/>
				<Row
					label="resolution"
					value={
						<Text>
							{`${snapshot.resolution.status} ${snapshot.resolution.policyId ?? 'no policy'}`}
						</Text>
					}
				/>
				<Row
					label="evaluatedAt"
					value={<Text>{time(snapshot.evaluatedAt)}</Text>}
				/>
				<Row
					label="subject"
					value={<Text>{subjectLabel(snapshot)}</Text>}
				/>
				<Row
					label="location"
					value={<Text>{locationLabel(snapshot)}</Text>}
				/>
				<Row
					label="overrides"
					value={<Text>{overrideLabel(snapshot)}</Text>}
				/>
				<Row
					label="gpc"
					value={
						<Text>
							{`detected ${String(snapshot.privacySignals.gpc.detected)}, override ${String(snapshot.privacySignals.gpc.override)}, active ${String(snapshot.privacySignals.gpc.active)}`}
						</Text>
					}
				/>
				{snapshot.error === null ? null : (
					<Hint>
						{`error ${snapshot.error.code}: ${snapshot.error.message}`}
					</Hint>
				)}
			</Card>

			<Card title="Handshake">
				<Row
					label="protocol"
					value={
						<Text>
							{`${String(bootstrap.protocolVersion)} (${String(bootstrap.minSupportedProtocolVersion)}-${String(bootstrap.maxSupportedProtocolVersion)} native)`}
						</Text>
					}
				/>
				<Row
					label="native SDK"
					value={<Text>{bootstrap.nativeSdkVersion}</Text>}
				/>
				<Row
					label="stored snapshot"
					value={<Flag value={bootstrap.hasStoredSnapshot} />}
				/>
			</Card>

			<Card title="Effective permissions">
				<PermissionList />
				<GatingHint />
			</Card>

			<Card title="Gated loading">
				<GatedVendor category="measurement" />
				<GatedVendor category="marketing" />
			</Card>

			<LifecycleCard />

			<ActionsCard
				onOpenDialog={onOpenDialog}
				onOpenPreferences={onOpenPreferences}
			/>

			<FakeCoreCard />
		</Screen>
	);
};
