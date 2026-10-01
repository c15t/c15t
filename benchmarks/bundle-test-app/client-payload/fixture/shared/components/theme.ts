/**
 * The c15t docs site's custom theme: colors only, light and dark. Spacing,
 * radius and duration tokens still come from the package stylesheet. Plain
 * data so the v2 and v3 provider option types both accept it.
 */
export const theme = {
	colors: {
		border: '#E0E0E0',
		primary: 'hsl(172 72.2% 48%)',
		primaryHover: 'hsl(172 72% 48% / 0.1)',
		surface: '#FFFFFF',
		surfaceHover: '#F5F5F5',
		switchTrack: '#E0E0E0',
		switchTrackActive: 'hsl(172 72.2% 48%)',
		text: '#000000',
		textMuted: '#555555',
	},
	dark: {
		border: '#333333',
		primary: 'hsl(172 72.2% 48%)',
		primaryHover: 'hsl(172 72% 48% / 0.1)',
		surface: '#000000',
		surfaceHover: '#111111',
		switchTrack: '#333333',
		switchTrackActive: 'hsl(172 72.2% 48%)',
		text: '#FFFFFF',
		textMuted: '#CCCCCC',
	},
};
