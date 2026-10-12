/* oxlint-disable react/iframe-missing-sandbox -- The YouTube player and the map are cross-origin and need scripts and their own origin to work. */
import { MapPreview, VideoPreview } from '@/components/embed-previews';
import { GatedEmbed } from '@/components/gated-embed';
import { SupportChat } from '@/components/support-chat';

const directionsURL =
	'https://www.google.com/maps/dir/?api=1&destination=45.5155,-122.6650';

const RoasteryPage = () => (
	<article className="article">
		<header className="article-header">
			<h1>Come see where your coffee is roasted</h1>
			<p className="dek">
				Our roastery on Water Street is also a café. Here is how to find it,
				what to order, and the V60 method we teach at the brew bar.
			</p>
			<p className="byline">Maren Holt, head roaster · September 2026</p>
		</header>

		<div className="prose">
			<p>
				Every bag we ship is roasted in the room you can sit in. The roaster
				runs Tuesday to Saturday mornings, so before noon you can smell it from
				the street. The brew bar is where we taste each batch before it goes
				out.
			</p>
			<p>
				Ask for whatever is on the cupping table. It changes every week, and the
				person pouring it probably roasted it.
			</p>

			<h2>Brew it like we do</h2>
			<p>
				Our baristas learned the V60 from this video, and it is still the method
				we teach in Saturday classes. Bloom with twice the coffee’s weight in
				water, swirl, then pour in one steady stream.
			</p>
		</div>

		<figure className="wide">
			<GatedEmbed
				category="marketing"
				className="embed-frame embed-video"
				label="The Ultimate V60 Technique, on YouTube"
				disclosure="Playing it here loads YouTube's player. It sends your IP address and browser details to Google and can set advertising cookies."
				allowLabel="Allow and load video"
				preview={<VideoPreview />}
			>
				<iframe
					src="https://www.youtube-nocookie.com/embed/AI4ynXzkSQo?playsinline=1"
					title="The Ultimate V60 Technique, by James Hoffmann"
					sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
					allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
					referrerPolicy="strict-origin-when-cross-origin"
					allowFullScreen
				/>
			</GatedEmbed>
			<figcaption>
				Our recipe: 15 g coffee, 250 g water at 94 °C, medium-fine grind.{' '}
				<a
					className="text-link"
					href="https://www.youtube.com/watch?v=AI4ynXzkSQo"
				>
					Watch on YouTube
				</a>
			</figcaption>
		</figure>

		<div className="prose">
			<h2>Find us</h2>
			<p>
				We are two blocks from the river, on the corner with the green awning.
				The roastery door is round the side if you are picking up a wholesale
				order.
			</p>
		</div>

		<section
			className="wide visit"
			aria-label="Location and hours"
		>
			<GatedEmbed
				category="experience"
				className="embed-frame embed-map"
				label="Map from Google Maps"
				disclosure="Loading the map sends your IP address and browser details to Google, and Google may set cookies."
				allowLabel="Allow and load map"
				preview={<MapPreview />}
			>
				<iframe
					src="https://www.google.com/maps?q=45.5155,-122.6650&z=16&output=embed"
					title="Map showing the Northwind Coffee roastery"
					sandbox="allow-scripts allow-same-origin allow-popups"
					referrerPolicy="no-referrer-when-downgrade"
				/>
			</GatedEmbed>
			<div className="visit-card">
				<h3>Northwind Coffee Roastery</h3>
				<address>
					1180 SE Water Street
					<br />
					Portland, OR 97214
				</address>
				<dl className="hours">
					<div>
						<dt>Mon–Fri</dt>
						<dd>7:00–17:00</dd>
					</div>
					<div>
						<dt>Sat–Sun</dt>
						<dd>8:00–16:00</dd>
					</div>
				</dl>
				<p className="visit-note">
					Street parking on Water Street. Bike racks by the door.
				</p>
				<a
					className="button button-secondary"
					href={directionsURL}
				>
					Get directions
				</a>
			</div>
		</section>

		<div className="prose">
			<h2>Questions before you visit?</h2>
			<p>
				Want to know if a coffee is in stock, or book a spot in a Saturday
				class? Ask a roaster in the chat, or call the café on (503) 555-0142.
			</p>
		</div>

		<div className="wide">
			<SupportChat />
		</div>
	</article>
);

export default RoasteryPage;
