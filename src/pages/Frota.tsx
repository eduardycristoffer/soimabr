import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Database, Plus, Construction } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFleetStatus } from "@/hooks/useFleetEnabled";
import { useFleetData } from "@/hooks/useFleet";
import { todayISO } from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FleetPanorama } from "@/components/fleet/FleetPanorama";
import { RentalFormDialog } from "@/components/fleet/RentalFormDialog";
import { RentalsTab } from "@/components/fleet/RentalsTab";
import { UnitFormDialog } from "@/components/fleet/UnitFormDialog";
import { UnitsTab } from "@/components/fleet/UnitsTab";

const TABS = ["panorama", "gruas", "locacoes"] as const;
type TabKey = (typeof TABS)[number];

export default function Frota() {
  const { isAdmin, isLoading } = useAuth();
  const status = useFleetStatus(isAdmin);
  const q = useFleetData(status === "ready" && isAdmin);
  const [params, setParams] = useSearchParams();
  const [newUnit, setNewUnit] = useState(false);
  const [newRental, setNewRental] = useState(false);

  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const tab: TabKey = (TABS as readonly string[]).includes(params.get("aba") || "") ? (params.get("aba") as TabKey) : "panorama";
  const setTab = (t: string) => setParams(t === "panorama" ? {} : { aba: t }, { replace: true });
  const today = todayISO();
  const data = q.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Frota de gruas</h1>
          <p className="text-muted-foreground">Onde cada grua está, por quanto tempo, com qual contrato — e quanto ela rende.</p>
        </div>
        {status === "ready" && data && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setNewUnit(true)}><Plus className="mr-1.5 h-4 w-4" /> Nova grua</Button>
            <Button onClick={() => setNewRental(true)} disabled={data.units.length === 0}><Plus className="mr-1.5 h-4 w-4" /> Alocar grua a uma obra</Button>
          </div>
        )}
      </div>

      {status === "loading" && <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>}

      {status === "missing" && (
        <div className="rounded-lg border border-dashed p-8 text-center" role="status">
          <Database className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">A gestão de frota ainda não foi ativada no banco de dados.</p>
          <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
            Falta executar uma vez o arquivo <code className="rounded bg-muted px-1">supabase/manual/2026-11-21_fleet.sql</code> (explicado no guia <code className="rounded bg-muted px-1">LEIAME.md</code>), pelo chat do Lovable. Nada do que já existe é alterado.
          </p>
        </div>
      )}

      {status === "ready" && q.isLoading && <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>}
      {status === "ready" && q.error && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">Não foi possível carregar a frota. {String((q.error as any)?.message || "")}</div>
      )}

      {status === "ready" && data && data.units.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Construction className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">Comece cadastrando as gruas da sua frota.</p>
          <ol className="mx-auto mt-2 max-w-md list-decimal space-y-1 pl-5 text-left text-sm text-muted-foreground">
            <li>Cadastre cada grua com a especificação e o valor de compra.</li>
            <li>Ao fechar um contrato de locação, aloque a grua à obra (botão no próprio contrato).</li>
            <li>Acompanhe prazos, clientes esperando e a rentabilidade aqui.</li>
          </ol>
          <Button className="mt-4" onClick={() => setNewUnit(true)}><Plus className="mr-1.5 h-4 w-4" /> Cadastrar a primeira grua</Button>
        </div>
      )}

      {status === "ready" && data && data.units.length > 0 && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="panorama">Panorama</TabsTrigger>
            <TabsTrigger value="gruas">Gruas</TabsTrigger>
            <TabsTrigger value="locacoes">Locações</TabsTrigger>
          </TabsList>
          <TabsContent value="panorama" className="pt-4"><FleetPanorama data={data} today={today} /></TabsContent>
          <TabsContent value="gruas" className="pt-4"><UnitsTab data={data} today={today} /></TabsContent>
          <TabsContent value="locacoes" className="pt-4"><RentalsTab data={data} today={today} /></TabsContent>
        </Tabs>
      )}

      {data && (
        <>
          <UnitFormDialog open={newUnit} onClose={() => setNewUnit(false)} catalog={data.catalog} existingCodes={data.units.map((u) => u.code)} />
          <RentalFormDialog open={newRental} onClose={() => setNewRental(false)} data={data} />
        </>
      )}
    </div>
  );
}
