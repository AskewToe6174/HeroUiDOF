'use server';

import { importRegistrosXlsx, type ImportXlsxResult } from '@/lib/server/services/dof';
import { revalidatePath } from 'next/cache';

export type ImportState =
  | { ok: true; result: ImportXlsxResult }
  | { ok: false; error: string };

export async function importarRegistrosAction(
  _prev: ImportState | undefined,
  formData: FormData
): Promise<ImportState> {
  try {
    const file = formData.get('file') as File | null;
    if (!file) return { ok: false, error: 'Sube un archivo XLSX en el campo "file".' };

    const idCliente = Number(formData.get('IdCliente') ?? '');
    const dryRun = String(formData.get('dryRun') ?? 'false').toLowerCase() === 'true';

    // Importante: convertir File (Web) a Buffer (Node) para tu parseador/Sequelize
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await importRegistrosXlsx({ buffer, idCliente, dryRun });

    // Si tienes una vista que lista registros, revalídala:
    // revalidatePath('/(dof)/registros');

    return { ok: true, result };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Error al importar' };
  }
}
