/**
 * The shell: the header the scheme control lives in, the two tabs, and the consent
 * surfaces mounted over them.
 *
 * The banner, the consent manager, and the preference centre are mounted here rather
 * than inside a tab. The banner decides for itself whether a prompt is owed and
 * unmounts once the subject has acted, so it has to outlive whichever tab is on
 * screen, and the sheets have to survive a reviewer switching tabs to read what the
 * core said.
 *
 * The header pads itself by the same bands the surfaces lay out against, so nothing
 * sits under a clock or a home indicator on either platform.
 */

import {
	ConsentBanner,
	ConsentIabBanner,
	ConsentIabPreferences,
	ConsentPreferences,
	isStatusPromptOwed,
	useConsentActions,
	useConsentStyles,
	useConsentStatus,
	useTrackingRequest,
} from '@c15t/react-native';
import type {
	ConsentIabSelection,
	ConsentIabTab,
	ConsentPreferencesPresentation,
} from '@c15t/react-native';
import { Component, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, Text as NativeText, View } from 'react-native';

import { useAppearance } from './appearance';
import { useConsentSource } from './c15t/consent-source';
import {
	Badge,
	Button,
	Card,
	Heading,
	Hint,
	HostStylesProvider,
	Screen,
	Segmented,
	useHostStyles,
} from './components/ui';
import { useDemoDeepLinks } from './deep-links/use-deep-links';
import { IAB_DEMO_DISPLAY_MODEL } from './fixtures/iab-display-model';
import { DiagnosticsScreen } from './screens/diagnostics';
import { PrivacyScreen } from './screens/privacy';
import { APPEARANCE_LABELS, APPEARANCES, surfaceTheme } from './theme';

const TABS = ['privacy', 'diagnostics'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
	diagnostics: 'Diagnostics',
	privacy: 'Privacy',
};

/**
 * The categories the tracking request on the Privacy screen stands for.
 *
 * Personalised ads are the only thing in this app that wants an identifier, so the
 * journey names one category: a subject who leaves Marketing off is finished with the
 * Apple sheet rather than sent back to it. Held as a module constant because the hook
 * keys its callbacks to it.
 */
const TRACKING_CATEGORIES = ['marketing'] as const;

/** The scheme control, built from the three choices the package resolves. */
const APPEARANCE_OPTIONS = APPEARANCES.map((appearance) => ({
	label: APPEARANCE_LABELS[appearance],
	value: appearance,
}));

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

/**
 * Shown when the binary has no c15t module, which is a build fact.
 *
 * It resolves the theme for itself: there is no consent state to read at this point,
 * but `useConsentStyles` needs none, and this screen is still drawn in the palette the
 * rest of the app would have used.
 */
const MissingNativeCore = () => {
	const { enableFake, nativeError } = useConsentSource();
	const { appearance } = useAppearance();
	const consentStyles = useConsentStyles({ theme: surfaceTheme(appearance) });

	return (
		<HostStylesProvider styles={consentStyles}>
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
						and build again; on Android clean and rebuild. The fake core below
						is a fixture, not a substitute for that.
					</Hint>
					<Button
						label="Continue with the fake core"
						onPress={enableFake}
					/>
				</Card>
			</Screen>
		</HostStylesProvider>
	);
};

/** The app title, the scheme control, and the tabs, kept clear of the top band. */
const Header = ({
	onSelectTab,
	tab,
}: {
	readonly onSelectTab: (tab: Tab) => void;
	readonly tab: Tab;
}) => {
	const { appearance, setAppearance } = useAppearance();
	const { kind } = useConsentSource();
	const { parts, safeArea, theme } = useHostStyles();
	const { colors, spacing } = theme;

	return (
		<View
			style={{
				backgroundColor: colors.surface,
				borderBottomColor: colors.separator,
				borderBottomWidth: 1,
				gap: spacing.s8,
				paddingBottom: spacing.s8,
				paddingHorizontal: spacing.m16,
				paddingTop: safeArea.top + spacing.s8,
			}}
		>
			<View
				style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.s8 }}
			>
				<Heading>c15t Bare</Heading>
				<View style={{ marginLeft: 'auto' }}>
					<Segmented
						onChange={setAppearance}
						options={APPEARANCE_OPTIONS}
						value={appearance}
					/>
				</View>
			</View>

			{kind === 'fake' ? (
				<Badge
					label="Fake core"
					tone="danger"
				/>
			) : null}

			<View style={{ flexDirection: 'row', gap: spacing.m16 }}>
				{TABS.map((value) => {
					const selected = value === tab;

					return (
						<Pressable
							accessibilityLabel={TAB_LABELS[value]}
							accessibilityRole="button"
							accessibilityState={{ selected }}
							hitSlop={{ bottom: 8, left: 0, right: 0, top: 8 }}
							key={value}
							onPress={() => {
								onSelectTab(value);
							}}
						>
							<NativeText
								style={{
									...parts.rowTitle,
									borderBottomColor: selected ? colors.primary : 'transparent',
									borderBottomWidth: 2,
									color: selected ? colors.primary : colors.secondaryLabel,
									paddingBottom: spacing.xs4,
									paddingHorizontal: spacing.xs4,
								}}
							>
								{TAB_LABELS[value]}
							</NativeText>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
};

/** The app, once a core is attached. */
export const App = () => {
	const { appearance, setAppearance } = useAppearance();
	const actions = useConsentActions();
	const promptOwed = isStatusPromptOwed(useConsentStatus());
	const [tab, setTab] = useState<Tab>('privacy');
	const [preferencesOpen, setPreferencesOpen] = useState(false);
	const [presentation, setPresentation] =
		useState<ConsentPreferencesPresentation>('page');
	const [mode, setMode] = useState<'standard' | 'iab'>('standard');
	const [iabBannerOpen, setIabBannerOpen] = useState(true);
	const [iabOpen, setIabOpen] = useState(false);
	const [iabTab, setIabTab] = useState<ConsentIabTab>('vendors');
	const [iabSelection, setIabSelection] = useState<ConsentIabSelection>();
	const tracking = useTrackingRequest({
		categories: TRACKING_CATEGORIES,
		preferences: {
			onClose: () => setPreferencesOpen(false),
			open: preferencesOpen,
		},
	});

	const openPreferences = (
		next: ConsentPreferencesPresentation = presentation
	): void => {
		setMode('standard');
		setIabOpen(false);
		setPresentation(next);
		setPreferencesOpen(true);
	};
	const openDialog = (): void => openPreferences('sheet');
	const openIabDrawer = (next: ConsentIabTab = 'vendors'): void => {
		setMode('iab');
		setPreferencesOpen(false);
		setIabBannerOpen(false);
		setIabTab(next);
		setIabOpen(true);
	};
	const closeSheets = (): void => {
		setPreferencesOpen(false);
		setIabOpen(false);
	};
	const links = useDemoDeepLinks({
		actions,
		closeSheets,
		openDialog,
		openIabDrawer,
		openPreferences,
		promptOwed,
		requestTracking: tracking.request,
		setAppearance,
		showDiagnostics: () => setTab('diagnostics'),
	});
	const theme = surfaceTheme(appearance);
	const consentStyles = useConsentStyles({ theme });
	const saveIab = (selection: ConsentIabSelection): void => {
		setIabSelection(selection);
		setIabOpen(false);
		setIabBannerOpen(false);
	};

	return (
		<HostStylesProvider styles={consentStyles}>
			<View
				style={{
					backgroundColor: consentStyles.theme.colors.background,
					flex: 1,
				}}
			>
				<Header
					onSelectTab={setTab}
					tab={tab}
				/>
				<View style={{ flexDirection: 'row', gap: 8, padding: 8 }}>
					<Segmented
						options={[
							{ label: 'Standard', value: 'standard' },
							{ label: 'IAB', value: 'iab' },
						]}
						value={mode}
						onChange={(next) => {
							closeSheets();
							setMode(next);
							setIabBannerOpen(true);
						}}
					/>
					<Segmented
						options={[
							{ label: 'Page', value: 'page' },
							{ label: 'Sheet', value: 'sheet' },
						]}
						value={presentation}
						onChange={setPresentation}
					/>
				</View>
				<View style={{ flex: 1 }}>
					<ErrorBoundary>
						{tab === 'privacy' ? (
							<PrivacyScreen
								onOpenIabDrawer={openIabDrawer}
								onOpenPreferences={openPreferences}
								tracking={tracking}
							/>
						) : (
							<DiagnosticsScreen
								links={links}
								onOpenDialog={openDialog}
								onOpenPreferences={openPreferences}
							/>
						)}
					</ErrorBoundary>
				</View>
				{mode === 'standard' && !tracking.preferences.open ? (
					<ConsentBanner theme={theme} />
				) : null}
				<ConsentPreferences
					{...tracking.preferences}
					presentation={presentation}
					theme={theme}
				/>
				<ConsentIabBanner
					initialSelection={iabSelection}
					model={IAB_DEMO_DISPLAY_MODEL}
					onSave={saveIab}
					open={mode === 'iab' && iabBannerOpen && !iabOpen}
					theme={theme}
				/>
				<ConsentIabPreferences.Root
					initialSelection={iabSelection}
					initialTab={iabTab}
					model={IAB_DEMO_DISPLAY_MODEL}
					onClose={() => setIabOpen(false)}
					onSave={saveIab}
					open={iabOpen}
					presentation={presentation}
					theme={theme}
				/>
			</View>
		</HostStylesProvider>
	);
};

/** Exported for the missing-module case, which cannot render the normal shell. */
export const UnavailableScreen = MissingNativeCore;
