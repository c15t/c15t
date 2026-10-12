/**
 * The checked switch takes its track color from `--c15t-switch-track-active`.
 * When a theme or stylesheet changes the primary color and leaves that token
 * alone, the switch follows the primary color instead of staying the default
 * blue.
 */
import '@c15t/ui/styles.css';
import { afterEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { Root as Switch } from '../components/shared/ui/switch/switch';
import { ConsentTheme } from '../consent-theme';

const GREEN = 'rgb(47, 111, 78)';
const PURPLE = 'rgb(105, 67, 163)';
const ORANGE = 'rgb(200, 100, 0)';

/** The computed background of the checked switch's track. */
const checkedTrackColor = (): string => {
	const track = document.querySelector('[data-slot="switch-track"]');
	if (!track) {
		throw new Error('The switch must render a track');
	}
	return getComputedStyle(track).backgroundColor;
};

/** `--c15t-primary` as the browser resolves it in the page, in `rgb()`. */
const resolvedPrimary = (): string => {
	const probe = document.createElement('div');
	probe.style.color = 'var(--c15t-primary)';
	document.body.append(probe);
	const { color } = getComputedStyle(probe);
	probe.remove();
	return color;
};

afterEach(() => {
	document.documentElement.classList.remove('dark');
});

test('without a theme the checked switch keeps the default primary color', async () => {
	const { unmount } = await render(<Switch checked />);
	expect(checkedTrackColor()).toBe(resolvedPrimary());
	unmount();
});

test('a theme that only sets the primary color paints the checked switch', async () => {
	const { unmount } = await render(
		<>
			<ConsentTheme theme={{ colors: { primary: GREEN } }} />
			<Switch checked />
		</>
	);
	expect(checkedTrackColor()).toBe(GREEN);
	unmount();
});

test('the dark primary color paints the checked switch in dark mode', async () => {
	document.documentElement.classList.add('dark');
	const { unmount } = await render(
		<>
			<ConsentTheme
				theme={{ colors: { primary: GREEN }, dark: { primary: PURPLE } }}
			/>
			<Switch checked />
		</>
	);
	expect(checkedTrackColor()).toBe(PURPLE);
	unmount();
});

test('a theme with a color scheme still paints the switch with its primary color', async () => {
	const { unmount } = await render(
		<>
			<ConsentTheme
				theme={{ colors: { primary: GREEN } }}
				colorScheme="dark"
			/>
			<Switch checked />
		</>
	);
	expect(checkedTrackColor()).toBe(GREEN);
	unmount();
});

test('switchTrackActive overrides the primary color', async () => {
	const { unmount } = await render(
		<>
			<ConsentTheme
				theme={{ colors: { primary: GREEN, switchTrackActive: ORANGE } }}
			/>
			<Switch checked />
		</>
	);
	expect(checkedTrackColor()).toBe(ORANGE);
	unmount();
});

test('a stylesheet that sets --c15t-primary paints the checked switch', async () => {
	const { unmount } = await render(
		<>
			<style>{`:root { --c15t-primary: ${PURPLE}; }`}</style>
			<Switch checked />
		</>
	);
	expect(checkedTrackColor()).toBe(PURPLE);
	unmount();
});
