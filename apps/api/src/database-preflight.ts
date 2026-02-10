import { DataSource, DataSourceOptions } from 'typeorm';

const USERS_TABLE = 'public.users';

export async function purgeInvalidUsersBeforeSync(options: DataSourceOptions): Promise<void> {
  const preflightDataSource = new DataSource({
    ...options,
    entities: [],
    subscribers: [],
    migrations: [],
    synchronize: false,
    migrationsRun: false,
    dropSchema: false,
  });

  await preflightDataSource.initialize();

  try {
    const tableExistsResult = await preflightDataSource.query(
      `SELECT to_regclass('${USERS_TABLE}') AS users_table`,
    );

    if (!tableExistsResult[0]?.users_table) {
      return;
    }

    const columnsResult = await preflightDataSource.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      `,
    );

    const columns = new Set<string>(columnsResult.map((row: { column_name: string }) => row.column_name));
    const hasFirstName = columns.has('first_name');
    const hasLastName = columns.has('last_name');

    if (!hasFirstName || !hasLastName) {
      const rowCountResult = await preflightDataSource.query(`SELECT COUNT(*)::int AS count FROM users`);
      const rowCount = Number(rowCountResult[0]?.count ?? 0);

      if (rowCount > 0) {
        await preflightDataSource.query(`DELETE FROM users`);
        console.warn(
          `[DB preflight] Deleted ${rowCount} users rows because legacy schema is missing first_name/last_name and synchronize would fail on NOT NULL column creation.`,
        );
      }

      return;
    }

    const deleteResult = await preflightDataSource.query(
      `DELETE FROM users WHERE first_name IS NULL OR last_name IS NULL RETURNING id`,
    );

    if (deleteResult.length > 0) {
      console.warn(
        `[DB preflight] Deleted ${deleteResult.length} users rows with invalid NULL first_name/last_name before schema synchronize.`,
      );
    }
  } finally {
    await preflightDataSource.destroy();
  }
}
