import { PrismaClient } from '@prisma/client';

// Singleton PrismaClient instance for database access
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
	globalForPrisma.prisma ||
	new PrismaClient({
		log: ['error', 'warn'],
	});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
