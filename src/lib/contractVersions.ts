import { supabase } from "@/integrations/supabase/client";

/**
 * Snapshots the current state of a contract (contract row + clauses + signatories + witnesses)
 * into contract_versions and increments contracts.current_version.
 *
 * `explicitVersionNumber` is only used for the very first snapshot on creation (=1) to avoid
 * a race on the SELECT of current_version before the row has settled.
 */
export async function createContractVersion(params: {
  contractId: string;
  changeSummary: string;
  explicitVersionNumber?: number;
  bumpContract?: boolean; // default true; false when snapshotting v1 at creation
}) {
  const { contractId, changeSummary, explicitVersionNumber, bumpContract = true } = params;

  const [{ data: contract, error: cErr }, { data: clauses }, { data: sigs }, { data: wits }] = await Promise.all([
    supabase.from("contracts").select("*").eq("id", contractId).single(),
    supabase.from("contract_clause_snapshots").select("*").eq("contract_id", contractId).order("order_index"),
    supabase.from("contract_signatories").select("*").eq("contract_id", contractId).order("side").order("order_index"),
    supabase.from("contract_witnesses").select("*").eq("contract_id", contractId).order("order_index"),
  ]);
  if (cErr || !contract) throw cErr || new Error("Contrato não encontrado");

  let versionNumber = explicitVersionNumber;
  if (versionNumber === undefined) {
    const { data: last } = await supabase
      .from("contract_versions")
      .select("version_number")
      .eq("contract_id", contractId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    versionNumber = (last?.version_number || 0) + 1;
  }

  const { data: userData } = await supabase.auth.getUser();
  const created_by = userData?.user?.id || null;

  const { error: vErr } = await supabase.from("contract_versions").insert({
    contract_id: contractId,
    version_number: versionNumber,
    contract_data: contract as any,
    clauses_data: (clauses || []) as any,
    signatories_data: (sigs || []) as any,
    witnesses_data: (wits || []) as any,
    change_summary: changeSummary,
    created_by,
  });
  if (vErr) throw vErr;

  if (bumpContract) {
    await supabase.from("contracts").update({ current_version: versionNumber }).eq("id", contractId);
  }

  return versionNumber;
}

/**
 * Restore a previous version: creates a *new* version snapshot of the current state
 * (so nothing is lost), then rewrites the contract, clauses, signatories and witnesses
 * from the chosen version, moves status back to em_revisao, and increments current_version.
 */
export async function restoreContractVersion(params: {
  contractId: string;
  versionId: string;
}) {
  const { contractId, versionId } = params;

  const { data: version, error: vErr } = await supabase
    .from("contract_versions").select("*").eq("id", versionId).single();
  if (vErr || !version) throw vErr || new Error("Versão não encontrada");

  // 1) snapshot current state before overwriting
  await createContractVersion({
    contractId,
    changeSummary: `Snapshot antes de restaurar versão ${version.version_number}`,
  });

  // 2) unlock contract so we can rewrite
  await supabase.from("contracts").update({ status: "em_revisao" }).eq("id", contractId);

  // 3) rewrite child rows
  const cd = version.contract_data as any;
  const patch: any = {
    seller_rep_name: cd.seller_rep_name,
    seller_rep_cpf: cd.seller_rep_cpf,
    seller_rep_rg: cd.seller_rep_rg,
    seller_rep_cargo: cd.seller_rep_cargo,
    buyer_rep_name: cd.buyer_rep_name,
    buyer_rep_cpf: cd.buyer_rep_cpf,
    buyer_rep_rg: cd.buyer_rep_rg,
    buyer_rep_cargo: cd.buyer_rep_cargo,
    seller_manager_name: cd.seller_manager_name,
    seller_manager_cpf: cd.seller_manager_cpf,
    seller_manager_phone: cd.seller_manager_phone,
    seller_manager_email: cd.seller_manager_email,
    buyer_manager_name: cd.buyer_manager_name,
    buyer_manager_cpf: cd.buyer_manager_cpf,
    buyer_manager_phone: cd.buyer_manager_phone,
    buyer_manager_email: cd.buyer_manager_email,
    payment_schedule: cd.payment_schedule,
    delivery_days: cd.delivery_days,
  };
  await supabase.from("contracts").update(patch).eq("id", contractId);

  await supabase.from("contract_clause_snapshots").delete().eq("contract_id", contractId);
  const clauses = (version.clauses_data as any[]) || [];
  if (clauses.length) {
    const rows = clauses.map((c) => ({
      contract_id: contractId,
      source_clause_id: c.source_clause_id,
      order_index: c.order_index,
      title: c.title,
      body: c.body,
      is_core: c.is_core,
      clause_key: c.clause_key,
    }));
    await supabase.from("contract_clause_snapshots").insert(rows);
  }

  await supabase.from("contract_signatories").delete().eq("contract_id", contractId);
  const sigs = (version.signatories_data as any[]) || [];
  if (sigs.length) {
    const rows = sigs.map((s) => ({
      contract_id: contractId,
      side: s.side,
      name: s.name,
      cpf: s.cpf,
      rg: s.rg,
      cargo: s.cargo,
      order_index: s.order_index,
    }));
    await supabase.from("contract_signatories").insert(rows);
  }

  await supabase.from("contract_witnesses").delete().eq("contract_id", contractId);
  const wits = (version.witnesses_data as any[]) || [];
  if (wits.length) {
    const rows = wits.map((w) => ({
      contract_id: contractId,
      name: w.name,
      cpf: w.cpf,
      email: w.email,
      order_index: w.order_index,
    }));
    await supabase.from("contract_witnesses").insert(rows);
  }

  // 4) mark restoration as a new version
  return await createContractVersion({
    contractId,
    changeSummary: `Restaurado da versão ${version.version_number}`,
  });
}
