/**
 * Root component: attach a consent core, then render the shell.
 *
 * Nothing Expo-specific appears below this file. `src/` is the same fixture the bare
 * React Native example runs, on purpose: the two apps should fail in the same place
 * when the package does, so a difference between them points at the native wiring
 * rather than at the consent code.
 */

import { StatusBar } from 'react-native';

import { App as Shell, UnavailableScreen } from './src/app';
import {
	ConsentSourceProvider,
	useConsentSource,
} from './src/c15t/consent-source';

const Root = () => {
	const { nativeError } = useConsentSource();

	return (
		<>
			<StatusBar barStyle="dark-content" />
			{nativeError === null ? <Shell /> : <UnavailableScreen />}
		</>
	);
};

const App = () => (
	<ConsentSourceProvider>
		<Root />
	</ConsentSourceProvider>
);

export default App;
