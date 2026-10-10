import { useEffect, useState } from 'react';

import heroUrl from '../../shared/assets/hero.jpg';

/**
 * Whether this visit renders the hero. `?hero` opts in, so the bundle and
 * first-paint benches keep measuring the page without it.
 */
export const heroRequested =
	typeof window !== 'undefined' &&
	new URLSearchParams(window.location.search).has('hero');

/**
 * A 159 KB hero photo that starts loading after the window `load` event,
 * the way a single-page app's largest image often does once its route data
 * arrives. The dialog-open bench uses it so the dialog preload has a real
 * image to wait for.
 */
export const Hero = () => {
	const [show, setShow] = useState(false);
	useEffect(() => {
		const reveal = () => setShow(true);
		if (document.readyState === 'complete') {
			reveal();
			return;
		}
		window.addEventListener('load', reveal, { once: true });
		return () => window.removeEventListener('load', reveal);
	}, []);
	return show ? (
		<img
			alt=""
			className="hero"
			data-testid="bench-hero"
			height={800}
			src={heroUrl}
			width={1200}
		/>
	) : null;
};
