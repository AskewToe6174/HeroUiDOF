// lib/server/ensureDB.ts
import 'server-only';
import { sequelize } from './db';
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
 getDB();  
   await sequelize.authenticate();
}
