import { Suspense } from 'react';

import { ConsentDemo } from '../../components/demo/consent-demo';

const Home = () => (
	<Suspense>
		<ConsentDemo />
	</Suspense>
);

export default Home;
