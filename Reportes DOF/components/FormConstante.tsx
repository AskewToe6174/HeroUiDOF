'use client';

import { useFormStatus } from 'react-dom';
import { crearConstanteAction ,type ImportState } from '@/lib/server/services/actions';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="px-3 py-2 rounded bg-black text-white disabled:opacity-60">
      {pending ? 'Creando…' : 'Crear constante'}
    </button>
  );
}

export default function FormCrearConstante() {
  return (
    <form action={crearConstanteAction} className="space-y-3 max-w-sm">
      <div className="flex flex-col gap-1">
        <label className="text-sm">Nombre*</label>
        <input name="Nombre" className="border p-2 rounded" required placeholder="Constante X" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm">Valor*</label>
        <input
          name="Valor"
          className="border p-2 rounded"
          required
          placeholder="6.455500"
        />
        <p className="text-xs text-gray-500">
          Acepta coma o punto; se normaliza internamente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm">IdTipoCombustible (opcional)</label>
          <input name="IdTipoCombustible" type="number" className="border p-2 rounded" placeholder="1" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Status (opcional)</label>
          <input name="Status" type="number" className="border p-2 rounded" placeholder="1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm">label (opcional)</label>
          <input name="label" className="border p-2 rounded" placeholder="Etiqueta" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">lavel (opcional)</label>
          <input name="lavel" className="border p-2 rounded" placeholder="Alias" />
        </div>
      </div>

      <SubmitBtn />
    </form>
  );
}
