/**
 * The IAB TCF disclosure as a preference centre, openable at any time.
 *
 * Purposes and partners sit under two tabs. A purpose opens its own screen
 * with what it covers and which partners rely on it; a partner opens its
 * retention, storage, and privacy policy, and the switch that objects to its
 * legitimate interest. The partner list searches by name, which matters once
 * there are hundreds.
 *
 * By default it is a page: the system page sheet on iOS, a full-screen page on
 * Android. `presentation="sheet"` draws it as a full-height bottom sheet.
 *
 * It renders from props and nothing else. Switches are held locally until one
 * press hands the whole selection to `onSave`, and closing writes nothing.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

import type { ConsentIabInitialSelection } from '../ui-model/iab-selection';
import type {
	ConsentIabDisplayModel,
	ConsentIabSelection,
	ConsentIabTab,
} from './iab-display-model';
import type { ConsentIabCopyOverrides } from './internal/iab-copy';
import { resolveIabCopy } from './internal/iab-copy';
import {
	IabBody,
	IabFooter,
	IabHeader,
	IabManageProvider,
	iabTabRoute,
	IabTabs,
	useIabDraft,
} from './internal/native/iab-manage';
import type { IabManageState } from './internal/native/iab-manage';
import { NativePage } from './internal/native/native-page';
import { NativeSheet } from './internal/native/native-sheet';
import {
	NavStackProvider,
	useNavStackState,
} from './internal/native/nav-stack';
import { ConsentStylesProvider } from './internal/native/styles-context';
import type { ConsentPartStyles } from './theme/consent-theme-parts';
import type { ConsentThemeOptions } from './theme/create-consent-theme';
import { useConsentStyles } from './theme/use-consent-styles';

/** How {@link ConsentIabPreferences} is presented. */
export type ConsentIabPreferencesPresentation = 'page' | 'sheet';

/** Props for {@link ConsentIabPreferences.Root}. */
export interface ConsentIabPreferencesRootProps {
	/**
	 * The slots to draw, for a host that wants to add to them or leave one out.
	 * Defaults to the header, the tabs, the body, and the footer.
	 */
	readonly children?: ReactNode;
	/** Copy overrides, merged over the English defaults. */
	readonly copy?: ConsentIabCopyOverrides;
	/** What the subject has already decided. Omitted entries start off. */
	readonly initialSelection?: ConsentIabInitialSelection;
	/** Tab to open on. Defaults to `purposes`. */
	readonly initialTab?: ConsentIabTab;
	/** The disclosure, from `@c15t/iab`'s display model. */
	readonly model: ConsentIabDisplayModel;
	/**
	 * Called when the subject leaves without deciding. On iOS the subject can
	 * also swipe the page away, and this fires after it has gone.
	 */
	readonly onClose: () => void;
	/**
	 * Take the subject's decision, once, as a whole selection. Close the
	 * centre from here.
	 *
	 * @param selection - Every decision on the surface.
	 */
	readonly onSave: (selection: ConsentIabSelection) => void;
	/** Whether the centre is open. */
	readonly open: boolean;
	/**
	 * `page` (the default) opens a page sheet on iOS and a full-screen page on
	 * Android. `sheet` opens a full-height bottom sheet on both.
	 */
	readonly presentation?: ConsentIabPreferencesPresentation;
	/** Per-part style overrides. */
	readonly styles?: ConsentPartStyles;
	/** Theme overrides, such as `darkTheme` or a brand `primary`. */
	readonly theme?: ConsentThemeOptions;
}

/** The slots, in order, when `children` is omitted. */
const DEFAULT_SLOTS = (
	<>
		<IabHeader />
		<IabTabs />
		<IabBody />
		<IabFooter />
	</>
);

/**
 * Hold the draft and present the centre.
 *
 * @param props - Root props.
 * @returns The page or sheet.
 */
const ConsentIabPreferencesRoot = ({
	children = DEFAULT_SLOTS,
	copy: overrides,
	initialSelection,
	initialTab = 'purposes',
	model,
	onClose,
	onSave,
	open,
	presentation = 'page',
	styles,
	theme,
}: ConsentIabPreferencesRootProps): ReactElement => {
	const copy = useMemo(() => resolveIabCopy(overrides), [overrides]);
	const surface = useConsentStyles({ styles, theme });
	const root = iabTabRoute(initialTab);
	const stack = useNavStackState(root);
	const draft = useIabDraft({ initialSelection, model, onSave });
	const [wasOpen, setWasOpen] = useState(open);

	// Each opening is a fresh session: switches moved and abandoned last time,
	// the search, and the screen the subject left on are gone. The content
	// stays as it was while closing, so the page slides away with it on.
	if (open !== wasOpen) {
		setWasOpen(open);

		if (open) {
			draft.reset();
			stack.reset();
		}
	}

	const close = useCallback(() => {
		onClose();
	}, [onClose]);

	const back = useCallback(() => {
		if (!stack.pop()) {
			onClose();
		}
	}, [onClose, stack]);

	const manage = useMemo<IabManageState>(
		() => ({
			copy,
			model,
			onAction: draft.onAction,
			onClose: close,
			onToggle: draft.onToggle,
			query: draft.query,
			selection: draft.selection,
			setQuery: draft.setQuery,
		}),
		[close, copy, draft, model]
	);

	const content = (
		<IabManageProvider value={manage}>
			<View style={{ flex: 1 }}>{children}</View>
		</IabManageProvider>
	);

	return (
		<ConsentStylesProvider value={surface}>
			<NavStackProvider value={stack}>
				{presentation === 'sheet' ? (
					<NativeSheet
						detent="full"
						label={copy.title}
						onBack={back}
						onCollapse={close}
						open={open}
						testID="c15t-iab-preferences"
					>
						{content}
					</NativeSheet>
				) : (
					<NativePage
						label={copy.title}
						onBack={back}
						onClose={close}
						open={open}
						testID="c15t-iab-preferences"
					>
						{content}
					</NativePage>
				)}
			</NavStackProvider>
		</ConsentStylesProvider>
	);
};

/**
 * The IAB TCF preference centre, as compound slots.
 *
 * `Root` holds the draft and the presentation. `Header`, `Tabs`, `Body`, and
 * `Footer` draw the navigation bar, the Purposes and Partners tabs, the
 * current screen, and the decisions. Render `Root` alone for all four.
 *
 * @example
 * ```tsx
 * <ConsentIabPreferences.Root
 *     model={model}
 *     onClose={() => {
 *         setOpen(false);
 *     }}
 *     onSave={(selection) => {
 *         void iab.save(selection);
 *         setOpen(false);
 *     }}
 *     open={open}
 * />
 * ```
 */
export const ConsentIabPreferences = {
	Body: IabBody,
	Footer: IabFooter,
	Header: IabHeader,
	Root: ConsentIabPreferencesRoot,
	Tabs: IabTabs,
} as const;
