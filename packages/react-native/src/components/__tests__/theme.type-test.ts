import { expectTypeOf } from 'vitest';

import {
	CONSENT_PLATFORMS,
	createConsentTheme,
	resolveConsentPlatform,
} from '../../index';
import type { ConsentPlatform, ConsentThemeMetrics } from '../../index';
import type {
	ConsentPlatform as ComponentPlatform,
	ConsentThemeMetrics as ComponentMetrics,
} from '../index';

expectTypeOf<ComponentPlatform>().toEqualTypeOf<ConsentPlatform>();
expectTypeOf<ComponentMetrics>().toEqualTypeOf<ConsentThemeMetrics>();
expectTypeOf(CONSENT_PLATFORMS).items.toEqualTypeOf<ConsentPlatform>();
expectTypeOf(resolveConsentPlatform()).toEqualTypeOf<ConsentPlatform>();
expectTypeOf(createConsentTheme().metrics).toEqualTypeOf<ConsentThemeMetrics>();
