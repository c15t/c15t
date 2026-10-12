/**
 * Root component: attach a consent core, hold the scheme choice, then render.
 *
 * The system bands are measured here and handed to both halves of the screen: the
 * chrome pads itself by them, and `C15tProvider` lays the consent surfaces against
 * the same numbers. No safe-area library is installed on purpose, because every
 * extra native module in this example is one more thing that has to build before the
 * consent path can be checked. See `src/safe-area.ts` for what core reports.
 */

import { StatusBar } from 'react-native';

import { App as Shell, UnavailableScreen } from './src/app';
import { AppearanceProvider, useAppearance } from './src/appearance';
import {
	ConsentSourceProvider,
	useConsentSource,
} from './src/c15t/consent-source';
import { useAppTheme } from './src/theme';

const Root = () => {
	const { nativeError } = useConsentSource();
	const { appearance } = useAppearance();
	const { scheme } = useAppTheme(appearance);

	return (
		<>
			{/* Edge-to-edge on both platforms means the status bar icons sit on this
			    app's own background, so they follow the palette rather than the default. */}
			<StatusBar
				barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
			/>
			{nativeError === null ? <Shell /> : <UnavailableScreen />}
		</>
	);
};

const App = () => (
	<ConsentSourceProvider>
		<AppearanceProvider>
			<Root />
		</AppearanceProvider>
	</ConsentSourceProvider>
);

export default App;
