import { describe, it, expect } from "vitest";
import { sanitizeStorageFileName } from "@/lib/storageFileName";

describe("sanitizeStorageFileName", () => {
  it("remove colchetes e espaços do nome que causava 'Invalid key'", () => {
    const out = sanitizeStorageFileName(
      "SANTOS EMPREENDIMENTOS X SOIMA BR - CONTRATO DE VENDA - [conformidade].pdf",
    );
    expect(out).toBe("SANTOS_EMPREENDIMENTOS_X_SOIMA_BR_-_CONTRATO_DE_VENDA_-_conformidade.pdf");
    expect(out).not.toMatch(/[[\] ]/);
  });

  it("remove acentos e caracteres especiais", () => {
    expect(sanitizeStorageFileName("Contrato nº 12 – Anápolis (final)#1.PDF")).toBe(
      "Contrato_n_12_Anapolis_final_1.pdf",
    );
  });

  it("mantém nomes já seguros", () => {
    expect(sanitizeStorageFileName("contrato-assinado_v2.pdf")).toBe("contrato-assinado_v2.pdf");
  });

  it("nunca devolve vazio", () => {
    expect(sanitizeStorageFileName("")).toBe("arquivo");
    expect(sanitizeStorageFileName("###")).toBe("arquivo");
  });

  it("limita o tamanho preservando a extensão", () => {
    const out = sanitizeStorageFileName(`${"a".repeat(300)}.pdf`, 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith(".pdf")).toBe(true);
  });
});
