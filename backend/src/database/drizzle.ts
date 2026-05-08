import { drizzle } from 'drizzle-orm/node-postgres';
import { getPool } from '../config/db';
import * as schema from './schema';

type SchemaModule = typeof schema;

let cached: ReturnType<typeof drizzle<SchemaModule>> | null = null;

/** Drizzle ORM client (PostgreSQL / `pg`). Use alongside raw SQL where appropriate. */
export function getDb() {
  if (!cached) {
    cached = drizzle(getPool(), { schema });
  }
  return cached;
}
