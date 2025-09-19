import Link from "next/link";
import {
  getReporteSemanal,getReporteMensual,getReporteAnual,
  getAcuerdos,
  listTiposCombustible,
  listClientes,
  listEstaciones,
  listParametros,
  listConstantes,
} from "@/lib/server/services/dof";

// Util para números que vienen como string
function toNum(x: any) {
  if (x == null) return null;
  const n = typeof x === "number" ? x : Number(String(x).replace(/,/g, ""));
  return Number.isFinite(n) ? n : x;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  // -- Fetch paralelo ---------------------------------------------------------
  const [
    acuerdos,
    Clientes,
    tiposCombustible,
    semanal,Mensual,Anual,
    Estaciones,
    Parametros,
    Constantes,
  ] = await Promise.all([
    getAcuerdos(),
    listClientes(),
    listTiposCombustible(),
    getReporteSemanal({ mes: 11, ano: 2024, idEstacion: 1 }),
    getReporteMensual({ mes: 7, ano: 2024, idEstacion: 1 }),
    getReporteAnual({ ano: 2024, idEstacion: 1 }),
    listEstaciones(),
    listParametros(),
    listConstantes(),
  ]);

  // -- Diccionario de datasets visibles --------------------------------------
  const data = {
    semanal,Mensual,Anual,
    acuerdos,
    tiposCombustible,
    Clientes,
    Estaciones,
    Parametros,
    Constantes,
    
  } as const;

  const order: (keyof typeof data)[] = [
    "semanal","Mensual","Anual",
    "acuerdos",
    "tiposCombustible",
    "Clientes",
    "Estaciones",
    "Parametros",
    "Constantes",
  ];

  const view = (searchParams?.view as keyof typeof data) ?? "semanal";
  const current = data[view];

  // Conteo amigable
  const count =
    Array.isArray(current) ? current.length : current ? 1 : 0;

  // Bonito: si es arreglo grande, intenta normalizar algunos números
  const pretty =
    Array.isArray(current)
      ? JSON.stringify(
          current.map((r: any) => {
            // ejemplo: convierte campos típicos a número si venían como string
            if (r?.Litros) r.Litros = toNum(r.Litros);
            if (r?.["GRAN TOTAL ESTIMULO DECRETO EJE 2017"])
              r["GRAN TOTAL ESTIMULO DECRETO EJE 2017"] = toNum(
                r["GRAN TOTAL ESTIMULO DECRETO EJE 2017"]
              );
            return r;
          }),
          null,
          2
        )
      : JSON.stringify(current, null, 2);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <span>🧪</span> Vista Dev — Probar GETs
        </h1>
        <p className="text-sm text-zinc-500">
          Cambia el dataset con los botones; el contenido se renderiza como JSON
          formateado.
        </p>
      </header>

      {/* Botonera (usa query param ?view=...) */}
      <div className="flex flex-wrap gap-2">
        {order.map((k) => {
          const isActive = k === view;
          const badge =
            Array.isArray(data[k]) ? (data[k] as any[]).length : 1;
          return (
            <Link
              key={k}
              href={`/?view=${k}`}
              className={[
                "px-3 py-1.5 rounded-full text-sm ring-1 transition",
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 ring-zinc-300 dark:ring-zinc-700"
                  : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 ring-zinc-200 dark:ring-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800",
              ].join(" ")}
            >
              <span className="mr-2">{k}</span>
              <span className="inline-block text-xs px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                {Array.isArray(data[k]) ? badge : 1}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Panel del JSON activo */}
      <section className="rounded-2xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-200/60 dark:ring-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-semibold">
            {view} <span className="text-zinc-400 font-normal">({count} ítem(s))</span>
          </h2>
          <span className="text-xs text-zinc-500">
            GET probado: {view}
          </span>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <pre className="text-sm leading-relaxed whitespace-pre p-3 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
            {pretty}
          </pre>
        </div>
      </section>

    </div>
  );
}



