export const revalidate = 60;

const ISRPage = () => (
	<p>
		C15tPrefetch on an ISR route (revalidate 60s). Built at{' '}
		{new Date().toISOString()}.
	</p>
);

export default ISRPage;
