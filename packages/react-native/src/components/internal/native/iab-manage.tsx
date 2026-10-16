/**
 * The IAB manage flow both IAB surfaces share.
 *
 * `ConsentIabBanner` grows its sheet into it, and `ConsentIabPreferences`
 * presents it as a page or a sheet. The draft, the search text, the screens
 * each route draws, and the four slots that draw them live here once, so the
 * surfaces only pick the chrome around them.
 *
 * It renders from props and nothing else. Every switch the subject moves is
 * held locally until one press hands the whole selection to `onSave`, and
 * leaving writes nothing.
 */

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

import {
	buildIabPurposeDetail,
	buildIabPurposes,
	buildIabVendorDetail,
	buildIabVendors,
	IAB_PURPOSES_SCREEN,
	IAB_VENDORS_SCREEN,
} from '../../../ui-model/iab';
import {
	applyIabToggle,
	decideConsentIabSelection,
	seedConsentIabSelection,
} from '../../../ui-model/iab-selection';
import type { ConsentIabInitialSelection } from '../../../ui-model/iab-selection';
import type { Screen, ScreenActionId } from '../../../ui-model/types';
import type {
	ConsentIabDisplayModel,
	ConsentIabSelection,
	ConsentIabTab,
} from '../../iab-display-model';
import type { ConsentIabCopy } from '../iab-copy';
import { withTotal } from '../iab-copy';
import { ActionFooter } from './action-button';
import { ScreenList } from './list';
import { NavBar, NavStackView, useNavStack } from './nav-stack';
import { SearchField } from './search-field';
import { SegmentedControl } from './segmented-control';

/** Prefix of a partner's detail route. */
const VENDOR_ROUTE_PREFIX = 'vendor.';

/**
 * The root route for a tab.
 *
 * @param tab - Tab to open on.
 * @returns Its route id.
 */
export const iabTabRoute = function iabTabRoute(tab: ConsentIabTab): string {
	return tab === 'vendors' ? IAB_VENDORS_SCREEN : IAB_PURPOSES_SCREEN;
};

/** Inputs of {@link buildIabRoute}. */
interface IabRouteInput {
	readonly copy: ConsentIabCopy;
	readonly model: ConsentIabDisplayModel;
	readonly query: string;
	readonly route: string;
	readonly selection: ConsentIabSelection;
}

/**
 * The screen a route draws.
 *
 * @param input - Copy, disclosure, draft, search text, and route.
 * @returns The screen, or `null` when the route names nothing in the model.
 */
export const buildIabRoute = function buildIabRoute({
	copy,
	model,
	query,
	route,
	selection,
}: IabRouteInput): Screen | null {
	if (route === IAB_PURPOSES_SCREEN) {
		return buildIabPurposes({ copy, model, selection });
	}

	if (route === IAB_VENDORS_SCREEN) {
		return buildIabVendors({ copy, model, query, selection });
	}

	if (route.startsWith(VENDOR_ROUTE_PREFIX)) {
		return buildIabVendorDetail({
			copy,
			model,
			selection,
			vendorId: route.slice(VENDOR_ROUTE_PREFIX.length),
		});
	}

	return buildIabPurposeDetail({ copy, model, routeId: route, selection });
};

/** What the slots read from the flow they sit in. */
export interface IabManageState {
	/** Copy in force. */
	readonly copy: ConsentIabCopy;
	/** Disclosure to render. */
	readonly model: ConsentIabDisplayModel;
	/**
	 * Run one of the footer's actions: save the draft, or move everything one
	 * way.
	 *
	 * @param id - Action pressed.
	 */
	readonly onAction: (id: ScreenActionId) => void;
	/**
	 * Leave the root screen without writing, from the navigation bar. Absent
	 * when there is nowhere to leave to.
	 */
	readonly onBack?: () => void;
	/** Close the whole surface without writing. Absent inside a banner. */
	readonly onClose?: () => void;
	/**
	 * Move one switch.
	 *
	 * @param rowId - Row id, which is also the key the switch writes.
	 * @param value - New position.
	 */
	readonly onToggle: (rowId: string, value: boolean) => void;
	/** Partner search text. It survives a trip into a partner and back. */
	readonly query: string;
	/** Draft the switches show. */
	readonly selection: ConsentIabSelection;
	/**
	 * Change the partner search text.
	 *
	 * @param query - New text.
	 */
	readonly setQuery: (query: string) => void;
}

/** Options for {@link useIabDraft}. */
export interface UseIabDraftOptions {
	/** What the subject has already decided. */
	readonly initialSelection?: ConsentIabInitialSelection;
	/** Disclosure the rows come from. */
	readonly model: ConsentIabDisplayModel;
	/**
	 * Take a whole selection, once, when the subject decides.
	 *
	 * @param selection - Every decision on the surface.
	 */
	readonly onSave: (selection: ConsentIabSelection) => void;
}

/** What {@link useIabDraft} hands a surface. */
export interface IabDraft {
	/**
	 * Run a decision: `save` hands over the draft, `acceptAll` and `rejectAll`
	 * hand over everything moved one way. Other ids do nothing here.
	 *
	 * @param id - Action pressed.
	 */
	readonly onAction: (id: ScreenActionId) => void;
	/**
	 * Move one switch.
	 *
	 * @param rowId - Row id.
	 * @param value - New position.
	 */
	readonly onToggle: (rowId: string, value: boolean) => void;
	/** Partner search text. */
	readonly query: string;
	/** Start again from what the subject has decided, with no search. */
	readonly reset: () => void;
	/** Draft the switches show. */
	readonly selection: ConsentIabSelection;
	/**
	 * Change the partner search text.
	 *
	 * @param query - New text.
	 */
	readonly setQuery: (query: string) => void;
}

/**
 * Hold the IAB draft and hand it over on a decision.
 *
 * After a decision the switches go back to `initialSelection`, so a surface
 * opened again shows what was written, once the caller passes it back in, and
 * not the draft that was.
 *
 * @param options - Disclosure, standing, and the write callback.
 * @returns The draft and its handlers.
 */
export const useIabDraft = function useIabDraft({
	initialSelection,
	model,
	onSave,
}: UseIabDraftOptions): IabDraft {
	const [selection, setSelection] = useState(() =>
		seedConsentIabSelection(model, initialSelection)
	);
	const [query, setQuery] = useState('');

	const reset = useCallback(() => {
		setSelection(seedConsentIabSelection(model, initialSelection));
		setQuery('');
	}, [initialSelection, model]);

	const onToggle = useCallback(
		(rowId: string, value: boolean) => {
			setSelection((current) => applyIabToggle(model, current, rowId, value));
		},
		[model]
	);

	const onAction = useCallback(
		(id: ScreenActionId) => {
			let next: ConsentIabSelection | null = null;
			if (id === 'save') {
				next = selection;
			} else if (id === 'acceptAll') {
				next = decideConsentIabSelection(model, true);
			} else if (id === 'rejectAll') {
				next = decideConsentIabSelection(model, false);
			}

			if (next === null) {
				return;
			}

			onSave(next);
			setSelection(seedConsentIabSelection(model, initialSelection));
		},
		[initialSelection, model, onSave, selection]
	);

	return { onAction, onToggle, query, reset, selection, setQuery };
};

/** `null` outside a flow, which is what makes the accessor throw. */
const IabManageContext = createContext<IabManageState | null>(null);

/** Provide a flow to the slots. */
export const IabManageProvider = IabManageContext.Provider;

/**
 * Read the flow a slot was rendered inside.
 *
 * @returns The draft, copy, and callbacks.
 * @throws {Error} When rendered outside `ConsentIabPreferences.Root` or a banner.
 */
export const useIabManage = function useIabManage(): IabManageState {
	const value = useContext(IabManageContext);

	if (value === null) {
		throw new Error(
			'@c15t/react-native: this component has to be rendered inside ConsentIabPreferences.Root, so that it can read the disclosure it belongs to.'
		);
	}

	return value;
};

/**
 * The screen a route draws, from the flow in context.
 *
 * @param route - Route to draw.
 * @returns The screen, or `null` when the route names nothing.
 */
const useIabScreen = function useIabScreen(route: string): Screen | null {
	const { copy, model, query, selection } = useIabManage();

	return useMemo(
		() => buildIabRoute({ copy, model, query, route, selection }),
		[copy, model, query, route, selection]
	);
};

/**
 * The navigation bar: the top screen's title, back once something is pushed,
 * and close where the surface can be closed.
 *
 * @returns The header slot.
 */
export const IabHeader = (): ReactElement => {
	const { copy, onBack, onClose } = useIabManage();
	const stack = useNavStack();
	const screen = useIabScreen(stack.top);
	const title = stack.depth === 1 ? copy.title : (screen?.title ?? copy.title);

	return (
		// Keyed on the route so the title takes focus on every push and pop.
		<NavBar
			backLabel={copy.back}
			closeLabel={copy.close}
			key={stack.top}
			onBack={onBack}
			onClose={onClose}
			title={title}
		/>
	);
};

/**
 * Purposes and Partners, shown on the root screen only.
 *
 * @returns The tabs slot.
 */
export const IabTabs = (): ReactElement | null => {
	const { copy, model } = useIabManage();
	const stack = useNavStack();
	const segments = useMemo(
		() => [
			{
				id: IAB_PURPOSES_SCREEN,
				label: withTotal(copy.purposes, model.purposeTabCount),
			},
			{
				id: IAB_VENDORS_SCREEN,
				label: withTotal(copy.vendors, model.vendors.length),
			},
		],
		[copy.purposes, copy.vendors, model.purposeTabCount, model.vendors.length]
	);

	if (stack.depth > 1) {
		return null;
	}

	return (
		<SegmentedControl
			onChange={(route) => stack.replace(route)}
			segments={segments}
			selected={stack.top}
		/>
	);
};

/** Props for {@link IabRouteScreen}. */
interface IabRouteScreenProps {
	readonly route: string;
}

/**
 * One route's list.
 *
 * @param props - The route to draw.
 * @returns The list, or nothing when the route names nothing.
 */
const IabRouteScreen = ({
	route,
}: IabRouteScreenProps): ReactElement | null => {
	const { copy, onToggle, query, setQuery } = useIabManage();
	const stack = useNavStack();
	const screen = useIabScreen(route);
	const handleNavigate = stack.push;

	useEffect(() => {
		if (screen === null && stack.top === route) {
			stack.pop();
		}
	}, [route, screen, stack]);

	if (screen === null) {
		return null;
	}

	return (
		<ScreenList
			header={
				route === IAB_VENDORS_SCREEN ? (
					<SearchField
						onChange={setQuery}
						placeholder={copy.search}
						value={query}
					/>
				) : undefined
			}
			labels={{ moreInfo: copy.moreInfo, ok: copy.ok }}
			onNavigate={handleNavigate}
			onToggle={onToggle}
			screen={screen}
			testID={`c15t-iab-${route}`}
		/>
	);
};

/** Draw one route. */
const renderRoute = (route: string): ReactNode => (
	<IabRouteScreen route={route} />
);

/**
 * The current screen, sliding as screens are pushed and popped.
 *
 * @returns The body slot.
 */
export const IabBody = (): ReactElement => (
	<View style={{ flex: 1 }}>
		<NavStackView renderRoute={renderRoute} />
	</View>
);

/**
 * Save, then Reject all and Accept all as an equal pair. The same three stay
 * under every screen, so a decision is one press from anywhere in the flow.
 *
 * @returns The footer slot.
 */
export const IabFooter = (): ReactElement => {
	const { onAction } = useIabManage();
	const stack = useNavStack();
	const root = useIabScreen(stack.routes[0] ?? IAB_PURPOSES_SCREEN);

	return (
		<ActionFooter
			actions={root?.actions ?? []}
			onAction={onAction}
		/>
	);
};
