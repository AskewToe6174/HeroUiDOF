import UploadForm from "@/components/UploadForm";
import FormCrearTipo from "@/components/FormTipoComb";
import FormCrearCliente from "@/components/FormClientes";
import FormCrearEstacion from "@/components/FormEstacion";
import FormCrearAcuerdo from "@/components/form-acuerdo";
import FormCrearParametro from "@/components/Form-parametro";
import FormCrearConstante from "@/components/FormConstante";

export default function Page() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Importar Registros (XLSX)</h1>
      <UploadForm />
      <h1 className="text-xl font-semibold">Crear Tipo Combustible</h1>
      <FormCrearTipo />
      <h1 className="text-xl font-semibold">Crear Cliente</h1>
      <FormCrearCliente />
      <h1 className="text-xl font-semibold">Crear Estacion</h1>
      <FormCrearEstacion />
      <h1 className="text-xl font-semibold">Crear Acuerdo</h1>
      <FormCrearAcuerdo />
      <h1 className="text-xl font-semibold">Crear Parametro</h1>
      <FormCrearParametro />
      <h1 className="text-xl font-semibold">Crear Constante</h1>
      <FormCrearConstante />

    </main>
  );
}
