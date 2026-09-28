/**
 * The rows an IAB disclosure is made of.
 *
 * Three shapes, one per thing the model can hand over: a row with one toggle, a
 * stack that groups N toggles, and a partner whose claims are listed rather than
 * switched. Each is the web's own card -- a hairline on `--c15t-radius-md`, a
 * 12-point header, and 12 between the text, the disclosure, and the control --
 * and each keeps the disclosure's own switch and glyph sizes, which are a sixth
 * smaller than the consent dialog's.
 *
 * None of them owns a decision. A row reads one boolean and reports a press;
 * the selection lives in the drawer, which is what lets the surface hold every
 * edit locally and write the whole of it once.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import type {
	ConsentIabDisplayModel,
	ConsentIabDisplayRow,
	ConsentIabDisplayStackRow,
	ConsentIabProcessedVendor,
} from '../iab-display-model';
import { MIN_TAP_TARGET } from '../theme/consent-theme-parts';
import type { ConsentResolvedParts } from '../theme/consent-theme-parts';
import type { ConsentTheme } from '../theme/create-consent-theme';
import {
	CONSENT_IAB_DISCLOSURE_GEOMETRY,
	CONSENT_IAB_SWITCH_GEOMETRY,
} from '../theme/use-consent-styles';
import { ConsentDisclosureGlyph } from './consent-disclosure-glyph';
import { ConsentSwitch } from './consent-switch';
import type { ConsentIabCopy } from './iab-copy';
import { partnerClaims, withCount, withTotal } from './iab-copy';

/** The text column takes what the glyph and the control do not need. */
const TEXT_COLUMN: ViewStyle = { flex: 1, minWidth: 0 };

/**
 * The glyph and the label as one group.
 *
 * `.purposeTrigger` is `gap: .5rem` between a 16-point arrow and the text, and
 * it is that pair which then sits 12 from the switch, so the two gaps belong to
 * two different containers: 8 here and the header's own 12 outside.
 */
const LABEL_ROW: ViewStyle = {
	alignItems: 'flex-start',
	flex: 1,
	flexDirection: 'row',
	gap: 8,
	minWidth: 0,
};

/** The control keeps its own width at the trailing end of the header. */
const CONTROL_COLUMN: ViewStyle = { alignItems: 'flex-end' };

/** The stack of lines a stack or partner opens to. */
const STACKED: ViewStyle = { gap: 8 };

/**
 * `Pressable`'s touch inset, in plain points.
 *
 * Spelled per file for the reason `consent-button.tsx` gives: the `hitSlop` type
 * is a structural shape React Native has renamed between releases, and these
 * components only ever pass numbers.
 */
interface TouchInset {
	bottom?: number;
	left?: number;
	right?: number;
	top?: number;
}

/**
 * The touch area a row header asks for.
 *
 * A collapsed row is 12 + a line of title + 12, which is under the 44 a fingertip
 * needs, so the shortfall goes on the hit area and never on the drawn box -- the
 * same bargain every other control here makes.
 *
 * @param parts - Parts in force for this surface.
 * @returns An inset for `hitSlop`, or `undefined` when the box clears the floor.
 */
const hitSlopFor = function hitSlopFor(
	parts: ConsentResolvedParts
): TouchInset | undefined {
	const header = parts.rowHeader;
	// Either spelling of the inset, and only when it is a plain number: a part may
	// carry a percentage or an em, and a row header that does is not worth a
	// derived inset, so it falls back to the drawn line alone.
	const declared = header.padding ?? header.paddingVertical ?? 0;
	const padding = typeof declared === 'number' ? declared : 0;
	const title = parts.rowTitle;
	const drawn = padding * 2 + (title.lineHeight ?? 0) + 2;
	const inset = Math.ceil((MIN_TAP_TARGET - drawn) / 2);

	if (inset <= 0) {
		return undefined;
	}

	return { bottom: inset, left: inset, right: inset, top: inset };
};

/**
 * How many distinct partners claim a set of rows.
 *
 * A stack's meta line counts partners, not claims, so a partner that appears
 * under three of the stack's purposes is still one name in the number, which is
 * how the web's `totalVendors` arrives at the same figure.
 *
 * @param rows - Rows whose partners are being counted.
 * @param rows.vendors - Partners claiming each row.
 * @returns Distinct partner ids.
 */
export const distinctVendorCount = function distinctVendorCount(
	rows: { vendors: ConsentIabProcessedVendor[] }[]
): number {
	const ids = new Set<string>();

	for (const row of rows) {
		for (const vendor of row.vendors) {
			ids.add(String(vendor.id));
		}
	}

	return ids.size;
};

/**
 * The `testID` for one partner row.
 *
 * The display model carries a `testId` for every purpose, stack, feature, and
 * special feature, and a row that has one always uses it. It does not carry one
 * for a partner: the web's vendors list puts no `data-testid` on a partner row at
 * all, so there is nothing to mirror, and this prefix is the surface's own.
 * It cannot collide with the model's five prefixes.
 *
 * @param id - Partner id, GVL or custom.
 * @returns A test id unique across the surface.
 */
export const consentIabVendorTestId = function consentIabVendorTestId(
	id: number | string
): string {
	return `vendor-item-${String(id)}`;
};

/**
 * One purpose row.
 *
 * @param props - Row props.
 * @param props.copy - Copy in force.
 * @param props.nested - Whether the row sits inside a stack's band.
 * @param props.onToggle - Called with the position the switch moved to.
 * @param props.parts - Parts in force.
 * @param props.row - Row to render.
 * @param props.selected - Whether the row's own consent is held.
 * @param props.theme - Theme in force.
 * @returns The row.
 */
export const ConsentIabPurposeRow = ({
	copy,
	nested = false,
	onToggle,
	parts,
	row,
	selected,
	theme,
}: {
	readonly copy: ConsentIabCopy;
	readonly nested?: boolean;
	readonly onToggle: (value: boolean) => void;
	readonly parts: ConsentResolvedParts;
	readonly row: ConsentIabDisplayRow;
	readonly selected: boolean;
	readonly theme: ConsentTheme;
}): ReactNode => {
	const [open, setOpen] = useState(false);

	return (
		<View
			style={parts.rowCard}
			testID={row.testId}
		>
			<Pressable
				accessibilityLabel={row.name}
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
				hitSlop={hitSlopFor(parts)}
				onPress={() => {
					setOpen((current) => !current);
				}}
				style={parts.rowHeader}
			>
				<View style={LABEL_ROW}>
					<ConsentDisclosureGlyph
						geometry={CONSENT_IAB_DISCLOSURE_GEOMETRY}
						open={open}
						parts={parts}
						theme={theme}
					/>
					<View style={TEXT_COLUMN}>
						<Text style={parts.rowTitle}>{row.name}</Text>
						<Text style={parts.rowMeta}>
							{withCount(copy.partners, row.vendors.length)}
						</Text>
					</View>
				</View>
				<View style={CONTROL_COLUMN}>
					<ConsentSwitch
						disabled={row.locked}
						geometry={CONSENT_IAB_SWITCH_GEOMETRY}
						label={row.name}
						onValueChange={onToggle}
						parts={parts}
						theme={theme}
						value={row.locked || selected}
					/>
				</View>
			</Pressable>
			{open ? (
				<View style={[parts.rowContent, nested ? { marginTop: 0 } : undefined]}>
					<Text style={parts.rowDescription}>{row.description}</Text>
				</View>
			) : null}
		</View>
	);
};

/**
 * One stack: a header that decides N purposes at once, and those purposes listed
 * underneath it as the rows they really are.
 *
 * Its switch reads `on` only when every member is on, and one press moves them
 * all, which is what the web's own stack control does. When they are split the
 * dot beside the switch says so, and the switch's own label carries the same
 * words for a reader: a switch that reads `on` over half-granted purposes would
 * tell the subject something untrue.
 *
 * @param props - Stack props.
 * @param props.copy - Copy in force.
 * @param props.onTogglePurpose - Records one member purpose.
 * @param props.parts - Parts in force.
 * @param props.stack - Stack to render.
 * @param props.theme - Theme in force.
 * @param props.values - Position of every purpose on the surface, by id.
 * @returns The stack.
 */
export const ConsentIabStackRow = ({
	copy,
	onTogglePurpose,
	parts,
	stack,
	theme,
	values,
}: {
	readonly copy: ConsentIabCopy;
	readonly onTogglePurpose: (purposeId: number, value: boolean) => void;
	readonly parts: ConsentResolvedParts;
	readonly stack: ConsentIabDisplayStackRow;
	readonly theme: ConsentTheme;
	readonly values: Record<number, boolean>;
}): ReactNode => {
	const [open, setOpen] = useState(false);
	const isOn = (purposeId: number): boolean => values[purposeId] === true;
	const allOn = stack.purposes.every((purpose) => isOn(purpose.id));
	const someOn = stack.purposes.some((purpose) => isOn(purpose.id)) && !allOn;
	const partners = distinctVendorCount(stack.purposes);

	return (
		<View
			style={parts.rowCard}
			testID={stack.testId}
		>
			<Pressable
				accessibilityLabel={stack.name}
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
				hitSlop={hitSlopFor(parts)}
				onPress={() => {
					setOpen(!open);
				}}
				style={parts.rowHeader}
			>
				<View style={LABEL_ROW}>
					<ConsentDisclosureGlyph
						geometry={CONSENT_IAB_DISCLOSURE_GEOMETRY}
						open={open}
						parts={parts}
						theme={theme}
					/>
					<View style={TEXT_COLUMN}>
						<Text style={parts.rowTitle}>{stack.name}</Text>
						<Text style={parts.rowMeta}>
							{withCount(copy.partners, partners)}
						</Text>
					</View>
				</View>
				<View style={CONTROL_COLUMN}>
					{someOn ? (
						<View
							accessibilityLabel={copy.partiallyEnabled}
							accessibilityRole="image"
							style={{
								backgroundColor: theme.colors.primary,
								borderRadius: 3,
								height: 6,
								marginBottom: 4,
								width: 6,
							}}
						/>
					) : null}
					<ConsentSwitch
						disabled={false}
						geometry={CONSENT_IAB_SWITCH_GEOMETRY}
						label={
							someOn ? `${stack.name}: ${copy.partiallyEnabled}` : stack.name
						}
						onValueChange={(value) => {
							for (const purpose of stack.purposes) {
								onTogglePurpose(purpose.id, value);
							}
						}}
						parts={parts}
						theme={theme}
						value={allOn}
					/>
				</View>
			</Pressable>
			{open ? (
				<>
					<View style={[parts.rowContent, { marginTop: 0 }]}>
						<Text style={parts.rowDescription}>{stack.description}</Text>
					</View>
					<View style={parts.stackContent}>
						{stack.purposes.map((purpose) => (
							<ConsentIabPurposeRow
								copy={copy}
								key={purpose.testId}
								nested
								onToggle={(value) => {
									onTogglePurpose(purpose.id, value);
								}}
								parts={parts}
								row={purpose}
								selected={isOn(purpose.id)}
								theme={theme}
							/>
						))}
					</View>
				</>
			) : null}
		</View>
	);
};

/**
 * The locked essential-functions section: special purposes, then features, each
 * rendered on and impossible to move.
 *
 * @param props - Section props.
 * @param props.copy - Copy in force.
 * @param props.parts - Parts in force.
 * @param props.rows - The locked rows, in render order.
 * @param props.theme - Theme in force.
 * @param props.vendorCount - Distinct partners the locked rows name.
 * @returns The section.
 */
export const ConsentIabLockedSection = ({
	copy,
	parts,
	rows,
	theme,
	vendorCount,
}: {
	readonly copy: ConsentIabCopy;
	readonly parts: ConsentResolvedParts;
	readonly rows: ConsentIabDisplayRow[];
	readonly theme: ConsentTheme;
	readonly vendorCount: number;
}): ReactNode => {
	const [open, setOpen] = useState(false);

	return (
		<View
			style={parts.rowCard}
			testID="iab-essential-section"
		>
			<Pressable
				accessibilityLabel={copy.essentialTitle}
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
				hitSlop={hitSlopFor(parts)}
				onPress={() => {
					setOpen(!open);
				}}
				style={parts.rowHeader}
			>
				<View style={LABEL_ROW}>
					{/*
					 * A padlock rather than a plus, and it is the section that carries it
					 * rather than each row inside: `.lockIcon` is 12pt in the muted tone
					 * beside `Essential Functions (Required)`, which is the line that
					 * tells the subject why nothing below it can be moved.
					 */}
					<View
						accessibilityElementsHidden
						style={{
							borderColor: parts.rowLock.borderColor,
							borderTopLeftRadius: 3,
							borderTopRightRadius: 3,
							borderWidth: 1.5,
							height: 6,
							marginTop: 3,
							width: 10,
						}}
					/>
					<View style={TEXT_COLUMN}>
						<Text style={parts.rowTitle}>{copy.essentialTitle}</Text>
						<Text style={parts.rowMeta}>
							{withCount(copy.partners, vendorCount)}
						</Text>
					</View>
				</View>
			</Pressable>
			{open ? (
				<View style={[parts.rowContent, STACKED, { marginTop: 0 }]}>
					{rows.map((row) => (
						<ConsentIabPurposeRow
							copy={copy}
							key={row.testId}
							nested
							onToggle={() => {
								// A locked row's switch is disabled, so this never runs; the
								// row still needs the prop to draw the same control as every
								// other row on the surface.
							}}
							parts={parts}
							row={row}
							selected
							theme={theme}
						/>
					))}
				</View>
			) : null}
		</View>
	);
};

/**
 * One legal-basis leg of a partner's disclosure.
 *
 * @param model - Model in force, which is where the ids become names.
 * @param vendor - Partner being disclosed.
 * @returns The legs worth listing, in the web's order.
 */
export const vendorLegs = function vendorLegs(
	model: ConsentIabDisplayModel,
	vendor: ConsentIabProcessedVendor
): {
	readonly features: string[];
	readonly legitimateInterest: string[];
	readonly purposes: string[];
	readonly specialFeatures: string[];
	readonly specialPurposes: string[];
} {
	const names = (
		entries: { id: number; name: string }[],
		ids: number[]
	): string[] =>
		ids
			.map((id) => entries.find((entry) => entry.id === id)?.name)
			.filter((name): name is string => typeof name === 'string');

	return {
		features: names(model.data.features, vendor.features),
		legitimateInterest: names(model.data.purposes, vendor.legIntPurposes),
		purposes: names(model.data.purposes, vendor.purposes),
		specialFeatures: names(model.data.specialFeatures, vendor.specialFeatures),
		specialPurposes: names(model.data.specialPurposes, vendor.specialPurposes),
	};
};

/**
 * One partner: its name, the two legal bases it claims under, and the purposes
 * behind each once the row is opened.
 *
 * @param props - Partner props.
 * @param props.copy - Copy in force.
 * @param props.model - Model in force, which turns a claimed id into a name.
 * @param props.onToggleConsent - Records the partner's consent.
 * @param props.onToggleObjection - Records an objection to the claim.
 * @param props.parts - Parts in force.
 * @param props.theme - Theme in force.
 * @param props.vendor - Partner to render.
 * @param props.vendorConsented - Whether consent for this partner is held.
 * @param props.vendorLegitimateInterest - Whether the claim is unobjected.
 * @returns The partner row.
 */
export const ConsentIabVendorRow = ({
	copy,
	model,
	onToggleConsent,
	onToggleObjection,
	parts,
	theme,
	vendor,
	vendorConsented,
	vendorLegitimateInterest,
}: {
	readonly copy: ConsentIabCopy;
	readonly model: ConsentIabDisplayModel;
	readonly onToggleConsent: (value: boolean) => void;
	readonly onToggleObjection: (value: boolean) => void;
	readonly parts: ConsentResolvedParts;
	readonly theme: ConsentTheme;
	readonly vendor: ConsentIabProcessedVendor;
	readonly vendorConsented: boolean;
	readonly vendorLegitimateInterest: boolean;
}): ReactNode => {
	const [open, setOpen] = useState(false);
	const legs = vendorLegs(model, vendor);
	const objected = vendorLegitimateInterest === false;
	const lists: { key: string; label: string; names: string[] }[] = [
		{
			key: 'purposes',
			label: withTotal(copy.purposes, legs.purposes.length),
			names: legs.purposes,
		},
		{
			key: 'specialPurposes',
			label: withTotal(copy.specialPurposes, legs.specialPurposes.length),
			names: legs.specialPurposes,
		},
		{
			key: 'specialFeatures',
			label: withTotal(copy.specialFeatures, legs.specialFeatures.length),
			names: legs.specialFeatures,
		},
		{
			key: 'features',
			label: withTotal(copy.features, legs.features.length),
			names: legs.features,
		},
	].filter((list) => list.names.length > 0);

	return (
		<View
			style={[parts.rowCard, { backgroundColor: 'transparent' }]}
			testID={consentIabVendorTestId(vendor.id)}
		>
			<Pressable
				accessibilityLabel={vendor.name}
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
				hitSlop={hitSlopFor(parts)}
				onPress={() => {
					setOpen(!open);
				}}
				style={{
					...parts.rowHeader,
					gap: 8,
					padding: 10,
				}}
			>
				<View style={LABEL_ROW}>
					<ConsentDisclosureGlyph
						geometry={CONSENT_IAB_DISCLOSURE_GEOMETRY}
						open={open}
						parts={parts}
						theme={theme}
					/>
					<View style={TEXT_COLUMN}>
						<Text style={parts.rowTitle}>{vendor.name}</Text>
						<Text style={parts.rowMeta}>
							{partnerClaims({
								features: legs.features.length,
								purposes: legs.purposes.length,
								specialPurposes: legs.specialPurposes.length,
							})}
						</Text>
					</View>
				</View>
				<View style={CONTROL_COLUMN}>
					<ConsentSwitch
						disabled={false}
						geometry={CONSENT_IAB_SWITCH_GEOMETRY}
						label={vendor.name}
						onValueChange={onToggleConsent}
						parts={parts}
						theme={theme}
						value={vendorConsented}
					/>
				</View>
			</Pressable>
			{open ? (
				<View style={parts.vendorContent}>
					{lists.map((list) => (
						<View
							key={list.key}
							style={STACKED}
						>
							<Text style={parts.rowSectionTitle}>{list.label}</Text>
							{list.names.map((name) => (
								<Text
									key={name}
									style={parts.rowListItem}
								>
									{name}
								</Text>
							))}
						</View>
					))}
					{legs.legitimateInterest.length > 0 ? (
						<View
							style={STACKED}
							testID={`vendor-legitimate-interest-${String(vendor.id)}`}
						>
							<View
								style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}
							>
								<Text style={parts.rowSectionTitle}>
									{withTotal(
										copy.legitimateInterest,
										legs.legitimateInterest.length
									)}
								</Text>
								<Pressable
									accessibilityLabel={`${copy.legitimateInterest}: ${vendor.name}`}
									accessibilityRole="button"
									accessibilityState={{ selected: objected }}
									hitSlop={{ bottom: 10, left: 10, right: 10, top: 10 }}
									onPress={() => {
										onToggleObjection(objected);
									}}
									style={[
										parts.objectButton,
										objected && {
											backgroundColor: theme.colors.textMuted,
											borderColor: theme.colors.textMuted,
										},
									]}
								>
									<Text
										style={[
											parts.objectLabel,
											objected && { color: theme.colors.surface },
										]}
									>
										{objected ? copy.objected : copy.objectButton}
									</Text>
								</Pressable>
							</View>
							{legs.legitimateInterest.map((name) => (
								<Text
									key={name}
									style={parts.rowListItem}
								>
									{name}
								</Text>
							))}
							<Text style={parts.rowNotice}>{copy.rightToObject}</Text>
						</View>
					) : null}
				</View>
			) : null}
		</View>
	);
};
