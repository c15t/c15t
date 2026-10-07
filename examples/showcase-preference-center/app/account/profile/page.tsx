import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Profile · Northwind Coffee' };

const ProfilePage = () => (
	<section
		aria-labelledby="profile-title"
		className="account-section"
	>
		<h1 id="profile-title">Profile</h1>
		<dl className="details">
			<div>
				<dt>Name</dt>
				<dd>Sam Okafor</dd>
			</div>
			<div>
				<dt>Email</dt>
				<dd>sam@example.com</dd>
			</div>
			<div>
				<dt>Delivery address</dt>
				<dd>14 Alder Street, Portland, OR 97205</dd>
			</div>
		</dl>
	</section>
);

export default ProfilePage;
