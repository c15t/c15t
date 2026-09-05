import { createFileRoute, Link } from '@tanstack/react-router';

const HomePage = () => (
	<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
		<h1>@c15t/tanstack-start Browser Bench</h1>
		<ul>
			<li>
				<Link to="/baseline">/baseline</Link>
			</li>
			<li>
				<Link to="/client">/client</Link>
			</li>
			<li>
				<Link to="/manifest-client">/manifest-client</Link>
			</li>
			<li>
				<Link to="/ssr">/ssr</Link>
			</li>
			<li>
				<Link to="/manifest-ssr">/manifest-ssr</Link>
			</li>
			<li>
				<Link to="/manifest-ssr-proxy">/manifest-ssr-proxy</Link>
			</li>
		</ul>
	</main>
);

export const Route = createFileRoute('/')({
	component: HomePage,
});
