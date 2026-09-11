import { demoLocation } from '../../c15t.config';
import { Consent } from '../../components/consent';

const Page = () => (
	<Consent config={{ initialOverrides: demoLocation }}>
		<p className="route-note">
			This route resolves the manifest in the browser with a simulated United
			Kingdom location, GB.
		</p>
	</Consent>
);

export default Page;
