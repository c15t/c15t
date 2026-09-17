/**
 * The pieces that make consent-gated loading visible on screen.
 *
 * A permission that only exists in a snapshot is not something a runner can
 * check. These components turn one category into something that mounts and
 * unmounts, and they count their own rerenders, so "at most one rerender per
 * subscribed component" and "nothing runs before the core has decided" are both
 * things you can watch rather than take on faith.
 */

import {
	ConsentGate,
	ConsentReady,
	ConsentPrompt,
	useConsentDecision,
	useIsAllowed,
} from '@c15t/react-native';
import type { ReactNode } from 'react';

import { CATEGORIES } from '../c15t/fake-native';
import type { Category } from '../c15t/fake-native';
import { Card, Flag, Hint, Row, Text } from './ui';

/**
 * Render passes per subscribed component, keyed by what it subscribes to.
 *
 * Deliberately outside React state: holding the count of renders in state would cost
 * one more render for every one it measures, and that count is the number the
 * contract bounds.
 */
const renderPasses: Record<string, number> = {};

/** Record one render pass and report how many this component has had. */
const countRender = (key: string): number => {
	renderPasses[key] = (renderPasses[key] ?? 0) + 1;

	return renderPasses[key] ?? 1;
};

/**
 * Stand-in for the thing you would actually gate: an SDK initialiser.
 *
 * It says out loud that it is running, which is the point. A gate that rendered its
 * children on a cold start, before the core had decided anything, would show up here
 * as a vendor that appeared while its category still read denied.
 */
const VendorInit = ({ category }: { readonly category: Category }) => {
	const passes = countRender(`vendor:${category}`);

	return (
		<Text>
			{category} vendor running ({String(passes)} render
			{passes === 1 ? '' : 's'})
		</Text>
	);
};

/**
 * Gate one category, and say which kind of closed this is.
 *
 * `ConsentGate` still decides what renders, and the decision read only labels the
 * fallback, because the boolean alone answers `false` for two opposite cases: the
 * subject refused, and the core has not decided yet. A runner watching a screen
 * cannot tell those apart, and only one of them is supposed to fix itself.
 */
export const GatedVendor = ({ category }: { readonly category: Category }) => {
	const decision = useConsentDecision(category);

	return (
		<ConsentGate
			category={category}
			fallback={
				<Text
					muted
				>{`${category} gated off (${decision === 'pending' ? 'waiting on the core' : 'refused'})`}</Text>
			}
		>
			{() => <VendorInit category={category} />}
		</ConsentGate>
	);
};

/** One category, on its own subscription, with its own render counter. */
const PermissionLine = ({ category }: { readonly category: Category }) => {
	const allowed = useIsAllowed(category);
	const passes = countRender(`line:${category}`);

	return (
		<Row
			label={category}
			value={
				<>
					<Flag value={allowed} />
					<Text muted>{`  reads: ${String(passes)}`}</Text>
				</>
			}
		/>
	);
};

/** The live permission per category, each on its own subscription. */
export const PermissionList = () =>
	CATEGORIES.map((category) => (
		<PermissionLine
			category={category}
			key={category}
		/>
	));

/** What the snapshot looks like before it can be trusted. */
export const ReadyProbe = () => (
	<ConsentReady fallback={<Text muted>not ready: serving deny-all</Text>}>
		{({ status }) => (
			<Text>
				ready: model{' '}
				{status.promptRequirement.kind === 'none'
					? 'settled'
					: `owes ${status.promptRequirement.kind}`}
			</Text>
		)}
	</ConsentReady>
);

/** A prompt of the app's own, rendered only while the policy owes one. */
export const PromptProbe = ({
	fallback,
}: {
	readonly fallback?: ReactNode;
}) => (
	<ConsentPrompt fallback={fallback ?? <Text muted>nothing owed</Text>}>
		{({ activeUI, promptRequirement }) => (
			<Text>
				owes {promptRequirement.kind} on {activeUI ?? 'no surface'}
			</Text>
		)}
	</ConsentPrompt>
);

/** Section that shows the readiness and prompt probes side by side. */
export const LifecycleCard = () => (
	<Card title="Headless">
		<ReadyProbe />
		<PromptProbe />
	</Card>
);

/** Explain what the counters mean, because they look like noise otherwise. */
export const GatingHint = () => (
	<Hint>
		Each line is its own subscription, so its counter only moves when that
		category moves. The vendor below only appears while its category is allowed,
		and disappears the moment it stops being allowed. While it is gone, the line
		behind it says whether the subject refused or the core has not answered yet.
	</Hint>
);
