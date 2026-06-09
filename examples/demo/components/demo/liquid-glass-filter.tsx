'use client';

import { useEffect, useState } from 'react';

/**
 * True lens refraction for the Liquid Glass preset, after
 * https://aave.com/design/building-glass-for-the-web.
 *
 * A displacement map is generated on a canvas: the red channel encodes
 * horizontal displacement, green encodes vertical, neutral (128) leaves
 * pixels untouched. Displacement ramps up inside an edge band of a rounded
 * rectangle (signed-distance field), so the backdrop bends near the card
 * edges like glass. The map drives an SVG feDisplacementMap referenced from
 * `backdrop-filter: url(#c15t-liquid-glass)` — Chromium only; other engines
 * keep the plain frosted-blur fallback.
 */

const MAP_W = 480;
const MAP_H = 360;
const RADIUS = 44;
/** Width of the refracting edge band, in map pixels. */
const DEPTH = 64;
/** Falloff exponent — higher bends harder right at the edge. */
const CURVE = 1.7;

/** Signed distance to a rounded rectangle centered in the map (negative inside). */
function roundedRectSDF(x: number, y: number): number {
	const qx = Math.abs(x - MAP_W / 2) - (MAP_W / 2 - RADIUS);
	const qy = Math.abs(y - MAP_H / 2) - (MAP_H / 2 - RADIUS);
	const ax = Math.max(qx, 0);
	const ay = Math.max(qy, 0);
	return Math.min(Math.max(qx, qy), 0) + Math.hypot(ax, ay) - RADIUS;
}

function generateDisplacementMap(): string | null {
	const canvas = document.createElement('canvas');
	canvas.width = MAP_W;
	canvas.height = MAP_H;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return null;
	}

	const image = ctx.createImageData(MAP_W, MAP_H);
	const data = image.data;

	for (let y = 0; y < MAP_H; y++) {
		for (let x = 0; x < MAP_W; x++) {
			const inside = -roundedRectSDF(x + 0.5, y + 0.5);
			let dx = 0;
			let dy = 0;

			if (inside >= 0 && inside < DEPTH) {
				const strength = (1 - inside / DEPTH) ** CURVE;
				// Outward normal from the SDF gradient (central differences).
				let nx =
					roundedRectSDF(x + 1.5, y + 0.5) - roundedRectSDF(x - 0.5, y + 0.5);
				let ny =
					roundedRectSDF(x + 0.5, y + 1.5) - roundedRectSDF(x + 0.5, y - 0.5);
				const len = Math.hypot(nx, ny) || 1;
				nx /= len;
				ny /= len;
				dx = nx * strength;
				dy = ny * strength;
			}

			const i = (y * MAP_W + x) * 4;
			data[i] = Math.round(128 + dx * 127);
			data[i + 1] = Math.round(128 + dy * 127);
			data[i + 2] = 128;
			data[i + 3] = 255;
		}
	}

	ctx.putImageData(image, 0, 0);
	return canvas.toDataURL('image/png');
}

function supportsBackdropRefraction(): boolean {
	if (
		typeof CSS === 'undefined' ||
		!CSS.supports('backdrop-filter', 'url(#f) blur(1px)')
	) {
		return false;
	}
	// Safari parses url() in backdrop-filter but renders nothing; gate on
	// Chromium where SVG-referenced backdrop filters actually work.
	return 'chrome' in window;
}

export function LiquidGlassFilter() {
	const [mapUri, setMapUri] = useState<string | null>(null);

	useEffect(() => {
		if (!supportsBackdropRefraction()) {
			return;
		}

		setMapUri(generateDisplacementMap());
		document.documentElement.classList.add('lg-refract');

		return () => {
			document.documentElement.classList.remove('lg-refract');
		};
	}, []);

	if (!mapUri) {
		return null;
	}

	return (
		<svg aria-hidden width="0" height="0" style={{ position: 'absolute' }}>
			<title>Liquid glass refraction filter</title>
			<filter
				id="c15t-liquid-glass"
				x="0"
				y="0"
				width="100%"
				height="100%"
				colorInterpolationFilters="sRGB"
			>
				<feImage
					href={mapUri}
					x="0"
					y="0"
					width="100%"
					height="100%"
					preserveAspectRatio="none"
					result="map"
				/>
				<feDisplacementMap
					in="SourceGraphic"
					in2="map"
					scale="64"
					xChannelSelector="R"
					yChannelSelector="G"
				/>
			</filter>
		</svg>
	);
}
