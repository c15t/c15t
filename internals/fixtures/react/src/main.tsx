import { createRoot } from 'react-dom/client';

import { App } from './app';
import { Consent } from './consent';

const root = document.getElementById('root');
if (!root) {
	throw new Error('Missing #root element');
}
createRoot(root).render(
	<Consent>
		<App />
	</Consent>
);
