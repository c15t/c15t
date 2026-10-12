// Stand-in creatives for the three slots, drawn with CSS. Nothing here
// talks to an ad network. The advertisers are made up, and their links
// point at .example domains, which never resolve.

export const KettleAd = () => (
	<a
		className="creative creative-kettle"
		href="https://copperline.example"
		rel="sponsored noreferrer"
		target="_blank"
	>
		<span
			className="kettle"
			aria-hidden="true"
		>
			<span className="kettle-spout" />
			<span className="kettle-body" />
			<span className="kettle-handle" />
		</span>
		<span className="creative-copy">
			<span className="creative-brand">Copperline</span>
			<span className="creative-headline">Pour slower. Taste more.</span>
		</span>
		<span className="creative-cta">Shop kettles</span>
	</a>
);

export const OatMilkAd = () => (
	<a
		className="creative creative-oat"
		href="https://fernway.example"
		rel="sponsored noreferrer"
		target="_blank"
	>
		<span className="creative-brand">Fernway Barista</span>
		<span className="creative-headline">Steams like milk. Made from oats.</span>
		<span
			className="carton"
			aria-hidden="true"
		>
			<span className="carton-top" />
			<span className="carton-body">
				<span className="carton-mark" />
			</span>
		</span>
		<span className="creative-cta">Find it in your café</span>
	</a>
);

// The whole card is clickable through the title link's ::after, so the
// link's accessible name is the headline, not the whole card.
export const GrinderStory = () => (
	<div className="creative creative-grinder">
		<div
			className="grinder-art"
			aria-hidden="true"
		>
			<span className="grinder">
				<span className="grinder-hopper" />
				<span className="grinder-body" />
				<span className="grinder-cup" />
			</span>
		</div>
		<div className="story-copy">
			<p className="story-sponsor">Paid for by Halden Grinders</p>
			<h3 className="story-title">
				<a
					href="https://halden.example/journal/dialing-in"
					rel="sponsored noreferrer"
					target="_blank"
				>
					Dial in espresso in five shots, not fifty
				</a>
			</h3>
			<p className="story-excerpt">
				Change one thing at a time, start finer than you think and taste every
				shot. A short guide from the people who build burr grinders.
			</p>
			<p
				className="story-link"
				aria-hidden="true"
			>
				Read on halden.example
			</p>
		</div>
	</div>
);
