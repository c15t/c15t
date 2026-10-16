/**
 * Draw a {@link Screen}'s sections as a native list.
 *
 * iOS gets an inset grouped list: rounded white groups on a grey page, uppercase
 * headers, hairlines inset to the text. Android gets a flat Material list: no
 * groups, a tinted header, no dividers, and room in the row instead.
 *
 * The list is virtualized. A partner list runs to a thousand rows, and a
 * category list of five costs nothing extra to virtualize, so one path serves
 * both. Grouping is drawn per row for the same reason: a virtualized list has
 * no element that wraps a whole section. The one exception is `inline`, for a
 * widget that sits inside the host's own scroll view, where a nested
 * virtualized list would fight it for the gesture.
 *
 * A switch row is one accessible element. The row carries the switch role, the
 * state, and the press, so VoiceOver and TalkBack read "Marketing, switch, off"
 * once and the whole row is the touch target, as in system settings.
 */

import { memo, useCallback, useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import {
	Alert,
	Image,
	Linking,
	PixelRatio,
	Pressable,
	SectionList,
	StyleSheet,
	Switch,
	Text,
	View,
} from 'react-native';
import type { SectionListData, ViewStyle } from 'react-native';

import type {
	Screen,
	ScreenRow,
	ScreenSection,
	ScreenSwitchControl,
} from '../../../ui-model/types';
import type { ConsentResolvedParts } from '../../theme/consent-theme-parts';
import type { ConsentTheme } from '../../theme/create-consent-theme';
import { selectBrandingMark } from '../branding-mark';
import { Glyph } from './glyph';
import { useNativeStyles } from './styles-context';

/** Where the "Secured by c15t" footnote links. */
const C15T_HREF = 'https://c15t.com';

/** The brand the footnote carries. */
const WORDMARK = 'c15t';

/** Edge of the c15t mark in the footnote. */
const MARK_SIZE = 15;

/** The footnote borrows the section footer's type, not its padding. */
const FOOTNOTE_TEXT = { paddingHorizontal: 0, paddingTop: 0 } as const;

/**
 * Open a URL outside the app.
 *
 * `openURL` rejects when nothing on the device claims the scheme. A link that
 * cannot open is not a consent failure, and there is nothing else to offer.
 *
 * @param url - Where to go.
 */
const openExternal = async (url: string): Promise<void> => {
	try {
		await Linking.openURL(url);
	} catch {
		// The platform could not open the link; consent remains unchanged.
	}
};

/** Props for {@link ScreenList}. */
/** Labels a list needs that its screen does not carry. */
export interface ListLabels {
	/** Spoken after a row's title on the button that explains the row. */
	readonly moreInfo: string;
	/** Dismisses an explanation alert. */
	readonly ok: string;
}

/** Props for {@link ScreenList}. */
export interface ScreenListProps {
	/** Shown above the first section, such as the screen's intro. */
	readonly header?: ReactNode;
	/**
	 * Draw the rows as plain views that size to their content, for a list
	 * placed inside a scroll view the host owns.
	 */
	readonly inline?: boolean;
	/** Labels the list needs that the screen does not carry. */
	readonly labels: ListLabels;
	/**
	 * Push a screen.
	 *
	 * @param route - Screen id from a row's `navigatesTo`.
	 */
	readonly onNavigate?: (route: string) => void;
	/**
	 * Move a switch.
	 *
	 * @param rowId - Row id, which is also the key the switch writes.
	 * @param value - New position.
	 */
	readonly onToggle: (rowId: string, value: boolean) => void;
	/** Screen whose sections to draw. */
	readonly screen: Screen;
	/** Locator for UI tests. */
	readonly testID?: string;
}

/** A section as the list holds it. */
interface ListSection {
	readonly data: readonly ScreenRow[];
	readonly section: ScreenSection;
}

/**
 * The grouping of one row inside its section.
 *
 * iOS rounds the outer corners of the first and last rows, which draws the
 * group without an element around it. The color, inset, and radius come from
 * the `section` part, so a host override of the part still reaches every row.
 *
 * @param parts - Parts in force.
 * @param first - Whether the row opens its section.
 * @param last - Whether the row closes its section.
 * @returns The style for the row's wrapper.
 */
const groupStyle = function groupStyle(
	parts: ConsentResolvedParts,
	first: boolean,
	last: boolean
): ViewStyle {
	const { borderRadius, ...section } = parts.section;
	const radius = typeof borderRadius === 'number' ? borderRadius : 0;

	return {
		...section,
		borderBottomLeftRadius: last ? radius : 0,
		borderBottomRightRadius: last ? radius : 0,
		borderTopLeftRadius: first ? radius : 0,
		borderTopRightRadius: first ? radius : 0,
	};
};

/** Props for {@link ListRow}. */
interface ListRowProps {
	readonly first: boolean;
	readonly last: boolean;
	readonly moreInfo: string;
	readonly ok: string;
	readonly onNavigate: ((route: string) => void) | undefined;
	readonly onToggle: (rowId: string, value: boolean) => void;
	readonly parts: ConsentResolvedParts;
	readonly row: ScreenRow;
	readonly theme: ConsentTheme;
}

const RowTexts = ({
	row,
	parts,
	theme,
}: Pick<ListRowProps, 'row' | 'parts' | 'theme'>): ReactElement => (
	<View style={{ flex: 1, gap: 2 }}>
		<Text
			style={[
				parts.rowTitle,
				row.control?.kind === 'link' ? { color: theme.colors.primary } : null,
			]}
		>
			{row.title}
		</Text>
		{row.detail === undefined ? null : (
			<Text style={parts.rowDetail}>{row.detail}</Text>
		)}
	</View>
);

const RowInfo = ({
	row,
	moreInfo,
	ok,
	theme,
}: Pick<
	ListRowProps,
	'row' | 'moreInfo' | 'ok' | 'theme'
>): ReactElement | null => {
	if (row.info === undefined) {
		return null;
	}
	return (
		<Pressable
			accessibilityLabel={`${row.title}, ${moreInfo}`}
			accessibilityRole="button"
			hitSlop={8}
			onPress={() => Alert.alert(row.title, row.info, [{ text: ok }])}
			style={{
				alignItems: 'center',
				height: theme.metrics.hitTarget,
				justifyContent: 'center',
				width: theme.metrics.hitTarget,
			}}
		>
			<Glyph
				color={theme.colors.primary}
				name="info"
				size={22}
			/>
		</Pressable>
	);
};

const RowSwitch = ({
	control,
	hidden = false,
	onToggle,
	rowId,
	theme,
	title,
}: {
	readonly control: ScreenSwitchControl;
	readonly hidden?: boolean;
	readonly onToggle: ListRowProps['onToggle'];
	readonly rowId: string;
	readonly theme: ConsentTheme;
	readonly title: string;
}): ReactElement => {
	let thumbColor: string | undefined;
	if (theme.platform !== 'ios') {
		thumbColor = control.value
			? theme.colors.onPrimary
			: theme.colors.secondaryLabel;
	}
	return (
		<Switch
			accessibilityElementsHidden={hidden}
			importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
			accessibilityLabel={title}
			accessibilityRole="switch"
			accessibilityState={{
				checked: control.value,
				disabled: control.disabled,
			}}
			disabled={control.disabled}
			ios_backgroundColor={theme.colors.fill}
			onValueChange={(value) => onToggle(rowId, value)}
			thumbColor={thumbColor}
			trackColor={{ false: theme.colors.fill, true: theme.colors.primary }}
			value={control.value}
		/>
	);
};

const rowLabel = (row: ScreenRow): string => {
	if (row.control?.kind === 'value') {
		return `${row.title}, ${row.control.text}`;
	}
	return row.detail === undefined ? row.title : `${row.title}, ${row.detail}`;
};

const RowValue = ({
	row,
	parts,
}: Pick<ListRowProps, 'row' | 'parts'>): ReactElement | null =>
	row.control?.kind === 'value' ? (
		<Text style={parts.rowValue}>{row.control.text}</Text>
	) : null;

const SwitchRow = ({
	row,
	parts,
	theme,
	moreInfo,
	ok,
	onNavigate,
	onToggle,
	control,
}: Pick<
	ListRowProps,
	'row' | 'parts' | 'theme' | 'moreInfo' | 'ok' | 'onNavigate' | 'onToggle'
> & { readonly control: ScreenSwitchControl }): ReactElement => {
	const { navigatesTo } = row;
	const texts = (
		<RowTexts
			row={row}
			parts={parts}
			theme={theme}
		/>
	);
	const info = (
		<RowInfo
			row={row}
			moreInfo={moreInfo}
			ok={ok}
			theme={theme}
		/>
	);
	const chevron =
		theme.platform === 'ios' ? (
			<Glyph
				color={theme.colors.secondaryLabel}
				name="chevronForward"
				size={14}
			/>
		) : null;
	let body: ReactElement;
	if (navigatesTo === undefined) {
		const toggle = (): void => {
			onToggle(row.id, !control.value);
		};

		body = (
			<View
				style={[
					parts.row,
					{ paddingRight: row.info === undefined ? undefined : 0 },
				]}
			>
				<Pressable
					accessibilityHint={row.detail}
					accessibilityLabel={row.title}
					accessibilityRole="switch"
					accessibilityState={{
						checked: control.value,
						disabled: control.disabled,
					}}
					android_ripple={{ color: theme.colors.fill }}
					disabled={control.disabled}
					onPress={toggle}
					style={{
						alignItems: 'center',
						flex: 1,
						flexDirection: 'row',
						gap: parts.row.gap,
					}}
				>
					{texts}
					<RowSwitch
						control={control}
						hidden
						onToggle={onToggle}
						rowId={row.id}
						theme={theme}
						title={row.title}
					/>
				</Pressable>
				{info}
			</View>
		);
	} else {
		body = (
			<View style={parts.row}>
				<Pressable
					accessibilityHint={row.detail}
					accessibilityLabel={row.title}
					accessibilityRole="button"
					android_ripple={{ color: theme.colors.fill }}
					onPress={() => onNavigate?.(navigatesTo)}
					style={{
						alignItems: 'center',
						flex: 1,
						flexDirection: 'row',
						minHeight: theme.metrics.hitTarget,
					}}
				>
					{texts}
					{chevron}
				</Pressable>
				<RowSwitch
					control={control}
					onToggle={onToggle}
					rowId={row.id}
					theme={theme}
					title={row.title}
				/>
				{info}
			</View>
		);
	}
	return body;
};

/**
 * Draw one row.
 *
 * Memoised so moving one switch re-renders that row only. A partner list has
 * hundreds of them.
 */
const ListRowComponent = ({
	first,
	last,
	moreInfo,
	ok,
	onNavigate,
	onToggle,
	parts,
	row,
	theme,
}: ListRowProps): ReactElement => {
	const ios = theme.platform === 'ios';
	const { control, navigatesTo } = row;
	const pressedStyle = ios ? { backgroundColor: theme.colors.fill } : undefined;

	const texts = (
		<RowTexts
			row={row}
			parts={parts}
			theme={theme}
		/>
	);
	const info = (
		<RowInfo
			row={row}
			moreInfo={moreInfo}
			ok={ok}
			theme={theme}
		/>
	);

	const chevron =
		ios && (navigatesTo !== undefined || control?.kind === 'link') ? (
			<Glyph
				color={theme.colors.secondaryLabel}
				name="chevronForward"
				size={14}
			/>
		) : null;

	let body: ReactElement;

	if (control?.kind === 'switch') {
		body = (
			<SwitchRow
				row={row}
				parts={parts}
				theme={theme}
				moreInfo={moreInfo}
				ok={ok}
				onNavigate={onNavigate}
				onToggle={onToggle}
				control={control}
			/>
		);
	} else if (navigatesTo !== undefined || control?.kind === 'link') {
		const press = (): void => {
			if (control?.kind === 'link') {
				void openExternal(control.url);
				return;
			}

			if (navigatesTo !== undefined) {
				onNavigate?.(navigatesTo);
			}
		};

		body = (
			<Pressable
				accessibilityHint={row.detail}
				accessibilityLabel={
					control?.kind === 'value'
						? `${row.title}, ${control.text}`
						: row.title
				}
				accessibilityRole={control?.kind === 'link' ? 'link' : 'button'}
				android_ripple={{ color: theme.colors.fill }}
				onPress={press}
				style={({ pressed }) => [parts.row, pressed ? pressedStyle : null]}
			>
				{texts}
				<RowValue
					row={row}
					parts={parts}
				/>
				{chevron}
				{info}
			</Pressable>
		);
	} else {
		body = (
			<View style={parts.row}>
				<View
					accessible
					accessibilityLabel={rowLabel(row)}
					style={{
						alignItems: 'center',
						flex: 1,
						flexDirection: 'row',
						gap: parts.row.gap,
					}}
				>
					{texts}
					<RowValue
						row={row}
						parts={parts}
					/>
				</View>
				{info}
			</View>
		);
	}

	return (
		<View style={groupStyle(parts, first, last)}>
			{body}
			{ios && !last ? (
				<View
					style={{
						backgroundColor: theme.colors.separator,
						height: StyleSheet.hairlineWidth,
						marginLeft: theme.metrics.separatorInset,
					}}
				/>
			) : null}
		</View>
	);
};

const ListRow = memo(ListRowComponent);

/** Props for {@link BrandingFootnote}. */
interface BrandingFootnoteProps {
	readonly label: string;
	readonly parts: ConsentResolvedParts;
}

/**
 * "Secured by c15t" under the last section, where iOS puts a settings footnote.
 * It is the only c15t mark on a screen, and it is a link, never a button.
 */
const BrandingFootnote = ({
	label,
	parts,
}: BrandingFootnoteProps): ReactElement => (
	<Pressable
		accessibilityLabel={`${label} ${WORDMARK}`}
		accessibilityRole="link"
		onPress={() => {
			void openExternal(C15T_HREF);
		}}
		style={parts.branding}
		testID="c15t-branding"
	>
		<Text style={[parts.sectionFooter, FOOTNOTE_TEXT]}>{label}</Text>
		<Image
			resizeMode="contain"
			source={{ uri: selectBrandingMark(PixelRatio.get()) }}
			style={{ height: MARK_SIZE, width: MARK_SIZE }}
		/>
		<Text style={[parts.sectionFooter, FOOTNOTE_TEXT, { fontWeight: '600' }]}>
			{WORDMARK}
		</Text>
	</Pressable>
);

/**
 * Draw a screen's intro, sections, empty state, and branding footnote.
 *
 * @param props - List props.
 * @returns The list.
 */
export const ScreenList = ({
	header,
	inline = false,
	labels,
	onNavigate,
	onToggle,
	screen,
	testID,
}: ScreenListProps): ReactElement => {
	const { parts, theme } = useNativeStyles();
	const sections = useMemo<readonly ListSection[]>(
		() =>
			screen.sections
				.filter((section) => section.rows.length > 0)
				.map((section) => ({ data: section.rows, section })),
		[screen.sections]
	);
	const { moreInfo, ok } = labels;

	const renderItem = useCallback(
		({
			index,
			item,
			section,
		}: {
			readonly index: number;
			readonly item: ScreenRow;
			readonly section: SectionListData<ScreenRow, ListSection>;
		}) => (
			<ListRow
				first={index === 0}
				last={index === section.data.length - 1}
				moreInfo={moreInfo}
				ok={ok}
				onNavigate={onNavigate}
				onToggle={onToggle}
				parts={parts}
				row={item}
				theme={theme}
			/>
		),
		[moreInfo, ok, onNavigate, onToggle, parts, theme]
	);

	const renderSectionHeader = useCallback(
		({
			section,
		}: {
			readonly section: SectionListData<ScreenRow, ListSection>;
		}) =>
			section.section.header === undefined ? (
				<View style={{ height: theme.spacing.m16 }} />
			) : (
				<Text
					accessibilityRole="header"
					style={parts.sectionHeader}
				>
					{section.section.header}
				</Text>
			),
		[parts.sectionHeader, theme.spacing.m16]
	);

	const renderSectionFooter = useCallback(
		({
			section,
		}: {
			readonly section: SectionListData<ScreenRow, ListSection>;
		}) =>
			section.section.footer === undefined ? null : (
				<Text style={parts.sectionFooter}>{section.section.footer}</Text>
			),
		[parts.sectionFooter]
	);

	const empty =
		screen.empty === undefined ? undefined : (
			<Text
				accessibilityLiveRegion="polite"
				style={parts.empty}
			>
				{screen.empty}
			</Text>
		);
	const footer =
		screen.branding === undefined ? undefined : (
			<BrandingFootnote
				label={screen.branding}
				parts={parts}
			/>
		);
	const lead =
		header === undefined && screen.intro === undefined ? undefined : (
			<View style={{ paddingHorizontal: theme.spacing.m16 }}>
				{header}
				{screen.intro === undefined ? null : (
					<Text style={parts.intro}>{screen.intro}</Text>
				)}
			</View>
		);

	if (inline) {
		return (
			<View testID={testID}>
				{lead}
				{sections.length === 0
					? empty
					: sections.map((section) => (
							<View key={section.section.id}>
								{renderSectionHeader({ section })}
								{section.data.map((item, index) => (
									<View key={item.id}>
										{renderItem({ index, item, section })}
									</View>
								))}
								{renderSectionFooter({ section })}
							</View>
						))}
				{footer}
			</View>
		);
	}

	return (
		<SectionList<ScreenRow, ListSection>
			contentContainerStyle={{ paddingBottom: theme.spacing.m16 }}
			keyboardDismissMode="on-drag"
			keyboardShouldPersistTaps="handled"
			keyExtractor={(row) => row.id}
			ListEmptyComponent={empty}
			ListFooterComponent={footer}
			ListHeaderComponent={lead}
			renderItem={renderItem}
			renderSectionFooter={renderSectionFooter}
			renderSectionHeader={renderSectionHeader}
			sections={sections}
			stickySectionHeadersEnabled={false}
			style={parts.list}
			testID={testID}
		/>
	);
};
