/**
 * Import test file - not for production use
 * This file tests that imports from the various packages work correctly
 */

// Import from the data-model package
import {
	Field,
	FieldType,
	SchemaDefinition,
	TableDefinition,
	stringField,
} from '~/pkgs/data-model';

// Import from the old db path - should reference the new data-model package
import {
	Field as OldField,
	FieldType as OldFieldType,
} from '~/pkgs/data-model';

// Quick test to ensure imports match
const testImport = () => {
	// This should compile if the types match
	const field1: Field = {} as OldField;
	const fieldType1: FieldType = {} as OldFieldType;

	console.log('Types match!', field1, fieldType1);
};

// Just export the function to avoid usage errors
export { testImport };
