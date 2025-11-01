import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './app.tsx';

// biome-ignore lint/style/noNonNullAssertion: this is fine
createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>
);
