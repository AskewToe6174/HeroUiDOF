// /app/(dof)/registros/ui-form-cliente.tsx
'use client';

import { useFormStatus } from 'react-dom';
import {  crearClienteAction ,type ImportState } from '@/lib/server/services/actions';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="px-3 py-2 rounded bg-black text-white disabled:opacity-60">
      {pending ? 'Creando…' : 'Crear cliente'}
    </button>
  );
}

export default function FormCrearCliente() {
  return (
    <form action={crearClienteAction} className="space-y-3 max-w-sm">
      <div className="flex flex-col gap-1">
        <label className="text-sm">Nombre*</label>
        <input name="Nombre" className="border p-2 rounded" required placeholder="Cliente ACME" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm">label (opcional)</label>
          <input name="label" className="border p-2 rounded" placeholder="Etiqueta visible" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">lavel (opcional)</label>
          <input name="lavel" className="border p-2 rounded" placeholder="Otro alias" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm">Status (opcional)</label>
        <input name="Status" type="number" className="border p-2 rounded" placeholder="1" />
      </div>

      <SubmitBtn />
    </form>
  );
}
