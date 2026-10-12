import type { Theme } from '../index';
import { defineTheme } from '../index';

const theme = defineTheme({
	colors: { primary: '#2f6f4e' },
	consentActions: {
		primary: { mode: 'filled', variant: 'primary' },
	},
});

theme satisfies Theme;
theme.consentActions.primary.mode satisfies 'filled';

// @ts-expect-error Color tokens must be strings.
defineTheme({ colors: { primary: 42 } });

// @ts-expect-error Unsupported consent action variants must be rejected.
defineTheme({ consentActions: { primary: { variant: 'unknown' } } });
