import { ProductGrid } from '@/components/product-grid';

import styles from './page.module.css';

const Page = () => (
	<main className={styles.main}>
		<div className={styles.intro}>
			<h1>This week&apos;s coffee</h1>
			<p>
				Roasted on Tuesdays and Fridays and shipped within two days. Every bag
				is whole bean unless you ask us to grind it.
			</p>
		</div>
		<ProductGrid />
	</main>
);

export default Page;
