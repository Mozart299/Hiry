import type { Config } from 'drizzle-kit';

export default {
  schema: './schema.ts', // Path to your schema file
  out: './migrations',                // Directory where migrations will be stored
  dialect: 'postgresql',              // Specify the database dialect
} satisfies Config;
