/**
 * A drawn bag in place of a product photo, so the demo ships no images.
 * Decorative: the product name is in the heading below it.
 */
export const CoffeeBag = ({ color }: { color: string }) => (
	<svg
		viewBox="0 0 200 220"
		aria-hidden="true"
	>
		<ellipse
			cx="100"
			cy="206"
			rx="58"
			ry="5"
			fill="rgb(31 35 40 / 0.08)"
		/>
		<rect
			x="62"
			y="18"
			width="76"
			height="26"
			rx="2"
			fill={color}
		/>
		<rect
			x="62"
			y="18"
			width="76"
			height="26"
			rx="2"
			fill="rgb(255 255 255 / 0.18)"
		/>
		<path
			d="M57 40h86l5 158a4 4 0 0 1-4 4H56a4 4 0 0 1-4-4z"
			fill={color}
		/>
		<path
			d="M57 40h9l-3 162h-7a4 4 0 0 1-4-4z"
			fill="rgb(31 35 40 / 0.08)"
		/>
		<rect
			x="54"
			y="37"
			width="92"
			height="6"
			rx="1.5"
			fill="rgb(31 35 40 / 0.22)"
		/>
		<rect
			x="72"
			y="82"
			width="56"
			height="78"
			rx="2"
			fill="#fbf8f3"
		/>
		<ellipse
			cx="100"
			cy="104"
			rx="5"
			ry="7"
			transform="rotate(30 100 104)"
			fill="#2f6f4e"
		/>
		<path
			d="M103 98c-2.5 2-3.2 4-2.8 5.3s-.4 3.2-2.8 5.3"
			fill="none"
			stroke="#fbf8f3"
			strokeWidth="1"
			strokeLinecap="round"
		/>
		<path
			d="M82 124h36M86 134h28M90 144h20"
			stroke="#2f6f4e"
			strokeWidth="2"
			strokeLinecap="round"
			opacity="0.55"
		/>
	</svg>
);
