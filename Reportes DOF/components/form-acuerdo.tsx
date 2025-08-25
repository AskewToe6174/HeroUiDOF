'use client';
import { useFormStatus } from 'react-dom';
import { crearAcuerdoAction , type ImportState } from '@/lib/server/services/actions';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="px-3 py-2 rounded bg-black text-white disabled:opacity-60">
    {pending ? 'Creando…' : 'Crear acuerdo'}
  </button>;
}

export default function FormCrearAcuerdo() {
  return (
    <form action={crearAcuerdoAction} className="space-y-3 max-w-sm">
      <div className="flex flex-col gap-1">
        <label className="text-sm">Nombre del acuerdo*</label>
        <input name="NombreAcuerdo" className="border p-2 rounded" required placeholder="Mi Acuerdo" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm">Fecha Inicial*</label>
          <input name="FechaInicial" type="date" className="border p-2 rounded" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Fecha Final (opcional)</label>
          <input name="FechaFinal" type="date" className="border p-2 rounded" />
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
