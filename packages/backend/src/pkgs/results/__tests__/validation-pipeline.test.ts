import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { DoubleTieError } from '../core/error-class';
import { ERROR_CODES } from '../core/error-codes';
import { validationPipeline } from '../pipeline/validation-pipeline';

describe('validationPipeline', () => {
	// Define a simple schema for testing
	const userSchema = z.object({
		name: z.string().min(2),
		email: z.string().email(),
		age: z.number().min(18),
	});

	// Define a simple transformer
	const transformer = (data: z.infer<typeof userSchema>) => ({
		...data,
		nameUpperCase: data.name.toUpperCase(),
		isAdult: data.age >= 18,
	});

	it('should return a function that takes data to validate', () => {
		const validate = validationPipeline(userSchema, transformer);
		expect(typeof validate).toBe('function');
	});

	it('should validate and transform valid data successfully', () => {
		const validate = validationPipeline(userSchema, transformer);

		const validData = {
			name: 'John',
			email: 'john@example.com',
			age: 25,
		};

		const result = validate(validData);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toEqual({
			name: 'John',
			email: 'john@example.com',
			age: 25,
			nameUpperCase: 'JOHN',
			isAdult: true,
		});
	});

	it('should return an error result when validation fails', () => {
		const validate = validationPipeline(userSchema, transformer);

		const invalidData = {
			name: 'J', // Too short
			email: 'not-an-email', // Invalid email
			age: 16, // Below minimum age
		};

		const result = validate(invalidData);

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();

		expect(error).toBeInstanceOf(DoubleTieError);
		expect(error.code).toBe(ERROR_CODES.INVALID_REQUEST);
		expect(error.status).toBe(400);
		expect(error.meta).toBeDefined();
		expect(error.meta.validationErrors).toBeDefined();

		// Check that validation errors contain the expected fields
		const validationErrors = error.meta.validationErrors as z.ZodIssue[];

		// Verify we have all three validation errors
		expect(validationErrors).toHaveLength(3);

		// Find errors for each field by their path
		const nameError = validationErrors.find((e) => e.path[0] === 'name');
		const emailError = validationErrors.find((e) => e.path[0] === 'email');
		const ageError = validationErrors.find((e) => e.path[0] === 'age');

		// Verify each error exists
		expect(nameError).toBeDefined();
		expect(emailError).toBeDefined();
		expect(ageError).toBeDefined();

		// Verify specific error messages
		expect(nameError?.message).toBe(
			'String must contain at least 2 character(s)'
		);
		expect(emailError?.message).toBe('Invalid email');
		expect(ageError?.message).toBe(
			'Number must be greater than or equal to 18'
		);

		// Verify error codes
		expect(nameError?.code).toBe('too_small');
		expect(emailError?.code).toBe('invalid_string');
		expect(ageError?.code).toBe('too_small');
	});

	it('should return an error result when transformer throws', () => {
		const errorThrowingTransformer = vi.fn().mockImplementation(() => {
			throw new Error('Transformation error');
		});

		const validate = validationPipeline(userSchema, errorThrowingTransformer);

		const validData = {
			name: 'John',
			email: 'john@example.com',
			age: 25,
		};

		const result = validate(validData);

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();

		expect(error).toBeInstanceOf(DoubleTieError);
		expect(error.code).toBe(ERROR_CODES.BAD_REQUEST);
		expect(error.status).toBe(400);
		expect(error.cause).toBeInstanceOf(Error);
		expect(error.cause?.message).toBe('Transformation error');

		// Check that the transformer was called with the validated data
		expect(errorThrowingTransformer).toHaveBeenCalledWith(validData);

		// Check that the input data is included in the metadata
		expect(error.meta.inputData).toEqual(validData);
	});

	it('should handle different schema types correctly', () => {
		// Array schema
		const arraySchema = z.array(z.string());
		const arrayTransformer = (data: string[]) =>
			data.map((item) => item.toUpperCase());
		const validateArray = validationPipeline(arraySchema, arrayTransformer);

		const arrayResult = validateArray(['a', 'b', 'c']);
		expect(arrayResult.isOk()).toBe(true);
		expect(arrayResult._unsafeUnwrap()).toEqual(['A', 'B', 'C']);

		// Number schema
		const numberSchema = z.number().positive();
		const numberTransformer = (num: number) => num * 2;
		const validateNumber = validationPipeline(numberSchema, numberTransformer);

		const numberResult = validateNumber(5);
		expect(numberResult.isOk()).toBe(true);
		expect(numberResult._unsafeUnwrap()).toBe(10);
	});
});
