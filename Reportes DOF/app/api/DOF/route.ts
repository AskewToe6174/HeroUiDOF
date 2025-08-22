// app/api/dof/acuerdos/route.ts
import { NextResponse } from 'next/server';
import { getDB, ensureDB } from '@/lib/server/ensureDB';
import { DOF_Acuerdos } from '@/lib/server/models/DOF_Acuerdos';

export const runtime = 'nodejs';

export async function GetEjemploPutoIvan() {
  await ensureDB();
  getDB(); 
  const rows = await DOF_Acuerdos.findAll({ order: [['id', 'ASC']] });
  return NextResponse.json(rows);
}
