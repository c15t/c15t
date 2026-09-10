import { Consent } from '../../components/consent';

const Page = () => (
	<Consent config={{}}>
		<p className="route-note">
			This route resolves the manifest in the browser. Without location supplied
			by your app, it uses the unknown-location policy.
		</p>
	</Consent>
);

export default Page;
