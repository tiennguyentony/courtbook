export const config = {
  port: Number(process.env.PORT ?? 3000),
  dbPath: process.env.DB_PATH ?? ':memory:',
  logLevel: process.env.LOG_LEVEL ?? 'info',
};
