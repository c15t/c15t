/**
 * The IAB disclosure as a full-page drawer.
 *
 * The web preference centre puts this disclosure in a centred dialog. A phone puts
 * it on a page: the count is in the hundreds once the vendors tab is open, and a
 * card floating over an app at 85 per cent of the viewport is the worst of both --
 * the app behind is still dimmed and unreadable, and the list is still too long
 * for the room it was given. So this is the fourth `ConsentSurface` presentation,
 * `drawer`, and not a second sheet: the header, the scrolling body, the sticky
 * footer, the safe-area bands on both platforms, the Android back gesture, reduced
 * motion, and the modal a11y treatment are the ones the dialog and the banner
 * already use.
 *
 * It renders from props and nothing else. The rows arrive on `model` in the shape
 * `@c15t/iab`'s display model publishes, nothing here reads a consent kernel, and
 * every switch the subject moves is held locally until one press of Save hands the
 * whole selection over in a single call. Closing writes nothing, which is the same
 * bargain the web's preference centre makes.
 *
 * @packageDocumentation
 */

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import type {
	ConsentIabDisplayConsentRow,
	ConsentIabDisplayModel,
	ConsentIabProcessedVendor,
	ConsentIabSelection,
	ConsentIabTab,
} from './iab-display-model';
import {
	CONSENT_BUTTON_ROW_ITEM,
	ConsentButton,
} from './internal/consent-button';
import {
	ConsentSurface,
	ConsentSurfaceBody,
	ConsentSurfaceFooter,
	ConsentSurfaceHeader,
	useConsentSurfaceFrame,
} from './internal/consent-surface';
import type {
	ConsentIabCopy,
	ConsentIabCopyOverrides,
} from './internal/iab-copy';
import { resolveIabCopy, withTotal } from './internal/iab-copy';
import {
	ConsentIabLockedSection,
	ConsentIabPurposeRow,
	ConsentIabStackRow,
	ConsentIabVendorRow,
} from './internal/iab-rows';
import type { ConsentPartStyles } from './theme/consent-theme-parts';
import type { ConsentTheme } from './theme/create-consent-theme';
import { useConsentStyles } from './theme/use-consent-styles';

/** The heading's own column: a title and the line under it, 4 apart. */
const HEADER_COPY: ViewStyle = { flex: 1, gap: 4, minWidth: 0 };

/** The heading's copy and its close control, side by side. */
const HEADER_ROW: ViewStyle = {
	alignItems: 'flex-start',
	flexDirection: 'row',
	gap: 12,
};

/** The two whole-surface decisions, one row, as wide as each other. */
const DECISION_ROW: ViewStyle = { flexDirection: 'row', gap: 16 };

/** One bar of the close control's cross, rotated about the middle. */
const GLYPH_BAR: ViewStyle = { position: 'absolute' };

/** What the slots read from the drawer they were rendered inside. */
interface ConsentIabDrawerState {
	/** Every string the disclosure renders. */
	readonly copy: ConsentIabCopy;
	/** Writes a whole selection and abandons the draft. */
	readonly decide: (selection: ConsentIabSelection) => void;
	/** Disclosure to render. */
	readonly model: ConsentIabDisplayModel;
	/** Leaves the disclosure without writing anything. */
	readonly onClose: () => void;
	/** Selection held locally until Save writes it. */
	readonly selection: ConsentIabSelection;
	/** Records one purpose, whichever stack it came out of. */
	readonly setPurpose: (purposeId: number, value: boolean) => void;
	/** Records one special feature. */
	readonly setSpecialFeature: (featureId: number, value: boolean) => void;
	/** Moves the tab. */
	readonly setTab: (tab: ConsentIabTab) => void;
	/** Records the partner's consent. */
	readonly setVendorConsent: (
		vendorId: number | string,
		value: boolean
	) => void;
	/** Records an objection to one partner's legitimate interest. */
	readonly setVendorLegitimateInterest: (
		vendorId: number | string,
		value: boolean
	) => void;
	/** Tab showing. */
	readonly tab: ConsentIabTab;
}

/** `null` outside a drawer, which is what makes the accessor throw. */
const DrawerContext = createContext<ConsentIabDrawerState | null>(null);

/**
 * Read the disclosure a slot was rendered inside.
 *
 * @returns The drawer's draft, copy, and callbacks.
 * @throws {Error} When called outside {@link ConsentIabDrawerRoot}.
 */
const useConsentIabDrawer =
	function useConsentIabDrawer(): ConsentIabDrawerState {
		const value = useContext(DrawerContext);

		if (value === null) {
			throw new Error(
				'@c15t/react-native: this component has to be rendered inside ConsentIabDrawer.Root, so that it can read the disclosure it belongs to.'
			);
		}

		return value;
	};

/** What a caller may already have decided, in whole or in part. */
export type ConsentIabInitialSelection = Partial<ConsentIabSelection>;

/**
 * The strings the disclosure renders, and the shape that writes over them.
 *
 * Published from here rather than from `internal/iab-copy`, which is where they
 * are resolved: `copy` is a prop a host sets, so the type has to be reachable
 * without naming a module the package calls private.
 */
export type {
	ConsentIabCopy,
	ConsentIabCopyOverrides,
} from './internal/iab-copy';

/**
 * The complete set of decisions the disclosure can express, seeded from what the
 * caller already holds.
 *
 * Every key the surface can move gets an entry whether or not the caller named it,
 * so one `onSave` hands over a selection a TC String can be encoded from directly
 * rather than four partial maps that each need defaulting on the far side of the
 * bridge. Absent means what it means on the web: a purpose or a partner consent
 * that was never granted is `false`, and a legitimate interest that was never
 * objected to is `true`.
 *
 * @param model - Disclosure the rows came from.
 * @param initial - Decisions already held, in whole or in part.
 * @returns A selection with one entry per decision the surface can move.
 * @example
 * ```ts
 * seedConsentIabSelection(model, { vendorConsents: { '755': true } });
 * // -> { purposeConsents: { 1: false, ... }, vendorConsents: { '755': true, ... }, ... }
 * ```
 */
export const seedConsentIabSelection = function seedConsentIabSelection(
	model: ConsentIabDisplayModel,
	initial?: ConsentIabInitialSelection
): ConsentIabSelection {
	const purposeConsents: Record<number, boolean> = {};
	const specialFeatureOptIns: Record<number, boolean> = {};
	const walk = (row: ConsentIabDisplayConsentRow): void => {
		if (row.kind === 'stack') {
			for (const purpose of row.purposes) {
				purposeConsents[purpose.id] =
					initial?.purposeConsents?.[purpose.id] ?? false;
			}

			return;
		}

		if (row.toggle === 'special-feature') {
			specialFeatureOptIns[row.id] =
				initial?.specialFeatureOptIns?.[row.id] ?? false;

			return;
		}

		purposeConsents[row.id] = initial?.purposeConsents?.[row.id] ?? false;
	};

	for (const row of model.consentRows) {
		walk(row);
	}

	const vendorConsents: Record<string, boolean> = {};
	const vendorLegitimateInterests: Record<string, boolean> = {};

	for (const vendor of model.vendors) {
		const key = String(vendor.id);

		vendorConsents[key] = initial?.vendorConsents?.[key] ?? false;

		if (vendor.legIntPurposes.length > 0) {
			vendorLegitimateInterests[key] =
				initial?.vendorLegitimateInterests?.[key] ?? true;
		}
	}

	return {
		purposeConsents,
		specialFeatureOptIns,
		vendorConsents,
		vendorLegitimateInterests,
	};
};

/**
 * Move every entry of one consent map to one position.
 *
 * @param map - Map to rewrite.
 * @param value - Position to move each entry to.
 * @returns A new map, same keys.
 */
const mapTo = function mapTo(
	map: Record<string | number, boolean>,
	value: boolean
): Record<string | number, boolean> {
	const next: Record<string | number, boolean> = {};

	for (const key of Object.keys(map)) {
		next[key] = value;
	}

	return next;
};

/**
 * Every decision on the surface moved the same way, for the two whole-surface
 * actions the footer carries.
 *
 * A decision is not a draft edit: like the consent dialog, the footer's two
 * actions write, and the draft on screen is abandoned rather than carried into
 * them. The locked essential rows are absent because they are not consent -- a
 * special purpose has no entry in any consent map to set.
 *
 * @param model - Disclosure the rows came from.
 * @param value - Position to move everything to.
 * @returns A complete selection at that position.
 */
const decideConsentIabSelection = function decideConsentIabSelection(
	model: ConsentIabDisplayModel,
	value: boolean
): ConsentIabSelection {
	const seeded = seedConsentIabSelection(model);

	return {
		purposeConsents: mapTo(seeded.purposeConsents, value),
		specialFeatureOptIns: mapTo(seeded.specialFeatureOptIns, value),
		vendorConsents: mapTo(seeded.vendorConsents, value),
		vendorLegitimateInterests: mapTo(seeded.vendorLegitimateInterests, value),
	};
};

/**
 * The partners of one tab, in the two groups the web puts them in.
 *
 * The caller hands over one combined list already sorted by name, which is what
 * the web builds before it renders; splitting it here keeps that order inside each
 * group and drops a group with nothing in it, so a CMP with no custom partners
 * never shows an empty `Custom Partners` heading.
 *
 * @param vendors - Partners to list, in the order to list them in.
 * @returns One entry per group with anything in it.
 */
const vendorGroups = function vendorGroups(
	vendors: ConsentIabProcessedVendor[]
): { heading: 'custom' | 'iab'; vendors: ConsentIabProcessedVendor[] }[] {
	const registered = vendors.filter((vendor) => vendor.isCustom !== true);
	const custom = vendors.filter((vendor) => vendor.isCustom === true);
	const groups: {
		heading: 'custom' | 'iab';
		vendors: ConsentIabProcessedVendor[];
	}[] = [];

	if (registered.length > 0) {
		groups.push({ heading: 'iab', vendors: registered });
	}

	if (custom.length > 0) {
		groups.push({ heading: 'custom', vendors: custom });
	}

	return groups;
};

/** Props for {@link ConsentIabDrawerRoot}. */
export interface ConsentIabDrawerRootProps {
	/** The slots: `Header`, `Tabs`, `Body`, `Footer`, in that order. */
	readonly children: ReactNode;
	/** Strings to write over the English the disclosure ships with. */
	readonly copy?: ConsentIabCopyOverrides;
	/**
	 * What the subject has already decided.
	 *
	 * Read when the drawer mounts and again once a decision has been written, so
	 * the switches show what was saved rather than the draft that was. A caller
	 * that changes the standing somewhere else while this is mounted should
	 * remount it -- a `key` is enough.
	 */
	readonly initialSelection?: ConsentIabInitialSelection;
	/**
	 * Which tab to open on.
	 *
	 * Defaults to `purposes`, as the web does. The reason it exists at all is the
	 * web's `{count} partners` link, which opens the same disclosure straight on
	 * the partner list; a host with that link needs this to answer it. Read when
	 * the drawer mounts only, so a caller that wants to move the tab from outside
	 * should remount it, which a `key` does.
	 */
	readonly initialTab?: ConsentIabTab;
	/** Called when the subject leaves without saving, and by Android's back. */
	readonly onClose: () => void;
	/** Disclosure to render, in the shape `@c15t/iab`'s display model publishes. */
	readonly model: ConsentIabDisplayModel;
	/**
	 * Called with every decision on the surface, once, when the subject writes.
	 *
	 * Save hands over the draft; Reject All and Accept All hand over every decision
	 * moved the same way. The drawer reports and does not close itself: the caller
	 * owns `open`, and closing after a write is the caller's to sequence.
	 *
	 * @param selection - The full selection, including what was never moved.
	 */
	readonly onSave: (selection: ConsentIabSelection) => void;
	/** Whether the drawer is showing. */
	readonly open: boolean;
	/** Per-part style overrides. */
	readonly styles?: ConsentPartStyles;
	/** Theme to render with, instead of the platform scheme. */
	readonly theme?: ConsentTheme;
}

/**
 * Mount the disclosure.
 *
 * @param props - Drawer props.
 * @returns The surface while it is open or animating out, and nothing otherwise.
 */
const ConsentIabDrawerRoot = ({
	children,
	copy,
	initialSelection,
	initialTab = 'purposes',
	model,
	onClose,
	onSave,
	open,
	styles,
	theme,
}: ConsentIabDrawerRootProps) => {
	const surfaceStyles = useConsentStyles({
		presentation: 'drawer',
		styles,
		theme,
	});
	const resolvedCopy = useMemo(() => resolveIabCopy(copy), [copy]);
	const [selection, setSelection] = useState(() =>
		seedConsentIabSelection(model, initialSelection)
	);
	const [tab, setTab] = useState<ConsentIabTab>(initialTab);

	const setPurpose = useCallback((purposeId: number, value: boolean) => {
		setSelection((current) => ({
			...current,
			purposeConsents: { ...current.purposeConsents, [purposeId]: value },
		}));
	}, []);
	const setSpecialFeature = useCallback((featureId: number, value: boolean) => {
		setSelection((current) => ({
			...current,
			specialFeatureOptIns: {
				...current.specialFeatureOptIns,
				[featureId]: value,
			},
		}));
	}, []);
	const setVendorConsent = useCallback(
		(vendorId: number | string, value: boolean) => {
			setSelection((current) => ({
				...current,
				vendorConsents: {
					...current.vendorConsents,
					[String(vendorId)]: value,
				},
			}));
		},
		[]
	);
	const setVendorLegitimateInterest = useCallback(
		(vendorId: number | string, value: boolean) => {
			setSelection((current) => ({
				...current,
				vendorLegitimateInterests: {
					...current.vendorLegitimateInterests,
					[String(vendorId)]: value,
				},
			}));
		},
		[]
	);

	// A write and an abandon are the same two steps: hand the whole selection to the
	// caller, then put the switches back where the standing actually is, so a
	// drawer that is opened again is showing what was written and not the draft
	// that never was.
	const decide = useCallback(
		(next: ConsentIabSelection) => {
			onSave(next);
			setSelection(seedConsentIabSelection(model, initialSelection));
		},
		[initialSelection, model, onSave]
	);

	const state = useMemo<ConsentIabDrawerState>(
		() => ({
			copy: resolvedCopy,
			decide,
			model,
			onClose,
			selection,
			setPurpose,
			setSpecialFeature,
			setTab,
			setVendorConsent,
			setVendorLegitimateInterest,
			tab,
		}),
		[
			decide,
			model,
			onClose,
			resolvedCopy,
			selection,
			setPurpose,
			setSpecialFeature,
			setVendorConsent,
			setVendorLegitimateInterest,
			tab,
		]
	);

	return (
		<DrawerContext.Provider value={state}>
			{/*
			 * `drawer`, and not a prop. A host that could choose a presentation
			 * here could choose the centred dialog this surface exists to avoid, so
			 * the compound fixes it and the shared chrome does the rest.
			 */}
			<ConsentSurface
				label={resolvedCopy.title}
				onRequestClose={onClose}
				open={open}
				presentation="drawer"
				styles={surfaceStyles}
			>
				{children}
			</ConsentSurface>
		</DrawerContext.Provider>
	);
};

/**
 * The heading: the disclosure's own title and supporting line, and the control
 * that leaves without writing.
 *
 * @returns The header slot.
 */
const ConsentIabDrawerHeader = (): ReactNode => {
	const { copy, onClose } = useConsentIabDrawer();
	const { parts } = useConsentSurfaceFrame();

	return (
		<ConsentSurfaceHeader>
			<View style={HEADER_ROW}>
				<View style={HEADER_COPY}>
					<Text
						accessibilityRole="header"
						style={parts.title}
					>
						{copy.title}
					</Text>
					<Text style={parts.description}>{copy.description}</Text>
				</View>
				{/*
				 * Two bars of the part's own colour, crossed through their middle,
				 * which is what the web's 16pt lucide `x` at stroke-width 2 draws.
				 * The box is 28 and the 44 a fingertip needs comes from the hit
				 * area, so the header keeps the height the web header measures.
				 */}
				<Pressable
					accessibilityLabel={copy.close}
					accessibilityRole="button"
					hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
					onPress={onClose}
					style={parts.closeButton}
					testID="consent-iab-drawer-close"
				>
					<View
						style={[
							parts.closeGlyph,
							GLYPH_BAR,
							{ transform: [{ rotate: '45deg' }] },
						]}
					/>
					<View
						style={[
							parts.closeGlyph,
							GLYPH_BAR,
							{ transform: [{ rotate: '-45deg' }] },
						]}
					/>
				</Pressable>
			</View>
		</ConsentSurfaceHeader>
	);
};

/**
 * The two tabs, in the segmented control the web puts them in.
 *
 * @returns The tabs band.
 */
const ConsentIabDrawerTabs = (): ReactNode => {
	const { copy, model, setTab, tab } = useConsentIabDrawer();
	const { parts, theme } = useConsentSurfaceFrame();
	const tabs: { label: string; value: ConsentIabTab }[] = [
		{
			label: withTotal(copy.purposes, model.purposeTabCount),
			value: 'purposes',
		},
		{ label: withTotal(copy.vendors, model.vendorTabCount), value: 'vendors' },
	];

	return (
		<View style={parts.tabBand}>
			{/*
			 * The web's `tablist` and `tab`, which React Native does carry on both
			 * platforms — Android maps them in `ReactAccessibilityDelegate` and iOS
			 * accepts them — so the pair a screen reader hears here is the pair the
			 * web surface gives it. `selected` is what says which of the two is
			 * showing, the same attribute radix Tabs sets on the trigger.
			 */}
			<View
				accessibilityRole="tablist"
				style={parts.tabList}
			>
				{tabs.map((entry) => {
					const active = entry.value === tab;

					return (
						<Pressable
							accessibilityLabel={entry.label}
							accessibilityRole="tab"
							accessibilityState={{ selected: active }}
							key={entry.value}
							onPress={() => {
								setTab(entry.value);
							}}
							style={[
								parts.tab,
								active && { backgroundColor: theme.colors.surface },
							]}
							testID={`consent-iab-tab-${entry.value}`}
						>
							<Text
								style={[parts.tabLabel, active && { color: theme.colors.text }]}
							>
								{entry.label}
							</Text>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
};

/**
 * The list the subject decides on: purposes, stacks, special features, and the
 * locked essential section, or the partners and what each of them claims.
 *
 * @returns The body slot.
 */
const ConsentIabDrawerBody = (): ReactNode => {
	const {
		copy,
		model,
		selection,
		setPurpose,
		setSpecialFeature,
		setVendorConsent,
		setVendorLegitimateInterest,
		tab,
	} = useConsentIabDrawer();
	const { parts, theme } = useConsentSurfaceFrame();

	if (tab === 'vendors') {
		return (
			<ConsentSurfaceBody>
				{vendorGroups(model.vendors).map((group) => (
					<View
						key={group.heading}
						testID={`consent-iab-group-${group.heading}`}
					>
						<Text style={parts.sectionHeading}>
							{group.heading === 'custom'
								? copy.customPartners
								: copy.iabVendors}
						</Text>
						<View style={{ gap: 6 }}>
							{group.vendors.map((vendor) => (
								<ConsentIabVendorRow
									copy={copy}
									key={String(vendor.id)}
									model={model}
									onToggleConsent={(value) => {
										setVendorConsent(vendor.id, value);
									}}
									onToggleObjection={(value) => {
										setVendorLegitimateInterest(vendor.id, value);
									}}
									parts={parts}
									theme={theme}
									vendor={vendor}
									vendorConsented={
										selection.vendorConsents[String(vendor.id)] ?? false
									}
									vendorLegitimateInterest={
										selection.vendorLegitimateInterests[String(vendor.id)] ??
										true
									}
								/>
							))}
						</View>
					</View>
				))}
			</ConsentSurfaceBody>
		);
	}

	return (
		<ConsentSurfaceBody>
			{model.consentRows.map((row) =>
				row.kind === 'stack' ? (
					<ConsentIabStackRow
						copy={copy}
						key={row.testId}
						onTogglePurpose={setPurpose}
						parts={parts}
						stack={row}
						theme={theme}
						values={selection.purposeConsents}
					/>
				) : (
					/* A special feature is its own opt-in map in the TCF stack rather
					 * than a purpose, so the row model says which map its switch reads
					 * and writes. One branch for both, because the drawer's purposes tab
					 * is one list. */
					<ConsentIabPurposeRow
						copy={copy}
						key={row.testId}
						onToggle={(value) => {
							if (row.toggle === 'special-feature') {
								setSpecialFeature(row.id, value);
								return;
							}

							setPurpose(row.id, value);
						}}
						parts={parts}
						row={row}
						selected={
							row.toggle === 'special-feature'
								? (selection.specialFeatureOptIns[row.id] ?? false)
								: (selection.purposeConsents[row.id] ?? false)
						}
						theme={theme}
					/>
				)
			)}
			<ConsentIabLockedSection
				copy={copy}
				parts={parts}
				rows={model.essentialRows}
				theme={theme}
				vendorCount={model.essentialPartnerCount}
			/>
		</ConsentSurfaceBody>
	);
};

/**
 * The actions: two whole-surface decisions side by side, and the write above
 * nothing else.
 *
 * @returns The footer slot.
 */
const ConsentIabDrawerFooter = (): ReactNode => {
	const { copy, decide, model, selection } = useConsentIabDrawer();
	const { parts } = useConsentSurfaceFrame();

	return (
		<ConsentSurfaceFooter>
			<View style={DECISION_ROW}>
				<ConsentButton
					kind="secondary"
					label={copy.rejectAll}
					onPress={() => {
						decide(decideConsentIabSelection(model, false));
					}}
					parts={parts}
					style={CONSENT_BUTTON_ROW_ITEM}
					testID="consent-iab-reject"
				/>
				<ConsentButton
					kind="secondary"
					label={copy.acceptAll}
					onPress={() => {
						decide(decideConsentIabSelection(model, true));
					}}
					parts={parts}
					style={CONSENT_BUTTON_ROW_ITEM}
					testID="consent-iab-accept"
				/>
			</View>
			<ConsentButton
				kind="primary"
				label={copy.saveSettings}
				onPress={() => {
					decide(selection);
				}}
				parts={parts}
				testID="consent-iab-save"
			/>
		</ConsentSurfaceFooter>
	);
};

/**
 * The disclosure, in the order its slots have to be given.
 *
 * @returns The four slots as one compound component.
 */
export const ConsentIabDrawer = {
	Body: ConsentIabDrawerBody,
	Footer: ConsentIabDrawerFooter,
	Header: ConsentIabDrawerHeader,
	Root: ConsentIabDrawerRoot,
	Tabs: ConsentIabDrawerTabs,
} as const;
