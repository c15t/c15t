import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DoubleTieError } from '../core/error-class';
import { ERROR_CODES } from '../core/error-codes';
import { retrievalPipeline } from '../pipeline/retrieval-pipeline';

describe('retrievalPipeline', () => {
  // Setup test data
  const mockUser = { id: '123', name: 'John Doe', email: 'john@example.com' };

  // Mock fetcher and transformer functions
  let fetcher: ReturnType<typeof vi.fn>;
  let transformer: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetcher = vi.fn();
    transformer = vi.fn().mockImplementation((data) => ({
      ...data,
      displayName: `${data.name} <${data.email}>`,
    }));
  });

  it('should return a function that returns a ResultAsync', () => {
    fetcher.mockResolvedValue(mockUser);

    const retrieveUser = retrievalPipeline(fetcher, transformer);

    expect(typeof retrieveUser).toBe('function');

    const result = retrieveUser();
    expect(result).toHaveProperty('then');
    expect(result).toHaveProperty('map');
    expect(result).toHaveProperty('mapErr');
  });

  it('should transform data successfully when fetcher resolves', async () => {
    fetcher.mockResolvedValue(mockUser);

    const retrieveUser = retrievalPipeline(fetcher, transformer);
    const result = await retrieveUser();

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      displayName: 'John Doe <john@example.com>',
    });

    // Verify fetcher and transformer were called correctly
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(transformer).toHaveBeenCalledWith(mockUser);
  });

  it('should return a not found error when fetcher resolves with null', async () => {
    fetcher.mockResolvedValue(null);

    const retrieveUser = retrievalPipeline(fetcher, transformer);
    const result = await retrieveUser();

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();

    expect(error).toBeInstanceOf(DoubleTieError);
    expect(error.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Resource not found');

    // Verify fetcher was called but transformer wasn't
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(transformer).not.toHaveBeenCalled();
  });

  it('should return a not found error when fetcher resolves with undefined', async () => {
    fetcher.mockResolvedValue(undefined);

    const retrieveUser = retrievalPipeline(fetcher, transformer);
    const result = await retrieveUser();

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();

    expect(error).toBeInstanceOf(DoubleTieError);
    expect(error.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(error.statusCode).toBe(404);
  });

  it('should return a not found error when fetcher rejects with not found message', async () => {
    const notFoundError = new Error('Resource not found');
    fetcher.mockRejectedValue(notFoundError);

    const retrieveUser = retrievalPipeline(fetcher, transformer);
    const result = await retrieveUser();

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();

    expect(error).toBeInstanceOf(DoubleTieError);
    expect(error.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(error.statusCode).toBe(404);
    expect(error.cause).toBe(notFoundError);
  });

  it('should return a bad request error when fetcher rejects with other error', async () => {
    const connectionError = new Error('Database connection failed');
    fetcher.mockRejectedValue(connectionError);

    const retrieveUser = retrievalPipeline(fetcher, transformer);
    const result = await retrieveUser();

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();

    expect(error).toBeInstanceOf(DoubleTieError);
    expect(error.code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(error.statusCode).toBe(400);
    expect(error.cause).toBe(connectionError);
  });

  it('should use a custom error code when provided', async () => {
    const notFoundError = new Error('Record not found');
    fetcher.mockRejectedValue(notFoundError);

    const customErrorCode = 'CUSTOM_NOT_FOUND_ERROR';
    const retrieveUser = retrievalPipeline(
      fetcher,
      transformer,
      customErrorCode
    );
    const result = await retrieveUser();

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();

    expect(error).toBeInstanceOf(DoubleTieError);
    expect(error.code).toBe(customErrorCode);
  });

  it('should return a bad request error when transformer throws', async () => {
    fetcher.mockResolvedValue(mockUser);

    const transformerError = new Error('Transformation failed');
    transformer.mockImplementation(() => {
      throw transformerError;
    });

    const retrieveUser = retrievalPipeline(fetcher, transformer);
    const result = await retrieveUser();

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();

    expect(error).toBeInstanceOf(DoubleTieError);
    expect(error.code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(error.statusCode).toBe(400);
    expect(error.cause).toBe(transformerError);
  });
});
