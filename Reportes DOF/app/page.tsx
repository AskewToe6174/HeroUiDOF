import { getReporteSemanal, getAcuerdos, listTiposCombustible, listClientes, listEstaciones, listParametros, listConstantes } from "@/lib/server/services/dof";

/**
// Se pueden combinar los filtro
 // Solo por mes y año
await getReporteSemanal({ mes: 11, ano: 2024 });

// Solo por cliente
await getReporteSemanal({ idCliente: 123 });

// Cliente + estación
await getReporteSemanal({ idCliente: 123, idEstacion: 45 });

 */export default async function Home() {
  const acuerdos = await getAcuerdos();
  const Clientes = await listClientes();
  const tiposCombustible = await listTiposCombustible();
  const semanal = await getReporteSemanal({
    mes: 11,
    ano: 2024,
    idEstacion: 1,
  });
  const Estaciones = await listEstaciones();
  const Parametros = await listParametros();
  const Constantes = await listConstantes();


  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <span>📅</span> Reporte Semanal
      </h1>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Reporte Semanal */}
        <div className="bg-white dark:bg-zinc-900 rounded-md shadow p-4">
          <h2 className="text-lg font-semibold mb-2 text-zinc-800 dark:text-white">📊 Reporte Semanal</h2>
          <pre className="overflow-x-auto text-sm text-zinc-800 dark:text-zinc-200">
            {JSON.stringify(semanal, null, 2)}
          </pre>
        </div>

        {/* Acuerdos */}
        <div className="bg-white dark:bg-zinc-900 rounded-md shadow p-4">
          <h2 className="text-lg font-semibold mb-2 text-zinc-800 dark:text-white">📘 Acuerdos</h2>
          <pre className="overflow-x-auto text-sm text-zinc-800 dark:text-zinc-200">
            {JSON.stringify(acuerdos, null, 2)}
          </pre>
        </div>

        {/* Tipos de Combustible */}
        <div className="bg-white dark:bg-zinc-900 rounded-md shadow p-4">
          <h2 className="text-lg font-semibold mb-2 text-zinc-800 dark:text-white">🪫 Tipos de Combustible</h2>
          <pre className="overflow-x-auto text-sm text-zinc-800 dark:text-zinc-200">
            {JSON.stringify(tiposCombustible, null, 2)}
          </pre>
        </div>



        <div className="bg-white dark:bg-zinc-900 rounded-md shadow p-4">
          <h2 className="text-lg font-semibold mb-2 text-zinc-800 dark:text-white">📘 Clientes</h2>
          <pre className="overflow-x-auto text-sm text-zinc-800 dark:text-zinc-200">
            {JSON.stringify(Clientes, null, 2)}
          </pre>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-md shadow p-4">
          <h2 className="text-lg font-semibold mb-2 text-zinc-800 dark:text-white">⛽️ Estaciones</h2>
          <pre className="overflow-x-auto text-sm text-zinc-800 dark:text-zinc-200">
            {JSON.stringify(Estaciones, null, 2)}
          </pre>
        </div>


        <div className="bg-white dark:bg-zinc-900 rounded-md shadow p-4">
          <h2 className="text-lg font-semibold mb-2 text-zinc-800 dark:text-white"> 🎛️ Parametros</h2>
          <pre className="overflow-x-auto text-sm text-zinc-800 dark:text-zinc-200">
            {JSON.stringify(Parametros, null, 2)}
          </pre>
        </div>


        <div className="bg-white dark:bg-zinc-900 rounded-md shadow p-4">
          <h2 className="text-lg font-semibold mb-2 text-zinc-800 dark:text-white"> 📝 Constantes</h2>
          <pre className="overflow-x-auto text-sm text-zinc-800 dark:text-zinc-200">
            {JSON.stringify(Constantes, null, 2)}
          </pre>
        </div>




      </div>
    </div>
  );
}
