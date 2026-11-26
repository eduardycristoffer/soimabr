import { describe, expect, it } from "vitest";
import { fetchUsdBrlRate, rateForSave } from "./usdBrlRate";

const resposta = (body: unknown, ok = true) =>
  (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;
const falha = (async () => { throw new Error("rede"); }) as unknown as typeof fetch;
const api = { USDBRL: { bid: "5.8254", create_date: "2026-11-26 07:00:18" } };

describe("cotação do dólar", () => {
  it("lê a cotação de agora da API", async () => {
    expect(await fetchUsdBrlRate(resposta(api))).toEqual({ rate: 5.8254, lastUpdatedAt: "2026-11-26 07:00:18" });
  });

  it("recusa cotação inválida ou resposta com erro", async () => {
    await expect(fetchUsdBrlRate(resposta({ USDBRL: { bid: "0" } }))).rejects.toThrow();
    await expect(fetchUsdBrlRate(resposta({}))).rejects.toThrow();
    await expect(fetchUsdBrlRate(resposta(api, false))).rejects.toThrow();
  });

  it("ao salvar, usa a cotação buscada na hora (não a antiga da tela)", async () => {
    const r = await rateForSave({ rate: 5.9061, lastUpdatedAt: "2026-11-24 18:30:14" }, resposta(api));
    expect(r).toEqual({ rate: 5.8254, lastUpdatedAt: "2026-11-26 07:00:18", fresh: true });
  });

  it("se a API falhar na hora de salvar, usa a última lida pela tela", async () => {
    const r = await rateForSave({ rate: 5.83, lastUpdatedAt: "2026-11-26 06:59:50" }, falha);
    expect(r).toEqual({ rate: 5.83, lastUpdatedAt: "2026-11-26 06:59:50", fresh: false });
  });

  it("sem cotação nenhuma, avisa (null) em vez de inventar", async () => {
    expect(await rateForSave({ rate: null, lastUpdatedAt: null }, falha)).toBeNull();
  });
});
