
'use client';
import { useFormStatus } from 'react-dom';
import { crearEstacionAction, type ImportState } from '@/lib/server/services/actions';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="px-3 py-2 rounded bg-black text-white disabled:opacity-60">
      {pending ? 'Creando…' : 'Crear estación'}
    </button>
  );
}

export default function FormCrearEstacion() {
  return (
    <form action={crearEstacionAction} className="space-y-3 max-w-sm">
      <div className="flex flex-col gap-1">
        <label className="text-sm">Número*</label>
        <input name="Numero" className="border p-2 rounded" required placeholder="123" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm">Status (opcional)</label>
        <input name="Status" type="number" className="border p-2 rounded" placeholder="1" />
      </div>
      <SubmitBtn />
    </form>
  );
}
