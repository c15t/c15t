/** A flat coffee bag with a colored label. Decorative. */
export const BagArt = ({ tint }: { tint: string }) => (
	<svg
		viewBox="0 0 120 150"
		width="120"
		height="150"
		aria-hidden="true"
	>
		<path
			d="M24 22h72l8 118a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z"
			fill="#fffdf9"
			stroke="#e4dccf"
		/>
		<path
			d="M24 22h72l2 14H22z"
			fill="#f1e9dc"
		/>
		<path
			d="M30 12h60l6 10H24z"
			fill="#e4d8c5"
		/>
		<rect
			x="34"
			y="62"
			width="52"
			height="50"
			rx="3"
			fill={tint}
		/>
		<path
			d="M52 80c4-6 12-6 16 0s-4 16-8 16-12-10-8-16z"
			fill="none"
			stroke="#fbf8f3"
			strokeWidth="2"
		/>
		<path
			d="M60 78v18"
			stroke="#fbf8f3"
			strokeWidth="1.6"
			strokeLinecap="round"
		/>
	</svg>
);
