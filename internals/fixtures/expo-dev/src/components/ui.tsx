/**
 * Plain UI for a test fixture.
 *
 * This app exists to be driven by a runner and read by an engineer checking the
 * SDK, so the chrome is deliberately unstyled: system colours, system fonts, no
 * design system. The consent surfaces are the designed part, and those come from
 * the package, not from here.
 */

import type { ReactNode } from 'react';
import {
	Pressable,
	ScrollView,
	Switch,
	Text as NativeText,
	View,
	StyleSheet,
} from 'react-native';

const BORDER = '#d8d8d8';
const MUTED = '#5c5c66';

const styles = StyleSheet.create({
	button: {
		backgroundColor: '#f2f2f4',
		borderColor: BORDER,
		borderRadius: 6,
		borderWidth: 1,
		paddingBottom: 11,
		paddingHorizontal: 12,
		paddingTop: 11,
	},
	buttonBusy: {
		opacity: 0.45,
	},
	buttonLabel: {
		fontSize: 14,
		textAlign: 'center',
	},
	card: {
		borderColor: BORDER,
		borderRadius: 8,
		borderWidth: 1,
		gap: 8,
		marginBottom: 14,
		padding: 14,
	},
	flagOff: {
		color: '#a10000',
		fontSize: 13,
	},
	flagOn: {
		color: '#0a7d33',
		fontSize: 13,
	},
	hint: {
		color: MUTED,
		fontSize: 12,
	},
	row: {
		flexDirection: 'row',
		gap: 10,
	},
	rowLabel: {
		color: MUTED,
		flexShrink: 0,
		fontSize: 13,
		width: 130,
	},
	screen: {
		flexGrow: 1,
		padding: 16,
	},
	stack: {
		gap: 8,
	},
	title: {
		fontSize: 13,
		fontWeight: '600',
	},
	value: {
		flex: 1,
		fontSize: 13,
	},
	valueMuted: {
		color: MUTED,
		fontSize: 13,
	},
});

/** Scrollable page container. */
export const Screen = ({ children }: { readonly children: ReactNode }) => (
	<ScrollView
		contentContainerStyle={styles.screen}
		keyboardShouldPersistTaps="handled"
	>
		{children}
	</ScrollView>
);

/** Bordered section with a title. */
export const Card = ({
	children,
	title,
}: {
	readonly children: ReactNode;
	readonly title: string;
}) => (
	<View style={styles.card}>
		<NativeText
			accessibilityRole="header"
			style={styles.title}
		>
			{title.toUpperCase()}
		</NativeText>
		{children}
	</View>
);

/** Label and value on one line. */
export const Row = ({
	label,
	value,
}: {
	readonly label: string;
	readonly value: ReactNode;
}) => (
	<View style={styles.row}>
		<NativeText style={styles.rowLabel}>{label}</NativeText>
		<View style={styles.value}>
			{typeof value === 'string' ? (
				<NativeText style={styles.value}>{value}</NativeText>
			) : (
				value
			)}
		</View>
	</View>
);

/** Body text, with the one variant this fixture needs. */
export const Text = ({
	children,
	muted = false,
}: {
	readonly children: ReactNode;
	readonly muted?: boolean;
}) => (
	<NativeText style={muted ? styles.valueMuted : styles.value}>
		{children}
	</NativeText>
);

/** Muted explanatory line. */
export const Hint = ({ children }: { readonly children: ReactNode }) => (
	<NativeText style={styles.hint}>{children}</NativeText>
);

/** Text button that refuses a second press while its action is running. */
export const Button = ({
	busy = false,
	label,
	onPress,
}: {
	readonly busy?: boolean;
	readonly label: string;
	readonly onPress: () => void;
}) => (
	<Pressable
		accessibilityRole="button"
		disabled={busy}
		onPress={onPress}
		style={({ pressed }) => [
			styles.button,
			pressed && styles.buttonBusy,
			busy && styles.buttonBusy,
		]}
	>
		<NativeText style={styles.buttonLabel}>{label}</NativeText>
	</Pressable>
);

/** Column of buttons. */
export const ButtonGrid = ({ children }: { readonly children: ReactNode }) => (
	<View style={styles.stack}>{children}</View>
);

/** Labelled switch. */
export const Toggle = ({
	label,
	onValueChange,
	value,
}: {
	readonly label: string;
	readonly onValueChange: (value: boolean) => void;
	readonly value: boolean;
}) => (
	<View
		style={[
			styles.row,
			{ alignItems: 'center', justifyContent: 'space-between' },
		]}
	>
		<NativeText style={styles.value}>{label}</NativeText>
		<Switch
			aria-label={label}
			onValueChange={onValueChange}
			value={value}
		/>
	</View>
);

/** `true`/`false` in a colour a runner can read at a glance. */
export const Flag = ({ value }: { readonly value: boolean }) => (
	<NativeText style={value ? styles.flagOn : styles.flagOff}>
		{value ? 'true' : 'false'}
	</NativeText>
);
