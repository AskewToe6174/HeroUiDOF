'use client';

import { useState } from 'react';

// Tus formularios:
import UploadForm from "@/components/UploadForm";
import FormCrearTipo from "@/components/FormTipoComb";
import FormCrearCliente from "@/components/FormClientes";
import FormCrearEstacion from "@/components/FormEstacion";
import FormCrearAcuerdo from "@/components/form-acuerdo";
import FormCrearParametro from "@/components/Form-parametro";
import FormCrearConstante from "@/components/FormConstante";
import FormUpsertDetallesPlantilla from "@/components/FormDetalles";

type Section = {
  key: string;
  title: string;
  description: string;
  element: JSX.Element;
  emoji?: string;
};

const SECTIONS: Section[] = [
  {
    key: 'import',
    title: 'Importar Registros (XLSX)',
    description: 'Sube un XLSX con volúmenes por estación/combustible (con dry-run opcional).',
    element: <UploadForm />,
    emoji: '📥',
  },
  {
    key: 'tipo',
    title: 'Tipo de Combustible',
    description: 'Crear o actualizar tipos (Magna, Premium, Diésel).',
    element: <FormCrearTipo />,
    emoji: '⛽️',
  },
  {
    key: 'cliente',
    title: 'Cliente',
    description: 'Crear clientes para asociarlos a registros y acuerdos.',
    element: <FormCrearCliente />,
    emoji: '👤',
  },
  {
    key: 'estacion',
    title: 'Estación',
    description: 'Dar de alta estaciones (número público o interno).',
    element: <FormCrearEstacion />,
    emoji: '🏭',
  },
  {
    key: 'acuerdo',
    title: 'Acuerdo',
    description: 'Crear acuerdos con fechas de vigencia.',
    element: <FormCrearAcuerdo />,
    emoji: '📜',
  },
  {
    key: 'parametro',
    title: 'Parámetro',
    description: 'Definir parámetros utilizados en los cálculos.',
    element: <FormCrearParametro />,
    emoji: '⚙️',
  },
  {
    key: 'constante',
    title: 'Constante',
    description: 'Registrar constantes por combustible (valor string normalizado).',
    element: <FormCrearConstante />,
    emoji: '🧮',
  },
  {
    key: 'detalles',
    title: 'Detalles (Plantilla 3×4)',
    description: 'Cargar 12 valores por acuerdo/combustible/parámetro.',
    element: <FormUpsertDetallesPlantilla />,
    emoji: '🧩',
  },
];

export default function Page() {
  const [active, setActive] = useState(SECTIONS[0].key);
  const activeSection = SECTIONS.find(s => s.key === active)!;

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Panel de administración DOF
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Selecciona una tarjeta para abrir el formulario correspondiente.
        </p>
      </header>

      {/* Selector: grid de cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SECTIONS.map(s => {
          const isActive = s.key === active;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={[
                'group text-left rounded-2xl border p-4 transition',
                'bg-white/80 hover:bg-white border-gray-200 hover:shadow-sm',
                'dark:bg-neutral-900/80 dark:hover:bg-neutral-900 dark:border-neutral-800',
                isActive ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <div className="text-xl leading-none">{s.emoji ?? '📄'}</div>
                <div className="space-y-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {s.title}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {s.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Panel activo */}
      <section
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm
                   dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between border-b border-gray-200 pb-3
                        dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {activeSection.emoji} {activeSection.title}
          </h2>
          <span
            className="rounded-full border px-2 py-1 text-[10px] uppercase tracking-wide
                       border-gray-200 text-gray-600
                       dark:border-neutral-700 dark:text-gray-400"
          >
            Formulario
          </span>
        </div>

        <div className="pt-4">
          {activeSection.element}
        </div>
      </section>
    </main>
  );
}
