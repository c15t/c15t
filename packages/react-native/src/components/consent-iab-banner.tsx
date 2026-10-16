/**
 * The IAB TCF first layer as a bottom sheet.
 *
 * It says what the site's partners do, how many there are, and offers Accept
 * all and Reject all as an equal pair. "Manage options" grows the same sheet
 * to full height and opens the purposes and partners inside it, the way the
 * standard banner grows into its category list.
 *
 * TCF always asks for a choice, so the sheet cannot be swiped or tapped away.
 * Collapsing it from the manage screens goes back to the first layer, and
 * hardware back walks back through the screens without writing.
 *
 * It renders from props and nothing else: the rows arrive on `model` in the
 * shape `@c15t/iab`'s display model publishes, and every decision leaves as
 * one `onSave` call. The caller owns `open` and closes the sheet once the
 * selection is written.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { View } from 'react-native';

import {
	buildIabFirstLayer,
	IAB_PURPOSES_SCREEN,
	IAB_VENDORS_SCREEN,
} from '../ui-model/iab';
import type { ConsentIabInitialSelection } from '../ui-model/iab-selection';
import type { ScreenActionId } from '../ui-model/types';
import type {
	ConsentIabDisplayModel,
	ConsentIabSelection,
} from './iab-display-model';
import type { ConsentIabCopyOverrides } from './internal/iab-copy';
import { resolveIabCopy } from './internal/iab-copy';
import { FirstLayer } from './internal/native/first-layer';
import {
	IabBody,
	IabFooter,
	IabHeader,
	IabManageProvider,
	IabTabs,
	useIabDraft,
} from './internal/native/iab-manage';
import type { IabManageState } from './internal/native/iab-manage';
import { NativeSheet } from './internal/native/native-sheet';
import {
	NavStackProvider,
	useNavStackState,
} from './internal/native/nav-stack';
import { ConsentStylesProvider } from './internal/native/styles-context';
import type { ConsentPartStyles } from './theme/consent-theme-parts';
import type { ConsentThemeOptions } from './theme/create-consent-theme';
import { useConsentStyles } from './theme/use-consent-styles';

/** Props for {@link ConsentIabBanner}. */
export interface ConsentIabBannerProps {
	/** Copy overrides, merged over the English defaults. */
	readonly copy?: ConsentIabCopyOverrides;
	/**
	 * What the subject has already decided, so the manage screens open on it.
	 * Omitted entries start off.
	 */
	readonly initialSelection?: ConsentIabInitialSelection;
	/** The disclosure, from `@c15t/iab`'s display model. */
	readonly model: ConsentIabDisplayModel;
	/**
	 * Take the subject's decision, once, as a whole selection. Accept all and
	 * Reject all hand over everything moved one way; Save hands over the
	 * switches as they stand. Close the sheet from here.
	 *
	 * @param selection - Every decision on the surface.
	 */
	readonly onSave: (selection: ConsentIabSelection) => void;
	/** Whether the sheet is showing. */
	readonly open: boolean;
	/** Per-part style overrides. */
	readonly styles?: ConsentPartStyles;
	/** Theme overrides, such as `darkTheme` or a brand `primary`. */
	readonly theme?: ConsentThemeOptions;
}

/**
 * Render the IAB TCF first layer.
 *
 * @example
 * ```tsx
 * <ConsentIabBanner
 *     model={model}
 *     onSave={(selection) => {
 *         void iab.save(selection);
 *     }}
 *     open={iab.owed}
 * />
 * ```
 *
 * @param props - Banner props.
 * @returns The sheet.
 */
export const ConsentIabBanner = ({
	copy: overrides,
	initialSelection,
	model,
	onSave,
	open,
	styles,
	theme,
}: ConsentIabBannerProps): ReactElement => {
	const copy = useMemo(() => resolveIabCopy(overrides), [overrides]);
	const surface = useConsentStyles({ styles, theme });
	const stack = useNavStackState(IAB_PURPOSES_SCREEN);
	const draft = useIabDraft({ initialSelection, model, onSave });
	const [managing, setManaging] = useState(false);
	const [shown, setShown] = useState(open);

	// Asked again later, the sheet starts from the first layer with the
	// switches as the subject left them. Reset on the way in, so the sheet does
	// not snap back while it is still sliding away.
	if (open !== shown) {
		setShown(open);

		if (open && managing) {
			setManaging(false);
		}
	}

	const screen = useMemo(
		() => buildIabFirstLayer({ copy, model }),
		[copy, model]
	);

	const enter = useCallback(
		(route: string) => {
			draft.reset();
			stack.reset();
			stack.replace(route);
			setManaging(true);
		},
		[draft, stack]
	);

	const leave = useCallback(() => {
		setManaging(false);
	}, []);

	const onFirstLayerAction = useCallback(
		(id: ScreenActionId) => {
			if (id === 'manage') {
				enter(IAB_PURPOSES_SCREEN);
			} else {
				draft.onAction(id);
			}
		},
		[draft, enter]
	);

	const onFirstLayerNavigate = useCallback(
		(route: string) => {
			if (route === IAB_VENDORS_SCREEN || route === IAB_PURPOSES_SCREEN) {
				enter(route);
				return;
			}

			// A detail opens over the purposes tab, so back lands on the list.
			enter(IAB_PURPOSES_SCREEN);
			stack.push(route);
		},
		[enter, stack]
	);

	const back = useCallback(() => {
		if (managing && !stack.pop()) {
			setManaging(false);
		}
	}, [managing, stack]);

	const manage = useMemo<IabManageState>(
		() => ({
			copy,
			model,
			onAction: draft.onAction,
			onBack: leave,
			onToggle: draft.onToggle,
			query: draft.query,
			selection: draft.selection,
			setQuery: draft.setQuery,
		}),
		[copy, draft, leave, model]
	);

	return (
		<ConsentStylesProvider value={surface}>
			<NavStackProvider value={stack}>
				<IabManageProvider value={manage}>
					<NativeSheet
						detent={managing ? 'full' : 'content'}
						label={managing ? copy.title : screen.title}
						onBack={back}
						onCollapse={leave}
						open={open}
						testID="c15t-iab-banner"
					>
						{managing ? (
							<View style={{ flex: 1 }}>
								<IabHeader />
								<IabTabs />
								<IabBody />
								<IabFooter />
							</View>
						) : (
							<FirstLayer
								labels={{ moreInfo: copy.moreInfo, ok: copy.ok }}
								onAction={onFirstLayerAction}
								onNavigate={onFirstLayerNavigate}
								open={open}
								screen={screen}
							/>
						)}
					</NativeSheet>
				</IabManageProvider>
			</NavStackProvider>
		</ConsentStylesProvider>
	);
};
