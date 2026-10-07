// Drawn stand-ins for each embed. They are inline SVG on purpose: a vendor
// thumbnail or static map image would contact the vendor before consent.

export const VideoPreview = () => (
	<svg
		className="preview-art"
		viewBox="0 0 640 360"
		preserveAspectRatio="xMidYMid slice"
	>
		<defs>
			<linearGradient
				id="video-bg"
				x1="0"
				y1="0"
				x2="1"
				y2="1"
			>
				<stop
					offset="0"
					stopColor="#3b2a20"
				/>
				<stop
					offset="1"
					stopColor="#1c1512"
				/>
			</linearGradient>
			<radialGradient
				id="video-glow"
				cx="0.7"
				cy="0.45"
				r="0.5"
			>
				<stop
					offset="0"
					stopColor="#c8955f"
					stopOpacity="0.45"
				/>
				<stop
					offset="1"
					stopColor="#c8955f"
					stopOpacity="0"
				/>
			</radialGradient>
			<filter id="video-soft">
				<feGaussianBlur stdDeviation="3" />
			</filter>
		</defs>
		<rect
			width="640"
			height="360"
			fill="url(#video-bg)"
		/>
		<rect
			width="640"
			height="360"
			fill="url(#video-glow)"
		/>
		<g
			filter="url(#video-soft)"
			opacity="0.9"
			transform="translate(140 -10)"
		>
			{/* Kettle spout and the pour */}
			<path
				d="M150 70 C 210 70 250 90 290 120"
				stroke="#e9dccb"
				strokeWidth="14"
				strokeLinecap="round"
				fill="none"
			/>
			<path
				d="M292 122 C 300 140 304 160 306 182"
				stroke="#e9dccb"
				strokeWidth="3"
				strokeLinecap="round"
				fill="none"
				opacity="0.7"
			/>
			{/* V60 cone, filter and server */}
			<path
				d="M236 168 L 384 168 L 330 248 L 290 248 Z"
				fill="#f3ece2"
			/>
			<path
				d="M252 168 L 368 168 L 324 232 L 296 232 Z"
				fill="#d9c7b0"
			/>
			<rect
				x="268"
				y="248"
				width="84"
				height="12"
				rx="3"
				fill="#e9dccb"
			/>
			<path
				d="M262 262 L 358 262 L 350 330 L 270 330 Z"
				fill="#f3ece2"
				opacity="0.35"
			/>
			<path
				d="M274 296 L 346 296 L 350 330 L 270 330 Z"
				fill="#8a5a36"
			/>
			{/* Steam */}
			<path
				d="M420 210 C 410 190 430 175 420 155"
				stroke="#e9dccb"
				strokeWidth="4"
				strokeLinecap="round"
				fill="none"
				opacity="0.35"
			/>
			<path
				d="M444 220 C 434 196 456 182 444 160"
				stroke="#e9dccb"
				strokeWidth="4"
				strokeLinecap="round"
				fill="none"
				opacity="0.25"
			/>
		</g>
		{/* Play mark */}
		<circle
			cx="560"
			cy="64"
			r="28"
			fill="#fbf8f3"
			opacity="0.92"
		/>
		<path
			d="M551 50 L 575 64 L 551 78 Z"
			fill="#2f6f4e"
		/>
	</svg>
);

export const MapPreview = () => (
	<svg
		className="preview-art"
		viewBox="0 0 480 360"
		preserveAspectRatio="xMidYMid slice"
	>
		<defs>
			<filter id="map-soft">
				<feGaussianBlur stdDeviation="2.5" />
			</filter>
		</defs>
		<g filter="url(#map-soft)">
			<rect
				width="480"
				height="360"
				fill="#efe8dc"
			/>
			{/* River */}
			<path
				d="M-20 300 C 80 270 120 330 220 300 S 400 250 500 280 L 500 380 L -20 380 Z"
				fill="#c9dcd3"
			/>
			{/* Park */}
			<path
				d="M40 40 L 150 30 L 170 120 L 60 135 Z"
				fill="#d4e2c8"
			/>
			{/* Blocks and streets */}
			<g
				stroke="#fbf8f3"
				strokeWidth="10"
				strokeLinecap="round"
			>
				<path d="M0 160 L 480 140" />
				<path d="M0 230 L 480 215" />
				<path d="M200 0 L 220 290" />
				<path d="M330 0 L 345 260" />
				<path d="M90 150 L 100 280" />
			</g>
			<g
				stroke="#e6d2ad"
				strokeWidth="16"
				strokeLinecap="round"
			>
				<path d="M0 90 L 480 70" />
				<path d="M430 0 L 450 250" />
			</g>
		</g>
		{/* Pin on the roastery */}
		<g transform="translate(300 96)">
			<ellipse
				cx="0"
				cy="34"
				rx="12"
				ry="4"
				fill="#1f2328"
				opacity="0.18"
			/>
			<path
				d="M0 34 C -6 22 -20 10 -20 -4 A 20 20 0 0 1 20 -4 C 20 10 6 22 0 34 Z"
				fill="#2f6f4e"
			/>
			<circle
				cx="0"
				cy="-4"
				r="7"
				fill="#fbf8f3"
			/>
		</g>
	</svg>
);

export const ChatPreview = () => (
	<svg
		className="chat-art"
		viewBox="0 0 120 96"
	>
		<rect
			x="4"
			y="8"
			width="78"
			height="34"
			rx="10"
			fill="#e4dccf"
		/>
		<rect
			x="14"
			y="19"
			width="44"
			height="5"
			rx="2.5"
			fill="#fbf8f3"
		/>
		<rect
			x="14"
			y="28"
			width="30"
			height="5"
			rx="2.5"
			fill="#fbf8f3"
		/>
		<rect
			x="38"
			y="52"
			width="78"
			height="34"
			rx="10"
			fill="#2f6f4e"
		/>
		<rect
			x="48"
			y="63"
			width="52"
			height="5"
			rx="2.5"
			fill="#ffffff"
		/>
		<rect
			x="48"
			y="72"
			width="36"
			height="5"
			rx="2.5"
			fill="#ffffff"
			opacity="0.7"
		/>
	</svg>
);
