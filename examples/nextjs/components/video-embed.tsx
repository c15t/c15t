/* oxlint-disable react/iframe-missing-sandbox -- This fixed cross-origin YouTube player needs its own origin for storage and playback. */
// #region docs:video-embed
'use client';

import { ConsentGate } from 'c15t/next';

export const VideoEmbed = () => (
	<ConsentGate category="measurement">
		<iframe
			className="video-frame"
			sandbox="allow-scripts allow-same-origin allow-presentation"
			src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y"
			title="YouTube video"
			allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
			allowFullScreen
		/>
	</ConsentGate>
);
// #endregion docs:video-embed
