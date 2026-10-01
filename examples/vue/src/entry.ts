/**
 * Demo only: choose which setup to mount from the URL, so one build serves
 * the default, branded, headless and experiment variants. Each variant is a
 * complete `main.ts` a reader can copy.
 */
import './style.css';

const search = new URLSearchParams(location.search);

if (location.pathname === '/headless') {
	void import('./headless');
} else if (search.get('experiment') === '1') {
	void import('./experiment-main');
} else if (search.get('design') === 'branded') {
	void import('./branded');
} else {
	void import('./main');
}
