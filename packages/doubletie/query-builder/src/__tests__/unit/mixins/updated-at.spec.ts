import { beforeEach, describe, expect, it, vi } from 'vitest';
import withUpdatedAt from '../../../mixins/updated-at';
import type { ModelFunctions } from '../../../model';
import type { DB } from '../../fixtures/migration';

// Define the type for the enhanced model with updateById
type ModelWithUpdateById<
	TDatabase,
	TTableName extends keyof TDatabase & string,
	TIdColumnName extends keyof TDatabase[TTableName] & string,
> = ReturnType<typeof withUpdatedAt<TDatabase, TTableName, TIdColumnName>>;

describe('unit: updatedAt mixin', () => {
	let mockModel: ModelFunctions<DB, 'users', 'id'>;
	let modelWithUpdatedAt: ModelWithUpdateById<DB, 'users', 'id'>;
	let mockUpdateTable: any;
	let mockWhere: any;
	let mockSet: any;
	let mockReturningAll: any;
	let mockExecuteTakeFirstOrThrow: any;
	let mockExpressionBuilder: any;

	beforeEach(() => {
		// Setup mock expression builder
		mockExpressionBuilder = vi.fn().mockReturnValue('id = 1');

		// Setup mock chain for updateTable
		mockExecuteTakeFirstOrThrow = vi
			.fn()
			.mockResolvedValue({ id: '1', name: 'Updated User' });
		mockReturningAll = vi.fn().mockReturnValue({
			executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
		});
		mockSet = vi.fn().mockReturnValue({ returningAll: mockReturningAll });
		mockWhere = vi.fn().mockReturnValue({ set: mockSet });
		mockUpdateTable = vi.fn().mockReturnValue({
			where: mockWhere,
		});

		// Create base mock model
		mockModel = {
			table: 'users',
			id: 'id',
			processDataBeforeUpdate: vi.fn().mockImplementation((data) => data),
			updateTable: mockUpdateTable,
		} as any;

		// Apply mixin
		modelWithUpdatedAt = withUpdatedAt(mockModel, 'updatedAt');
	});

	describe('processDataBeforeUpdate', () => {
		it('should add updatedAt timestamp to update data', () => {
			const now = new Date();
			vi.setSystemTime(now);
			const isoString = now.toISOString();

			const data = {
				name: 'Updated Name',
				email: 'updated@example.com',
			};
			const result = modelWithUpdatedAt.processDataBeforeUpdate(data);

			expect(result).toEqual({
				...data,
				updatedAt: isoString,
			});
		});

		it('should chain with original processDataBeforeUpdate', () => {
			const originalImplementation = vi.fn().mockImplementation((data) => ({
				...data,
				status: 'processed',
			}));
			mockModel.processDataBeforeUpdate = originalImplementation;

			const modelWithBoth = withUpdatedAt(mockModel, 'updatedAt');
			const now = new Date();
			vi.setSystemTime(now);
			const isoString = now.toISOString();

			const data = {
				name: 'Updated Name',
				email: 'updated@example.com',
			};
			const result = modelWithBoth.processDataBeforeUpdate(data);

			expect(originalImplementation).toHaveBeenCalled();
			expect(result).toEqual({
				...data,
				status: 'processed',
				updatedAt: isoString,
			});
		});
	});

	describe('updateById', () => {
		it('should update a record with the specified column and add updatedAt timestamp', async () => {
			const now = new Date();
			vi.setSystemTime(now);
			const isoString = now.toISOString();

			// Now we can call updateById directly without type assertion
			await modelWithUpdatedAt.updateById('1', 'name', 'New Name');

			expect(mockUpdateTable).toHaveBeenCalled();
			expect(mockWhere).toHaveBeenCalled();
			expect(mockSet).toHaveBeenCalledWith({
				name: 'New Name',
				updatedAt: isoString,
			});
			expect(mockReturningAll).toHaveBeenCalled();
			expect(mockExecuteTakeFirstOrThrow).toHaveBeenCalled();
		});
	});
});
