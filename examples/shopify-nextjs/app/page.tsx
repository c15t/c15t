import { gql } from '@shopify/hydrogen';
import Link from 'next/link';

import { imageUrl, money } from '@/lib/format';
import { getStorefrontClient } from '@/lib/storefront';

const PRODUCTS_QUERY = gql(`
	query Products($country: CountryCode, $language: LanguageCode)
	@inContext(country: $country, language: $language) {
		products(first: 12) {
			nodes {
				id
				handle
				title
				featuredImage { url altText width height }
				priceRange { minVariantPrice { amount currencyCode } }
			}
		}
	}
`);

const Page = async () => {
	const storefront = await getStorefrontClient();
	const { data } = await storefront.graphql(PRODUCTS_QUERY);
	const products = data?.products.nodes ?? [];

	return (
		<main>
			<section className="intro">
				<h1>Everyday goods</h1>
				<p>
					A demo store on mock.shop. The c15t banner collects consent and sends
					it to Shopify&apos;s Customer Privacy API. Hydrogen holds every
					analytics event until you answer.
				</p>
			</section>
			<ul className="product-grid">
				{products.map((product) => (
					<li key={product.id}>
						<Link
							className="product-card"
							href={`/products/${product.handle}`}
						>
							{product.featuredImage ? (
								<img
									alt={product.featuredImage.altText ?? product.title}
									height={400}
									src={imageUrl(product.featuredImage.url, 600)}
									width={400}
								/>
							) : null}
							<span className="product-card-title">{product.title}</span>
							<span className="product-card-price">
								From {money(product.priceRange.minVariantPrice)}
							</span>
						</Link>
					</li>
				))}
			</ul>
		</main>
	);
};

export default Page;
