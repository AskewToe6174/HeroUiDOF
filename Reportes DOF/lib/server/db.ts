// lib/server/db.ts
import 'server-only';
import { Sequelize } from 'sequelize';
import 'mysql2';

declare global {
  // eslint-disable-next-line no-var
  var __sequelize: Sequelize | undefined;
}

function makeSequelize() {
  if (process.env.DATABASE_URL) {
    return new Sequelize(process.env.DATABASE_URL, { logging: false });
  }
  return new Sequelize(
    process.env.DB_NAME as string,
    process.env.DB_USER as string,
    process.env.DB_PASS as string,
    {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      dialect: (process.env.DB_DIALECT || 'mysql') as any,
      logging: false,
    }
  );
}

export const sequelize =
  global.__sequelize ?? (global.__sequelize = makeSequelize());
