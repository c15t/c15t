import { getSelectedProductOptions, gql } from '@shopify/hydrogen';
import { notFound } from 'next/navigation';

import { ProductDetails } from '@/components/product-details';
import { getStorefrontClient } from '@/lib/storefront';

export const PRODUCT_QUERY = gql(`
	fragment ProductVariant on ProductVariant {
		id
		title
		availableForSale
		selectedOptions { name value }
		price { amount currencyCode }
		compareAtPrice { amount currencyCode }
		image { url altText width height }
		product { handle title }
		sku
	}

	query Product(
		$handle: String!
		$selectedOptions: [SelectedOptionInput!]!
		$country: CountryCode
		$language: LanguageCode
	) @inContext(country: $country, language: $language) {
		product(handle: $handle) {
			id
			handle
			title
			vendor
			description
			requiresSellingPlan
			encodedVariantExistence
			encodedVariantAvailability
			featuredImage { url altText width height }
			options {
				name
				optionValues {
					name
					firstSelectableVariant { ...ProductVariant }
					swatch { color image { previewImage { url } } }
				}
			}
			selectedOrFirstAvailableVariant(
				selectedOptions: $selectedOptions
				ignoreUnknownOptions: true
				caseInsensitiveMatch: true
			) {
				...ProductVariant
			}
			adjacentVariants(
				selectedOptions: $selectedOptions
				ignoreUnknownOptions: true
				caseInsensitiveMatch: true
			) {
				...ProductVariant
			}
			priceRange { minVariantPrice { amount currencyCode } }
		}
	}
`);

type SearchParams = Record<string, string | string[] | undefined>;

const toURLSearchParams = (input: SearchParams) => {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(input)) {
		for (const item of [value].flat()) {
			if (item !== undefined) {
				params.append(key, item);
			}
		}
	}
	return params;
};

const ProductPage = async ({
	params,
	searchParams,
}: {
	params: Promise<{ handle: string }>;
	searchParams: Promise<SearchParams>;
}) => {
	const { handle } = await params;
	const selectedOptions = getSelectedProductOptions({
		searchParams: toURLSearchParams(await searchParams),
	});
	const storefront = await getStorefrontClient();
	const { data } = await storefront.graphql(PRODUCT_QUERY, {
		variables: { handle, selectedOptions },
	});
	if (!data?.product) {
		notFound();
	}
	return <ProductDetails product={data.product} />;
};

export default ProductPage;
