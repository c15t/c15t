/**
 * Database Utilities Module
 *
 * This module provides various utility functions for database operations,
 * including adapter creation and data conversion between application and database formats.
 *
 * @module db/utils
 */

export { getAdapter } from './adapter-factory';
export { convertToDB, convertFromDB } from './data-converters';
export { toZodSchema } from './to-zod';
export { isCoreTable } from './type-guards';
