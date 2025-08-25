// /app/(dof)/registros/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import {
  importRegistrosXlsx,
  type ImportXlsxResult,
  createTipoCombustible,
  createCliente,createEstacion,createAcuerdo
} from '@/lib/server/services/dof';

export type ImportState =
  | { ok: true; result: ImportXlsxResult }
  | { ok: false; error: string };

/* ========== Importar XLSX ========== */
export async function importarRegistrosAction(
  _prev: ImportState | undefined,
  formData: FormData
): Promise<ImportState> {
  try {
    const file = formData.get('file') as File | null;
    if (!file) return { ok: false, error: 'Sube un archivo XLSX en el campo "file".' };

    const idCliente = Number(formData.get('IdCliente') ?? '');
    const dryRun = String(formData.get('dryRun') ?? 'false').toLowerCase() === 'true';

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importRegistrosXlsx({ buffer, idCliente, dryRun });

    // revalidatePath('/(dof)/registros'); // si quieres refrescar la página
    return { ok: true, result };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Error al importar' };
  }
}

/* ========== Crear Tipo de Combustible ========== */
export async function crearTipoCombustibleAction(formData: FormData) {
  const Nombre = String(formData.get('Nombre') ?? '').trim();
  const StatusStr = formData.get('Status');
  const Status = StatusStr ? Number(StatusStr) : undefined;

  const created = await createTipoCombustible({ Nombre, Status });
  revalidatePath('/(dof)/registros'); // ajusta a tu ruta
  return created;
}

/* ========== Crear Cliente ========== */
export async function crearClienteAction(formData: FormData) {
  const Nombre = String(formData.get('Nombre') ?? '').trim();
  const label = formData.get('label') ? String(formData.get('label')) : null;
  const lavel = formData.get('lavel') ? String(formData.get('lavel')) : null;
  const StatusStr = formData.get('Status');
  const Status = StatusStr ? Number(StatusStr) : undefined;

  const created = await createCliente({ Nombre, label, lavel, Status });
  return created;
}


export async function crearEstacionAction(formData: FormData) {
  const Numero = String(formData.get('Numero') ?? '').trim();
  const StatusStr = formData.get('Status');
  const Status = StatusStr ? Number(StatusStr) : undefined;

  const created = await createEstacion({ Numero, Status });
  return created;
}


export async function crearAcuerdoAction(formData: FormData) {
  const NombreAcuerdo = String(formData.get('NombreAcuerdo') ?? '').trim();
  const FechaInicial = String(formData.get('FechaInicial') ?? '').trim(); // 'YYYY-MM-DD'
  const FechaFinal = String(formData.get('FechaFinal') ?? '').trim() || null;
  const StatusStr = formData.get('Status');
  const Status = StatusStr ? Number(StatusStr) : undefined;

  const created = await createAcuerdo({ NombreAcuerdo, FechaInicial, FechaFinal, Status });
  revalidatePath('/(dof)/registros'); // ajusta la ruta donde listes acuerdos
  return created;
}