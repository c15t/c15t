/**
 * Demo only: choose which setup to mount from the URL, so one build serves
 * the default, branded and headless variants. Each variant is a complete
 * `main.ts` a reader can copy.
 */
import './style.css';

if (location.pathname === '/headless') {
	void import('./headless');
} else if (new URLSearchParams(location.search).get('design') === 'branded') {
	void import('./branded');
} else {
	void import('./main');
}
