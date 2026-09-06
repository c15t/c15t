const Home = () => {
	const surfaces = ['banner', 'dialog', 'widget'] as const;

	return (
		<main className="css-layer-home">
			<div className="css-layer-home-copy">
				<p className="css-layer-home-eyebrow">Plain CSS Environment</p>
				<h1 className="css-layer-home-title">c15t CSS layer review routes</h1>
				<p className="css-layer-home-description">
					This app renders the shared manual-review scenarios without any
					Tailwind pipeline. Use it as the plain-CSS control when utility-layer
					merging starts to drift in the Tailwind environments.
				</p>
			</div>

			<ul className="css-layer-home-list">
				{surfaces.map((surface) => (
					<li key={surface}>
						<a
							className="css-layer-home-link"
							href={`/matrix/${surface}`}
						>
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
