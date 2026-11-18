import { supabase } from "@/integrations/supabase/client";

/**
 * Pede ao servidor o PDF de verdade da proposta (arquivo para baixar/anexar).
 * O "Gerar PDF" antigo continua existindo: ele só abre uma página para imprimir.
 */
export async function fetchQuotePdf(quoteId: string): Promise<{ blob: Blob; fileName: string; quoteNumber: string }> {
  const { data, error } = await supabase.functions.invoke("generate-pdf", { body: { quoteId, format: "pdf" } });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as any).context?.json())?.error || msg; } catch { /* mantém a mensagem */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.pdf_base64) {
    // Função antiga ainda publicada: devolve só o HTML
    throw new Error("O servidor ainda não gera o arquivo PDF. É preciso publicar a função generate-pdf atualizada.");
  }
  const bin = atob(data.pdf_base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return {
    blob: new Blob([bytes], { type: "application/pdf" }),
    fileName: data.file_name || `Proposta ${data.quote_number || ""}.pdf`.trim(),
    quoteNumber: data.quote_number || "",
  };
}

/** Gera o PDF e baixa o arquivo. Devolve o nome do arquivo. */
export async function downloadQuotePdf(quoteId: string): Promise<string> {
  const { blob, fileName } = await fetchQuotePdf(quoteId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return fileName;
}
