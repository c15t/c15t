import { createElement } from 'react';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentManagerProvider,
} from '../../../packages/react/src/index';
import { benchmarkConsentOptions } from './fixtures';

export function CurrentConsentSurfaces() {
	return (
		<ConsentManagerProvider options={benchmarkConsentOptions}>
			<ConsentBanner />
			<ConsentDialog />
		</ConsentManagerProvider>
	);
}

export default createElement(CurrentConsentSurfaces);
