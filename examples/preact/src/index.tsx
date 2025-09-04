import { ConsentManagerBanner, CookieBanner } from '@c15t/preact/index';
import { hydrate } from 'preact-iso';
import preactLogo from './assets/preact.svg';
import './style.css';

interface ResourceProps {
	title: string;
	description: string;
	href: string;
}

function Resource(props: ResourceProps) {
	return (
		<a href={props.href} target="_blank" class="resource" rel="noreferrer">
			<h2>{props.title}</h2>
			<p>{props.description}</p>
		</a>
	);
}

export function App() {
	return (
		<ConsentManagerBanner
			options={{
				mode: 'offline',
				ui: { noStyle: false },
			}}
		>
			<div>
				<a href="https://preactjs.com" target="_blank" rel="noreferrer">
					<picture>
						<source srcSet={preactLogo} type="image/svg+xml" />
						<img
							src={preactLogo}
							alt="Preact Logo"
							width="160"
							height="160"
							loading="lazy"
						/>
					</picture>
				</a>
				<h1>Get Started building Vite-powered Preact Apps with C15T</h1>
				<section>
					<Resource
						title="C15T Documentation"
						description="Learn about privacy-first consent management for modern web applications"
						href="https://c15t.com"
					/>
					<Resource
						title="Learn Preact"
						description="If you're new to Preact, try the interactive tutorial to learn important concepts"
						href="https://preactjs.com/tutorial"
					/>
					<Resource
						title="Learn Vite"
						description="To learn more about Vite and how you can customize it to fit your needs, take a look at their excellent documentation"
						href="https://vitejs.dev"
					/>
				</section>

				{/* Cookie Banner - will appear automatically for first-time visitors */}
				<CookieBanner
					title="🍪 Cookie Notice"
					description="We use cookies to enhance your browsing experience and analyze our traffic. By continuing to use our site, you agree to our cookie policy."
					acceptButtonText="Accept All"
					rejectButtonText="Reject All"
					customizeButtonText="Customize"
				/>
			</div>
		</ConsentManagerBanner>
	);
}

hydrate(<App />, document.getElementById('app'));
