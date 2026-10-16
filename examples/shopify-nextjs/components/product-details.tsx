'use client';

import {
	AnalyticsEvent,
	buildProductSelectionSearchParams,
	canAddToCart,
} from '@shopify/hydrogen';
import type { SelectedOption, StorefrontApi } from '@shopify/hydrogen';
import { createProductComponents } from '@shopify/hydrogen/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import type { PRODUCT_QUERY } from '@/app/products/[handle]/page';
import { getAnalytics } from '@/lib/analytics';
import { imageUrl, money } from '@/lib/format';

type ProductData = NonNullable<
	StorefrontApi.ResultOf<typeof PRODUCT_QUERY>['product']
>;

const { ProductProvider, useProductForm } =
	createProductComponents<ProductData>();

const variantUrl = (
	product: ProductData,
	selectedOptions: SelectedOption[],
	handle: string = product.handle,
	base?: URLSearchParams | ReturnType<typeof useSearchParams>
) => {
	const params = buildProductSelectionSearchParams({
		base: new URLSearchParams(base?.toString()),
		optionNames: product.options.map((option) => option.name),
		selectedOptions,
	});
	const query = params.toString();
	return `/products/${handle}${query ? `?${query}` : ''}`;
};

/** Publishes one product view per product, not per variant change. */
const ProductViewed = ({ product }: { product: ProductData }) => {
	const viewed = useRef<string | null>(null);

	useEffect(() => {
		if (viewed.current === product.handle) {
			return;
		}
		viewed.current = product.handle;
		const variant = product.selectedOrFirstAvailableVariant;
		getAnalytics()?.publish(AnalyticsEvent.PRODUCT_VIEWED, {
			products: [
				{
					id: product.id,
					price: variant?.price ?? product.priceRange.minVariantPrice,
					quantity: 1,
					sku: variant?.sku ?? undefined,
					title: product.title,
					variantId: variant?.id ?? product.id,
					variantTitle: variant?.title ?? product.title,
					vendor: product.vendor,
				},
			],
		});
	}, [product]);

	return null;
};

const VariantSelector = ({ product }: { product: ProductData }) => {
	const { options, register } = useProductForm();
	const searchParams = useSearchParams();

	if (options.every((option) => option.values.length <= 1)) {
		return null;
	}

	return (
		<div className="variant-selector">
			{options.map((option) => (
				<fieldset key={option.name}>
					<legend>{option.name}</legend>
					<div className="option-values">
						{option.values.map((value) => {
							const href = variantUrl(
								product,
								value.selectedOptions,
								value.handle,
								searchParams
							);
							if (!value.exists) {
								return (
									<button
										aria-pressed={value.selected}
										className="option-value"
										disabled
										key={value.name}
										type="button"
									>
										{value.name}
									</button>
								);
							}
							if (value.handle !== product.handle) {
								return (
									<Link
										className="option-value"
										href={href}
										key={value.name}
										scroll={false}
									>
										{value.name}
									</Link>
								);
							}
							return (
								<Link
									aria-current={value.selected ? 'true' : undefined}
									className="option-value"
									data-available={value.available}
									href={href}
									key={value.name}
									onNavigate={(event) => {
										// The provider's onSelect updates the URL once.
										event.preventDefault();
										register('optionValue', {
											optionName: option.name,
											value: value.name,
										}).onClick();
									}}
									scroll={false}
								>
									{value.name}
									{value.available ? null : (
										<span className="sr-only"> (Sold out)</span>
									)}
								</Link>
							);
						})}
					</div>
				</fieldset>
			))}
		</div>
	);
};

const ctaLabel = (
	addable: boolean,
	hasVariant: boolean,
	pending: boolean
): string => {
	if (pending) {
		return 'Adding…';
	}
	if (addable) {
		return 'Add to cart';
	}
	return hasVariant ? 'Sold out' : 'Select options';
};

const AddToCart = ({ product }: { product: ProductData }) => {
	const { errors, formProps, options, pending, register, selectedVariant } =
		useProductForm();
	const addable = canAddToCart(product, options);
	const messages = [
		...errors.userErrors.map((error) => error.message),
		...errors.warnings.map((warning) => warning.message),
		...errors.networkErrors.map((error) => error.message),
	];

	return (
		<form
			className="add-to-cart"
			{...formProps()}
		>
			<input
				type="hidden"
				{...register('merchandiseId', {})}
			/>
			<input
				type="hidden"
				{...register('quantity', { value: 1 })}
			/>
			<button
				{...register('addToCart', {})}
				disabled={!addable || pending}
				type="submit"
			>
				{ctaLabel(addable, selectedVariant !== null, pending)}
			</button>
			{messages.length > 0 ? (
				<ul
					className="form-errors"
					role="alert"
				>
					{messages.map((message) => (
						<li key={message}>{message}</li>
					))}
				</ul>
			) : null}
		</form>
	);
};

const ProductImage = ({ product }: { product: ProductData }) => {
	const { selectedVariant } = useProductForm();
	const image = selectedVariant?.image ?? product.featuredImage;

	return (
		<div className="product-image">
			{image ? (
				<img
					alt={image.altText ?? product.title}
					height={800}
					src={imageUrl(image.url, 1000)}
					width={800}
				/>
			) : null}
		</div>
	);
};

const ProductHeading = ({ product }: { product: ProductData }) => {
	const { selectedVariant } = useProductForm();
	const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
	const compareAt = selectedVariant?.compareAtPrice;

	return (
		<div className="product-heading">
			<p className="product-vendor">{product.vendor}</p>
			<h1>{product.title}</h1>
			<p className="product-price">
				{money(price)}
				{compareAt ? <s>{money(compareAt)}</s> : null}
			</p>
		</div>
	);
};

export const ProductDetails = ({ product }: { product: ProductData }) => {
	const router = useRouter();
	const searchParams = useSearchParams();

	return (
		<ProductProvider
			onSelect={(result) => {
				router.replace(
					variantUrl(
						product,
						result.selectedOptions,
						result.selectedVariant?.product?.handle,
						searchParams
					),
					{ scroll: false }
				);
			}}
			product={product}
		>
			<ProductViewed product={product} />
			<main className="product">
				<ProductImage product={product} />
				<div className="product-info">
					<ProductHeading product={product} />
					<VariantSelector product={product} />
					<AddToCart product={product} />
					<p className="product-description">{product.description}</p>
				</div>
			</main>
		</ProductProvider>
	);
};
