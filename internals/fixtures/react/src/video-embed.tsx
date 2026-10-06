/* oxlint-disable react/iframe-missing-sandbox -- The fixed cross-origin YouTube player needs scripts and its own origin for playback. */
import { ConsentDialogLink, ConsentGate } from 'c15t/react';

export const VideoEmbed = () => (
	<ConsentGate
		category="measurement"
		placeholder={
			<div className="placeholder">
				<p>Allow measurement to load this YouTube video.</p>
				<ConsentDialogLink>Choose video permissions</ConsentDialogLink>
			</div>
		}
	>
		<iframe
			title="YouTube video"
			sandbox="allow-scripts allow-same-origin allow-presentation"
			src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y?playsinline=1"
			allow="encrypted-media; picture-in-picture"
			allowFullScreen
		/>
	</ConsentGate>
);
