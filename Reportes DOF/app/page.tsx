import { getAcuerdos } from "@/lib/server/services/acuerdos";
import { getReporteSemanal } from "@/lib/server/services/dof";
/**
// Se pueden combinar los filtro
 // Solo por mes y año
await getReporteSemanal({ mes: 11, ano: 2024 });

// Solo por cliente
await getReporteSemanal({ idCliente: 123 });

// Cliente + estación
await getReporteSemanal({ idCliente: 123, idEstacion: 45 });

 */
export default async function Home() {
  const acuerdos = await getAcuerdos();
  const semanal = await getReporteSemanal({ mes: 11, ano: 2024, idEstacion: 1 });

  return (
    <pre>{JSON.stringify({  semanal: semanal }, null, 2)}</pre>
  );
}
