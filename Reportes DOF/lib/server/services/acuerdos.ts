import { ensureDB, getDB } from "@/lib/server/ensureDB";
import { DOF_Acuerdos } from "@/lib/server/models/DOF_Acuerdos";

export async function getAcuerdos() {
  await ensureDB();
  getDB();
  const rows = await DOF_Acuerdos.findAll({ order: [["id", "ASC"]] });
  return rows.map(r => r.toJSON());
}
  