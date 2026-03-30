import type { ReactNode } from 'react';

export type ObjectType = {
	/**
	 * Additional description of the field
	 */
	description?: ReactNode;
	type: string;
	typeDescription?: ReactNode;
	/**
	 * Optional link to the type
	 */
	typeDescriptionLink?: string;
	default?: string;
	required?: boolean;
	deprecated?: boolean;
	/** Resolved properties of a referenced type (1 level deep) */
	nestedProperties?: Record<string, ObjectType>;
};

export type PropertyRow = {
	id: string;
	name: string;
	property: ObjectType;
};

export type FilterType = 'all' | 'required' | 'optional';
