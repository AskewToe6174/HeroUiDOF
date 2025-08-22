// lib/server/ensureDB.ts
import 'server-only';
import { sequelize } from '../server/db';
import { initModels } from './models';

let initialized = false;

export function getDB() {
  if (!initialized) {
    initModels(sequelize);
    initialized = true;
  }
  return { sequelize };
}

export async function ensureDB() {
  // Solo autentica; usa migraciones en prod (no sync aquí).
  await sequelize.authenticate();
}
