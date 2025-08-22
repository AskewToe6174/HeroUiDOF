// lib/server/db.ts
import 'server-only';
import { Sequelize } from 'sequelize';

declare global {
  // eslint-disable-next-line no-var
  var __sequelize: Sequelize | undefined;
}

const getSequelize = () => {
  if (global.__sequelize) return global.__sequelize;

  // O usa process.env.DATABASE_URL directamente
  const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        logging: false,
      })
    : new Sequelize(
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

  if (process.env.NODE_ENV !== 'production') {
    global.__sequelize = sequelize;
  }
  return sequelize;
};

export const sequelize = getSequelize();
