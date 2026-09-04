const Home = () => {
	const surfaces = ['banner', 'dialog', 'widget'] as const;

	return (
		<main className="matrix-home">
			<section className="matrix-home-nav">
				<div className="matrix-home-nav-copy">
					<p className="matrix-home-eyebrow">Manual CSS Matrix</p>
					<h1>Tailwind 3, Tailwind 4, and plain CSS side by side</h1>
				</div>
				<div className="matrix-home-summary">
					<div>
						<span>3 environments</span>
						<strong>TW3, TW4, plain CSS</strong>
					</div>
					<div>
						<span>Current scope</span>
						<strong>Banner, dialog, and widget</strong>
					</div>
				</div>
			</section>

			<ul className="matrix-home-list">
				{surfaces.map((surface) => (
					<li key={surface}>
						<a href={`/matrix/${surface}`}>
							<span>{surface}</span>
							<code>{`/matrix/${surface}`}</code>
						</a>
					</li>
				))}
			</ul>
		</main>
	);
};

export default Home;
