export interface Product {
	id: string;
	name: string;
	/** Country of origin. Blends and samplers leave it out. */
	origin?: string;
	notes: string;
	weight: string;
	price: number;
	/** Label color on the bag illustration. */
	tint: string;
}

export const products: Product[] = [
	{
		id: 'huila-pink-bourbon',
		name: 'Huila Pink Bourbon',
		notes: 'Raspberry, cane sugar, rose',
		origin: 'Colombia',
		price: 22,
		tint: '#c9707d',
		weight: '340 g',
	},
	{
		id: 'guji-natural',
		name: 'Guji Natural',
		notes: 'Blueberry, cocoa nib, jasmine',
		origin: 'Ethiopia',
		price: 21,
		tint: '#6f6fa8',
		weight: '340 g',
	},
	{
		id: 'house-espresso',
		name: 'House Espresso',
		notes: 'Milk chocolate, hazelnut, toffee',
		origin: 'Brazil and Guatemala',
		price: 18,
		tint: '#8a5a3c',
		weight: '340 g',
	},
	{
		id: 'kayanza-washed',
		name: 'Kayanza Washed',
		notes: 'Red currant, black tea, honey',
		origin: 'Burundi',
		price: 20,
		tint: '#b5763a',
		weight: '340 g',
	},
	{
		id: 'sugarcane-decaf',
		name: 'Sugarcane Decaf',
		notes: 'Panela, orange peel, malt',
		origin: 'Colombia',
		price: 19,
		tint: '#5f8a6e',
		weight: '340 g',
	},
	{
		id: 'roasters-sampler',
		name: "Roaster's Sampler",
		notes: "Three coffees from this month's roasts",
		price: 26,
		tint: '#2f6f4e',
		weight: '3 × 113 g',
	},
];
