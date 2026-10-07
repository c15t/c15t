import { AdChoices } from '@/components/ad-choices';
import { GrinderStory, KettleAd, OatMilkAd } from '@/components/ad-creatives';
import { AdSlot } from '@/components/ad-slot';
import { adPartners } from '@/lib/ad-partners';

const Page = () => (
	<div className="journal">
		<header className="story-header">
			<h1>How long should coffee rest after roasting?</h1>
			<p className="lede">
				Coffee brewed the day it is roasted tastes sharp and hollow. Why we wait
				before we brew a new roast, and how to tell when your bag is ready.
			</p>
			<p className="byline">
				By Mara Lindqvist, head roaster
				<span aria-hidden="true"> · </span>
				<time dateTime="2026-10-02">October 2, 2026</time>
				<span aria-hidden="true"> · </span>6 min read
			</p>
		</header>

		<AdSlot
			partner={adPartners.leaderboard}
			format="leaderboard"
		>
			<KettleAd />
		</AdSlot>

		<div className="story-grid">
			<article className="story-body">
				<p>
					Every bag we ship has a roast date on the front, and every week
					someone writes in to ask why we don&apos;t send coffee the day it
					leaves the roaster. The short answer is carbon dioxide. Roasting fills
					each bean with it, and for the first few days that gas pushes back
					against the water you pour.
				</p>

				<h2>What resting does</h2>
				<p>
					Coffee gives up most of its trapped CO₂ in the first week. Brew too
					early and the grounds bubble hard during the bloom, water runs around
					them instead of through them, and the cup tastes sharp and hollow at
					the same time. Give the same beans a few days and they brew evenly.
				</p>
				<p>
					Resting lets flavor settle too. Our light roasts taste muted, almost
					grassy, on day two, then open up into the fruit we roasted them for
					somewhere around day seven.
				</p>

				<h2>How long to wait</h2>
				<ul className="rest-times">
					<li>
						<strong>Espresso: 7 to 14 days.</strong> Pressure exaggerates gas,
						so espresso wants the longest rest.
					</li>
					<li>
						<strong>Filter, light roasts: 5 to 10 days.</strong>
					</li>
					<li>
						<strong>Filter, medium and darker: 3 to 7 days.</strong>
					</li>
				</ul>
				<p>
					Treat these as starting points. Our Kayon Mountain natural keeps
					improving into its third week. The Huila washed peaks early and fades
					after a month.
				</p>

				<h2>How to tell a bag is ready</h2>
				<p>
					Watch the bloom. Pour twice the coffee&apos;s weight in water and wait
					30 seconds. A dome that swells and cracks means there&apos;s still
					plenty of gas. A gentle rise and a few slow bubbles mean you&apos;re
					ready.
				</p>
				<p>
					Once the bag is open, squeeze the air out, seal it and keep it
					somewhere dark and cool. Not the fridge: every time you take it out,
					moisture condenses on the beans.
				</p>
				<p>
					Subscribers get coffee roasted to arrive on day three or four, so it
					is ready to brew by the weekend.
				</p>

				<AdSlot
					partner={adPartners.sponsored}
					format="native"
					label="Sponsored"
				>
					<GrinderStory />
				</AdSlot>
			</article>

			<div className="story-aside">
				<AdSlot
					partner={adPartners.rectangle}
					format="rectangle"
				>
					<OatMilkAd />
				</AdSlot>
				<AdChoices />
			</div>
		</div>
	</div>
);

export default Page;
