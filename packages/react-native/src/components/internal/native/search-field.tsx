/**
 * Filter a long list, such as the partner list.
 *
 * iOS draws a grey rounded field like `UISearchBar`; Android draws a Material
 * search bar, a full pill on the container color. Both use the system clear
 * button where there is one and search as the return key.
 */

import type { ReactElement } from 'react';
import { TextInput } from 'react-native';

import { useNativeStyles } from './styles-context';

/** Props for {@link SearchField}. */
export interface SearchFieldProps {
	/**
	 * Take the new query.
	 *
	 * @param query - What the subject typed.
	 */
	readonly onChange: (query: string) => void;
	/** Placeholder, which is also the field's accessibility label. */
	readonly placeholder: string;
	/** Current query. */
	readonly value: string;
}

/**
 * Draw the search field.
 *
 * @param props - Field props.
 * @returns The field.
 */
export const SearchField = ({
	onChange,
	placeholder,
	value,
}: SearchFieldProps): ReactElement => {
	const { parts, theme } = useNativeStyles();

	return (
		<TextInput
			accessibilityLabel={placeholder}
			autoCapitalize="none"
			autoCorrect={false}
			clearButtonMode="while-editing"
			enterKeyHint="search"
			onChangeText={onChange}
			placeholder={placeholder}
			placeholderTextColor={theme.colors.secondaryLabel}
			returnKeyType="search"
			selectionColor={theme.colors.primary}
			style={parts.searchField}
			testID="c15t-search"
			value={value}
		/>
	);
};
