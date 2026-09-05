import Link from 'next/link';

const scenarios = ['client', 'prefetch', 'ssr'];

const IndexPage = () => (
	<ul>
		{scenarios.map((scenario) => (
			<li key={scenario}>
				<Link href={`/${scenario}`}>{scenario}</Link>
			</li>
		))}
	</ul>
);

export default IndexPage;
