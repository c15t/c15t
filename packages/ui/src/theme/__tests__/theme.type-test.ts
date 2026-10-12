import { expectTypeOf } from 'vitest';

import { defineTheme } from '../types';

const theme = defineTheme({
	colors: { primary: 'red' as const },
	slots: { consentBanner: { className: 'banner', style: { padding: '20px' } } },
});
expectTypeOf(theme.colors.primary).toEqualTypeOf<'red'>();
const emptyTheme = defineTheme({});
expectTypeOf<keyof typeof emptyTheme>().toEqualTypeOf<never>();

// @ts-expect-error Theme colors must be strings.
defineTheme({ colors: { primary: 42 } });
// @ts-expect-error Component slots accept class names or style configuration.
defineTheme({ slots: { consentBanner: 42 } });
