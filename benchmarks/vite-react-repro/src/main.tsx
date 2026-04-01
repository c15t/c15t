import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import './styles.css';
import '@c15t/react/styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
	throw new Error('Root element not found');
}

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>
);
