import { beforeEach, describe, expect, test, vi } from 'vitest';
import { defineEntity } from '../entity/entity';
import {
	createField,
	idField,
	incrementalIdField,
	prefixedIdField,
	uuidField,
} from '../schema/fields';

// Mock global sequences for consistent test snapshots
vi.mock('uuid', () => ({
	v4: () => '123e4567-e89b-12d3-a456-426614174000',
}));

vi.mock('nanoid', () => ({
	nanoid: () => 'Xc9aEb3Z1f',
}));

describe('ID Field Types', () => {
	beforeEach(() => {
		// Reset sequences for incremental IDs
		vi.restoreAllMocks();
		// Reset custom sequence
		if ((globalThis as any).__sequences) {
			(globalThis as any).__sequences = undefined;
		}
	});

	test('UUID field generates and validates UUIDs', async () => {
		const userEntity = defineEntity({
			name: 'user',
			fields: {
				// UUID: "123e4567-e89b-12d3-a456-426614174000"
				id: uuidField({ required: false }), // Make ID not required for testing
				name: createField('string', { required: true }),
				email: createField('string', { required: true }),
			},
		});

		const user = await userEntity.validate({
			name: 'John Doe',
			email: 'john@example.com',
		});

		// Check that ID was generated and is a valid UUID
		expect(user.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
		);
		// Test other fields
		expect(user.name).toBe('John Doe');
		expect(user.email).toBe('john@example.com');
	});

	test('Prefixed ID field generates and validates prefixed nanoids', async () => {
		const productEntity = defineEntity({
			name: 'product',
			fields: {
				// Prefixed nanoid: "prod_Xc9aEb3Z1f"
				id: prefixedIdField('prod_', { length: 8, required: false }), // Make ID not required for testing
				name: createField('string', { required: true }),
				price: createField('number', { required: true }),
			},
		});

		const product = await productEntity.validate({
			name: 'Premium Widget',
			price: 49.99,
		});

		// Check that ID was generated and has the correct format
		expect(product.id).toMatch(/^prod_[a-zA-Z0-9]+$/);
		// Test other fields
		expect(product.name).toBe('Premium Widget');
		expect(product.price).toBe(49.99);
	});

	test('Incremental ID field generates and validates sequential IDs', async () => {
		const orderEntity = defineEntity({
			name: 'order',
			fields: {
				// Incremental ID: 1000, 1001, 1002...
				id: incrementalIdField(1000, { required: false }), // Make ID not required for testing
				items: createField('array', { required: true }),
			},
		});

		const order1 = await orderEntity.validate({ items: ['item1', 'item2'] });
		const order2 = await orderEntity.validate({ items: ['item3'] });

		// Check that IDs were generated as expected
		expect(order1.id).toBe(1000);
		expect(order2.id).toBe(1001);
		expect(order1.items).toEqual(['item1', 'item2']);
		expect(order2.items).toEqual(['item3']);
	});

	test('Custom ID field generates and validates with custom format', async () => {
		// Mock date to ensure consistent test results
		const mockDate = new Date('2024-01-01');
		vi.setSystemTime(mockDate);

		const ticketEntity = defineEntity({
			name: 'ticket',
			fields: {
				// Custom generator - ticket numbers like "TKT-2024-00001"
				id: idField({
					idType: 'custom',
					required: false, // Make ID not required for testing
					generator: () => {
						const year = new Date().getFullYear();
						// For demo purposes only - in production we'd use a database sequence
						if (!(globalThis as any).__sequences) {
							(globalThis as any).__sequences = { ticket: 1 };
						}
						const num = (globalThis as any).__sequences.ticket++;
						return `TKT-${year}-${num.toString().padStart(5, '0')}`;
					},
				}),
				subject: createField('string', { required: true }),
			},
		});

		const ticket1 = await ticketEntity.validate({ subject: 'Technical issue' });
		const ticket2 = await ticketEntity.validate({ subject: 'Feature request' });

		// Check that IDs were generated correctly
		expect(ticket1.id).toBe('TKT-2024-00001');
		expect(ticket2.id).toBe('TKT-2024-00002');
		expect(ticket1.subject).toBe('Technical issue');
		expect(ticket2.subject).toBe('Feature request');

		// Reset the mocked date
		vi.useRealTimers();
	});
});
