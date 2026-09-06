import Link from 'next/link';

const HomePage = () => (
	<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
		<h1>@c15t/nextjs Browser Bench</h1>
		<ul>
			<li>
				<Link href="/client">/client</Link>
			</li>
			<li>
				<Link href="/manifest-client">/manifest-client</Link>
			</li>
			<li>
				<Link href="/ssr">/ssr</Link>
			</li>
			<li>
				<Link href="/manifest-ssr">/manifest-ssr</Link>
			</li>
			<li>
				<Link href="/rsc-ssr">/rsc-ssr</Link>
			</li>
		</ul>
	</main>
);

export default HomePage;
