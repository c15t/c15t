import { createElement } from 'react';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	offline,
} from '../../../packages/react/src/index';
import { benchmarkConsentOptions } from './fixtures';

export const CurrentConsentSurfaces = () => (
	<ConsentProvider options={{ ...benchmarkConsentOptions, mode: offline() }}>
		<ConsentBanner />
		<ConsentDialog />
	</ConsentProvider>
);

export default createElement(CurrentConsentSurfaces);
