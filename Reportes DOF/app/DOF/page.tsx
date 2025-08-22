import UploadForm from "@/components/UploadForm";

export default function Page() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Importar Registros (XLSX)</h1>
      <UploadForm />
    </main>
  );
}
