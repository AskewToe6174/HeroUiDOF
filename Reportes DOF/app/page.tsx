
import { GetEjemploPutoIvan ,GETReporteSemanal} from "./api/DOF/route";

export default async function Home() {
  const data = await GetEjemploPutoIvan();
  console.log("hi puto cmora te gusta la vrga",data)
  return (
  <></>
  );
}
