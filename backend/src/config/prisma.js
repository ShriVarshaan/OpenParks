import "./loadEnv.js"
import { PrismaClient } from '../generated/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { buildPoolConfig } from './env.js';

// 1. Create a connection pool (SSL only when DB_SSL=true, e.g. hosted Postgres)
const pool = new pg.Pool(buildPoolConfig());

// 2. Initialize the Prisma adapter
// disposeExternalPool: $disconnect() also closes the pool, so scripts and tests exit promptly
const adapter = new PrismaPg(pool, { disposeExternalPool: true });

// 3. Pass the adapter to the PrismaClient constructor
const prisma = new PrismaClient({ adapter });

export default prisma;