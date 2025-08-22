import { getAcuerdos } from "@/lib/server/services/acuerdos";
import { getReporteSemanal } from "@/lib/server/services/dof";

export default async function Home() {
  const acuerdos = await getAcuerdos();
  const semanal = await getReporteSemanal({ mes: 11, ano: 2024, idEstacion: 1 });

  return (
    <pre>{JSON.stringify({  semanal: semanal }, null, 2)}</pre>
  );
}
