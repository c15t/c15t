import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
	component: App,
});

function App() {
	return (
		<div>
			<h1>@c15t/react Examples</h1>
			<ul>
				<li>
					<Link to="/simple-cookie-banner">Simple Cookie Banner</Link>
				</li>
				<li>
					<Link to="/simple-consent-dialog">Simple Consent Dialog</Link>
				</li>
			</ul>
		</div>
	);
}
