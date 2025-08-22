'use client';

import React from 'react';
import {  useFormStatus } from 'react-dom';
import { importarRegistrosAction, type ImportState } from '@/lib/server/services/actions';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
    >
      {pending ? 'Procesando…' : 'Subir XLSX'}
    </button>
  );
}

const initial: ImportState | undefined = undefined;

export default function UploadForm() {
  const [state, action] = React.useActionState(importarRegistrosAction, initial);

  return (
    <div className="space-y-4">
      <form action={action} encType="multipart/form-data" className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm">Archivo XLSX</label>
          <input name="file" type="file" accept=".xlsx" required className="border p-2" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm">IdCliente</label>
          <input name="IdCliente" type="number" required className="border p-2" />
        </div>

        <div className="flex items-center gap-2">
          <input id="dryRun" name="dryRun" type="checkbox" value="true" />
          <label htmlFor="dryRun" className="text-sm">Dry Run (no inserta)</label>
        </div>

        <SubmitBtn />
      </form>

      {state?.ok === false && (
        <p className="text-red-600">Error: {state.error}</p>
      )}

      {state?.ok && (
        <div className="space-y-2">
          <p className="text-green-700">
            {state.result.dryRun ? 'Dry Run' : 'Importación'} exitosa — registros: {state.result.count}
          </p>
          <pre className="text-xs bg-gray-50 p-2 border rounded overflow-auto max-h-64">
            {JSON.stringify(state.result.sample, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
