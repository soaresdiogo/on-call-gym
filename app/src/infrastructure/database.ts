import { PGlite } from '@electric-sql/pglite';
import { SCHEMA_STATEMENTS } from './schema.js';
import { seedCatalog } from './seed.js';

export interface SqlClient {
  query<Row>(sql: string, params?: unknown[]): Promise<Row[]>;
}

export interface Database extends SqlClient {
  transaction<Result>(work: (client: SqlClient) => Promise<Result>): Promise<Result>;
  close(): Promise<void>;
}

/** Embedded PostgreSQL (PGlite): real SQL semantics without asking learners to run Docker. */
class PgliteDatabase implements Database {
  constructor(private readonly client: PGlite) {}

  async query<Row>(sql: string, params: unknown[] = []): Promise<Row[]> {
    const result = await this.client.query<Row>(sql, params);
    return result.rows;
  }

  transaction<Result>(work: (client: SqlClient) => Promise<Result>): Promise<Result> {
    return this.client.transaction((transaction) =>
      work({
        query: async <Row>(sql: string, params: unknown[] = []) => (await transaction.query<Row>(sql, params)).rows,
      }),
    );
  }

  close(): Promise<void> {
    return this.client.close();
  }
}

/** Opens the store database; no directory means an in-memory database. */
export async function openDatabase(directory?: string): Promise<Database> {
  const client = directory ? await PGlite.create(directory) : await PGlite.create();
  const database = new PgliteDatabase(client);
  for (const statement of SCHEMA_STATEMENTS) {
    await database.query(statement);
  }
  await seedCatalog(database);
  return database;
}
