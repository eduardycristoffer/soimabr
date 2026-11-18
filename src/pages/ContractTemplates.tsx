import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CONTRACT_TYPE_LABEL, type ContractType } from "@/lib/contractFields";
import TemplateWorkspace from "@/components/contract-templates/TemplateWorkspace";

const TYPES = Object.keys(CONTRACT_TYPE_LABEL) as ContractType[];

export default function ContractTemplates() {
  const { isAdmin, isLoading } = useAuth();
  const [tab, setTab] = useState<ContractType>("venda");
  const [pendingTab, setPendingTab] = useState<ContractType | null>(null);
  const [dirty, setDirty] = useState(false);

  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const changeTab = (next: string) => {
    if (next === tab) return;
    if (dirty) setPendingTab(next as ContractType);
    else setTab(next as ContractType);
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Modelos de Contrato</h1>
        <p className="text-muted-foreground">
          Edite o texto do contrato vendo como ele fica. Alterações valem só para contratos novos: os já gerados não mudam.
        </p>
      </div>

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList>
          {TYPES.map((t) => (
            <TabsTrigger key={t} value={t}>{CONTRACT_TYPE_LABEL[t]}</TabsTrigger>
          ))}
        </TabsList>
        {TYPES.map((t) => (
          <TabsContent key={t} value={t} className="pt-4">
            {tab === t && <TemplateWorkspace type={t} onDirtyChange={setDirty} />}
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog open={pendingTab !== null} onOpenChange={(o) => !o && setPendingTab(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>
              Há alterações não salvas neste modelo. Se mudar de aba agora, elas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ficar aqui</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingTab) setTab(pendingTab);
                setPendingTab(null);
              }}
            >
              Mudar e descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
