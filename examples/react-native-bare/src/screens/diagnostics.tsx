/**
 * What the native core says, kept off the happy path.
 *
 * Every read here is worth having: the snapshot is what `useConsent` returns, the
 * permission lines are what `useIsAllowed` returns per category, and the handshake is
 * what the bridge reported at startup. None of it belongs on the screen a first-time
 * viewer opens, so it lives behind a tab that starts closed, and the app looks like an
 * app until someone asks what the kernel thinks.
 */

import { useConsent, useC15tBootstrap } from '@c15t/react-native';

import { config } from '../c15t/config';
import { useConsentSource } from '../c15t/consent-source';
import {
	GatedVendor,
	GatingHint,
	LifecycleCard,
	PermissionList,
} from '../components/gating';
import { ActionsCard, DeepLinkCard, FakeCoreCard } from '../components/harness';
import { Badge, Card, Flag, Hint, Row, Screen, Text } from '../components/ui';
import type { DemoLinks } from '../deep-links/use-deep-links';

/** Clock time with milliseconds. */
const time = (at: number): string =>
	at === 0 ? 'never' : new Date(at).toISOString().slice(11, 23);

/** Timestamp down to the minute, which is as fine as a deadline is read. */
const when = (at: number): string => new Date(at).toISOString().slice(0, 16);

type Snapshot = ReturnType<typeof useConsent>;

/** The prompt requirement, with its reason when it carries one. */
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

const locationLabel = (snapshot: Snapshot): string =>
	snapshot.location === null
		? 'none'
		: [
				snapshot.location.countryCode ?? '?',
				snapshot.location.regionCode ?? '-',
			].join(' ');

const overrideLabel = (snapshot: Snapshot): string => {
	const { country, gpc, language, region } = snapshot.overrides;

	return [
		country ?? 'auto',
		region ?? '-',
		language,
		`gpc ${String(gpc ?? 'unset')}`,
	].join(' / ');
};

/** The strip that keeps a fake-core run from being read as a device run. */
const FakeCoreNotice = () => {
	const { kind } = useConsentSource();

	if (kind !== 'fake') {
		return null;
	}

	return (
		<Badge
			label="Fake core: nothing here proves the Swift or Kotlin kernel"
			tone="danger"
		/>
	);
};

/** Which core is behind the hooks, and what it was pointed at. */
const CoreCard = () => {
	const { kind } = useConsentSource();

	return (
		<Card title="Core">
			<Row
				label="Consent core"
				value={
					kind === 'native'
						? 'native (TurboModule)'
						: 'fake stub, not a device core'
				}
			/>
			<Row
				label="Backend"
				value={config.backendURL}
			/>
		</Card>
	);
};

/** Everything `useConsent` returns. */
const SnapshotCard = () => {
	const snapshot = useConsent();

	return (
		<Card title="Snapshot">
			<Row
				label="revision"
				value={String(snapshot.revision)}
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
				value={snapshot.model}
			/>
			<Row
				label="activeUI"
				value={snapshot.activeUI ?? 'null'}
			/>
			<Row
				label="prompt"
				value={promptLabel(snapshot.promptRequirement)}
			/>
			<Row
				label="resolution"
				value={`${snapshot.resolution.status} ${snapshot.resolution.policyId ?? 'no policy'}`}
			/>
			<Row
				label="evaluatedAt"
				value={time(snapshot.evaluatedAt)}
			/>
			<Row
				label="subject"
				value={subjectLabel(snapshot)}
			/>
			<Row
				label="location"
				value={locationLabel(snapshot)}
			/>
			<Row
				label="overrides"
				value={overrideLabel(snapshot)}
			/>
			<Row
				label="gpc"
				value={`detected ${String(snapshot.privacySignals.gpc.detected)}, override ${String(
					snapshot.privacySignals.gpc.override
				)}, active ${String(snapshot.privacySignals.gpc.active)}`}
			/>
			{snapshot.error === null ? null : (
				<Hint>{`error ${snapshot.error.code}: ${snapshot.error.message}`}</Hint>
			)}
		</Card>
	);
};

/** What the bridge reported when the app attached. */
const HandshakeCard = () => {
	const bootstrap = useC15tBootstrap();

	return (
		<Card title="Handshake">
			<Row
				label="protocol"
				value={`${String(bootstrap.protocolVersion)} (${String(
					bootstrap.minSupportedProtocolVersion
				)}-${String(bootstrap.maxSupportedProtocolVersion)} native)`}
			/>
			<Row
				label="native SDK"
				value={bootstrap.nativeSdkVersion}
			/>
			<Row
				label="stored snapshot"
				value={<Flag value={bootstrap.hasStoredSnapshot} />}
			/>
		</Card>
	);
};

/** The receipts a subject has actually left behind. */
const ReceiptsCard = () => {
	const snapshot = useConsent();
	const categories = [
		'experience',
		'functionality',
		'measurement',
		'marketing',
	] as const;

	return (
		<Card title="Receipts">
			{categories.map((category) => {
				const decision = snapshot.explicitChoice?.categories[category];

				return (
					<Row
						key={category}
						label={category}
						value={
							decision === undefined ? (
								<Text muted>no receipt: the policy default applies</Text>
							) : (
								`${String(decision.value)} at ${when(decision.confirmedAt)}`
							)
						}
					/>
				);
			})}
			<Hint>
				A category with no receipt was never shown to the subject, so a save
				from here does not renew it.
			</Hint>
		</Card>
	);
};

/** Policy facts the core resolved, including which bundle it served. */
const PolicyCard = () => {
	const snapshot = useConsent();

	return (
		<Card title="Policy context">
			<Row
				label="model"
				value={snapshot.model}
			/>
			<Row
				label="policy id"
				value={snapshot.resolution.policyId ?? 'none'}
			/>
			<Row
				label="fingerprint"
				value={snapshot.resolution.fingerprint ?? 'none'}
			/>
			<Row
				label="scope"
				value={
					snapshot.consentCategories === null
						? 'full policy scope'
						: snapshot.consentCategories.join(', ')
				}
			/>
			<Row
				label="language"
				value={snapshot.translations?.language ?? 'no bundle served'}
			/>
			<Row
				label="next deadline"
				value={
					snapshot.nextDeadline === null ? 'none' : when(snapshot.nextDeadline)
				}
			/>
		</Card>
	);
};

/** Categories the core denies whatever the subject granted. */
const RestrictionsCard = () => {
	const snapshot = useConsent();
	const restrictions = Object.entries(snapshot.restrictions);

	return (
		<Card title="Restrictions">
			{restrictions.length === 0 ? (
				<Hint>No category is restricted right now.</Hint>
			) : (
				restrictions.map(([category, reasons]) => (
					<Row
						key={category}
						label={category}
						value={reasons.join(', ')}
					/>
				))
			)}
			<Hint>
				A restriction denies a category whatever the subject granted, and says
				why.
			</Hint>
		</Card>
	);
};

/** The screen a runner lands on when they want to know what the core thinks. */
export const DiagnosticsScreen = ({
	links,
	onOpenDialog,
	onOpenPreferences,
}: {
	readonly links: DemoLinks;
	readonly onOpenDialog: () => void;
	readonly onOpenPreferences: () => void;
}) => (
	<Screen>
		<FakeCoreNotice />
		<DeepLinkCard links={links} />
		<CoreCard />
		<SnapshotCard />
		<HandshakeCard />
		<Card title="Effective permissions">
			<PermissionList />
			<Hint>
				Each line is its own subscription, so its counter only moves when that
				category moves.
			</Hint>
		</Card>
		<Card title="Gated loading">
			<GatedVendor category="measurement" />
			<GatedVendor category="marketing" />
			<GatingHint />
		</Card>
		<LifecycleCard />
		<ReceiptsCard />
		<PolicyCard />
		<RestrictionsCard />
		<ActionsCard
			onOpenDialog={onOpenDialog}
			onOpenPreferences={onOpenPreferences}
		/>
		<FakeCoreCard />
	</Screen>
);
