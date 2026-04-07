'use client';

import { useMemo, useState } from 'react';

export function MatrixFrame({
	description,
	height,
	label,
	port,
	url,
}: {
	description: string;
	height: number;
	label: string;
	port: number;
	url: string;
}) {
	const [reloadToken, setReloadToken] = useState(0);

	const src = useMemo(() => {
		const separator = url.includes('?') ? '&' : '?';
		return `${url}${separator}preview=${reloadToken}`;
	}, [reloadToken, url]);

	return (
		<article className="matrix-frame">
			<header className="matrix-frame-head">
				<div className="matrix-frame-meta">
					<div className="matrix-frame-meta-top">
						<h2>{label}</h2>
						<span className="matrix-frame-badge">{`:${port}`}</span>
					</div>
					<p className="matrix-frame-description">{description}</p>
					<code>{url}</code>
				</div>

				<div className="matrix-frame-actions">
					<button
						type="button"
						className="matrix-frame-button"
						onClick={() => setReloadToken((value) => value + 1)}
					>
						Reload
					</button>
					<a
						className="matrix-frame-button matrix-frame-button-primary"
						href={url}
						rel="noreferrer"
						target="_blank"
					>
						Open Route
					</a>
				</div>
			</header>

			<iframe
				key={src}
				src={src}
				title={`${label} preview`}
				style={{ height: `${height}px` }}
			/>
		</article>
	);
}
