import { PrismaClient } from '../generated/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from "dotenv"
import { buildPoolConfig } from './env.js';
dotenv.config()

// 1. Create a connection pool (SSL only when DB_SSL=true, e.g. hosted Postgres)
const pool = new pg.Pool(buildPoolConfig());

// 2. Initialize the Prisma adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter to the PrismaClient constructor
const prisma = new PrismaClient({ adapter });

export default prisma;