/**
 * Root component: attach a consent core, then render the shell.
 *
 * The system bars get plain treatment. There is no safe-area library here on
 * purpose, because every extra native module in this example is one more thing
 * that has to build before the consent path can be checked.
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
