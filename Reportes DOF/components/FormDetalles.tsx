'use client';

import { useMemo, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { upsertDetallesAction, type UpsertDetallesState } from '@/lib/server/services/actions';

type ValorGrid = { [combustible: number]: { [param: number]: string } };

const COMBUSTIBLES = [1, 2, 3]; // 1: Magna, 2: Premium, 3: Diésel
const PARAMS = [1, 2, 3, 4];    // 1..4

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="px-3 py-2 rounded bg-black text-white disabled:opacity-60 dark:bg-white dark:text-black"
    >
      {pending ? 'Guardando…' : 'Guardar plantilla'}
    </button>
  );
}

const initialState: UpsertDetallesState | null = null;

export default function FormUpsertDetallesPlantilla() {
  const [idAcuerdo, setIdAcuerdo] = useState<string>('');
  const [grid, setGrid] = useState<ValorGrid>(() => {
    const g: ValorGrid = {};
    for (const c of COMBUSTIBLES) {
      g[c] = {};
      for (const p of PARAMS) g[c][p] = p === 3 ? '' : '0.000000'; // P3 opcional
    }
    return g;
  });

  // React 19 / Next 15: useActionState(prev, formData)
  const [state, formAction] = useActionState<UpsertDetallesState | null, FormData>(
    upsertDetallesAction,
    initialState
  );

  const updateCell = (comb: number, param: number, val: string) =>
    setGrid((old) => ({ ...old, [comb]: { ...old[comb], [param]: val } }));



  // Pegar 12 valores (Magna P1..P4, Premium P1..P4, Diésel P1..P4)
  const paste12 = (text: string) => {
    const tokens = text.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length < 12) return;
    const vals = tokens.slice(0, 12);
    setGrid((old) => {
      const g: ValorGrid = { ...old };
      let idx = 0;
      for (const c of COMBUSTIBLES) {
        g[c] = { ...g[c] };
        for (const p of PARAMS) g[c][p] = vals[idx++] ?? '';
      }
      return g;
    });
  };

  // Construir payload (12 objetos)
  const payload = useMemo(() => {
    const a = Number(idAcuerdo);
    const out: any[] = [];
    if (!Number.isFinite(a)) return out;
    for (const c of COMBUSTIBLES) {
      for (const p of PARAMS) {
        const v = grid[c][p];
        out.push({
          idAcuerdo: a,
          idParametro: p,
          IdTipoCombustible: c,
          Valor: v === '' ? null : v,
          Status: 1,
        });
      }
    }
    return out;
  }, [idAcuerdo, grid]);

  const paramLabel = (p: number) =>
    ({
      1: 'Porcentaje de Estímulo',
      2: 'Monto del Estímulo fiscal ($/L)',
      3: 'Cuota para el periodo',
      4: 'Monto del Estímulo complementario ($/L)',
    } as Record<number, string>)[p] ?? `Param ${p}`;

  const combLabel = (c: number) =>
    ({ 1: 'Magna', 2: 'Premium', 3: 'Diésel' } as Record<number, string>)[c] ?? `Comb ${c}`;

  return (
    <form action={formAction} className="space-y-4">
      {/* Alerts */}
      {state && 'ok' in state && !state.ok && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200">
          {state.error}
        </div>
      )}
      {state && 'ok' in state && state.ok && 'count' in state && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/40 dark:border-green-900 dark:text-green-200">
          Guardado correcto: {state.count} registro(s).
        </div>
      )}
      {state && 'ok' in state && state.ok && 'created' in state && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/40 dark:border-green-900 dark:text-green-200">
          {state.created ? 'Creado' : 'Actualizado'} correctamente.
        </div>
      )}

      {/* idAcuerdo + herramientas */}
      <div className="flex items-end gap-3">
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 dark:text-gray-300">idAcuerdo*</label>
          <input
            className="border p-2 rounded w-40 bg-white text-black dark:bg-neutral-900 dark:text-white dark:border-neutral-700"
            value={idAcuerdo}
            onChange={(e) => setIdAcuerdo(e.target.value)}
            placeholder="57"
            required
          />
        </div>


      </div>

      <input type="hidden" name="payload" value={JSON.stringify(payload)} readOnly />

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 text-sm dark:border-neutral-700">
          <thead className="bg-gray-50 dark:bg-neutral-800">
            <tr>
              <th className="px-2 py-1 border dark:border-neutral-700 text-gray-800 dark:text-gray-100">
                Combustible
              </th>
              {PARAMS.map((p) => (
                <th
                  key={p}
                  className="px-2 py-1 border dark:border-neutral-700 text-gray-800 dark:text-gray-100"
                >
                  {paramLabel(p)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMBUSTIBLES.map((c) => (
              <tr
                key={c}
                className="odd:bg-white even:bg-gray-50 dark:odd:bg-neutral-900 dark:even:bg-neutral-950/40"
              >
                <td className="px-2 py-1 border dark:border-neutral-700 font-medium text-gray-900 dark:text-gray-100">
                  {combLabel(c)}
                </td>
                {PARAMS.map((p) => (
                  <td key={p} className="px-2 py-1 border dark:border-neutral-700">
                    <input
                      className="w-44 border p-1 rounded bg-white text-black dark:bg-neutral-900 dark:text-white dark:border-neutral-700"
                      value={grid[c][p]}
                      onChange={(e) => updateCell(c, p, e.target.value)}
                      placeholder={p === 3 ? '6.175200' : '0.000000'}
                      inputMode="decimal"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400">
        Los valores aceptan coma o punto; en el servidor se normaliza y se redondea a 6 decimales.
      </div>

      <SubmitBtn />
    </form>
  );
}
