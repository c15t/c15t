import { HomeLayout } from '~/components/layouts/home';
import { homePageOptions } from './layout.config';
import NotFoundClient from './not-found.client';
export default function NotFound() {
	return (
		<HomeLayout {...homePageOptions}>
			<NotFoundClient />
		</HomeLayout>
	);
}
