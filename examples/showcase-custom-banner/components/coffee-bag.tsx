/**
 * A drawn bag in place of a product photo, so the demo ships no images.
 * Decorative: the product name is in the heading next to it.
 */
export const CoffeeBag = () => (
	<svg
		viewBox="0 0 400 480"
		aria-hidden="true"
	>
		<ellipse
			cx="200"
			cy="442"
			rx="118"
			ry="9"
			fill="rgb(31 35 40 / 0.08)"
		/>
		<rect
			x="120"
			y="66"
			width="160"
			height="50"
			rx="2"
			fill="#b78c5e"
		/>
		<path
			d="M128 66v50M144 66v50M160 66v50M176 66v50M192 66v50M208 66v50M224 66v50M240 66v50M256 66v50M272 66v50"
			stroke="rgb(31 35 40 / 0.06)"
			strokeWidth="2"
		/>
		<path
			d="M110 112h180l10 318a8 8 0 0 1-8 8H108a8 8 0 0 1-8-8z"
			fill="#c69d6f"
		/>
		<path
			d="M110 112h18l-6 326h-14a8 8 0 0 1-8-8z"
			fill="rgb(31 35 40 / 0.07)"
		/>
		<path
			d="M272 112h18l10 318a8 8 0 0 1-8 8h-14z"
			fill="rgb(255 255 255 / 0.08)"
		/>
		<rect
			x="106"
			y="104"
			width="188"
			height="10"
			rx="2"
			fill="#8a6a48"
		/>
		<rect
			x="138"
			y="186"
			width="124"
			height="176"
			rx="3"
			fill="#fbf8f3"
		/>
		<g fill="#2f6f4e">
			<ellipse
				cx="200"
				cy="220"
				rx="7"
				ry="9.5"
				transform="rotate(30 200 220)"
			/>
		</g>
		<path
			d="M204 211c-3.5 3-4.5 5.5-4 7.5s-.5 4.5-4 7.5"
			fill="none"
			stroke="#fbf8f3"
			strokeWidth="1.4"
			strokeLinecap="round"
		/>
		<text
			x="200"
			y="252"
			textAnchor="middle"
			fill="#2f6f4e"
			fontFamily="Georgia, 'Times New Roman', serif"
			fontSize="10"
			letterSpacing="2.5"
		>
			NORTHWIND
		</text>
		<line
			x1="170"
			y1="266"
			x2="230"
			y2="266"
			stroke="#e4dccf"
		/>
		<text
			x="200"
			y="294"
			textAnchor="middle"
			fill="#1f2328"
			fontFamily="Georgia, 'Times New Roman', serif"
			fontSize="22"
		>
			Huila
		</text>
		<text
			x="200"
			y="314"
			textAnchor="middle"
			fill="#1f2328"
			fontFamily="Georgia, 'Times New Roman', serif"
			fontSize="13"
		>
			Pink Bourbon
		</text>
		<text
			x="200"
			y="344"
			textAnchor="middle"
			fill="#5b6168"
			fontFamily="system-ui, sans-serif"
			fontSize="8.5"
			letterSpacing="1"
		>
			LIGHT ROAST · 250 G
		</text>
	</svg>
);
