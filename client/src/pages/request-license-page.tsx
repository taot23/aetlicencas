import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LicenseRequest, InsertLicenseRequest } from "@shared/schema";
import { LicenseForm } from "@/components/licenses/license-form";
import { LicenseList } from "@/components/licenses/license-list";

export default function RequestLicensePage() {
  const [showForm, setShowForm] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<LicenseRequest | null>(null);

  const { data: draftLicenses, isLoading, refetch } = useQuery<LicenseRequest[]>({
    queryKey: ["/api/licenses/drafts"],
    queryFn: async () => {
      const res = await fetch("/api/licenses/drafts", {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Erro ao buscar rascunhos de licenças");
      }
      return res.json();
    }
  });

  const handleNewRequest = () => {
    setCurrentDraft(null);
    setShowForm(true);
  };

  const handleEditDraft = (draft: LicenseRequest) => {
    setCurrentDraft(draft);
    setShowForm(true);
  };

  const handleFormComplete = () => {
    setShowForm(false);
    setCurrentDraft(null);
    refetch();
  };

  return (
    <MainLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Solicitar Licença</h1>
        <Button onClick={handleNewRequest} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Solicitar AET
        </Button>
      </div>

      {!showForm ? (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-800">AETs Pendentes de Envio</h2>
          </div>
          <LicenseList 
            licenses={draftLicenses || []} 
            isLoading={isLoading}
            isDraftList
            onEdit={handleEditDraft}
            onRefresh={refetch}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-6">
            {currentDraft ? "Editar Solicitação" : "Solicitar AET"}
          </h2>
          <LicenseForm
            draft={currentDraft}
            onComplete={handleFormComplete}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}
    </MainLayout>
  );
}
