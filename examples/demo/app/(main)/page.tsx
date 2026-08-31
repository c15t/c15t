import { Suspense } from 'react';

import { ConsentDemo } from '../../components/demo/consent-demo';

const Home = () => {
	return (
		<Suspense>
			<ConsentDemo />
		</Suspense>
	);
};

export default Home;
