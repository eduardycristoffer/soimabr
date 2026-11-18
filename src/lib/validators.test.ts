import { describe, it, expect } from "vitest";
import {
  formatCEP,
  formatCnpjIfPossible,
  formatCpfIfPossible,
  formatPhoneIfPossible,
  isValidCPF,
  onlyDigits,
} from "@/lib/validators";

describe("máscaras tolerantes", () => {
  it("formata CPF só quando tem 11 dígitos", () => {
    expect(formatCpfIfPossible("60970819366")).toBe("609.708.193-66");
    expect(formatCpfIfPossible("609.708.193-66")).toBe("609.708.193-66");
    expect(formatCpfIfPossible("123")).toBe("123");
    expect(formatCpfIfPossible("")).toBe("");
    expect(formatCpfIfPossible(null)).toBe("");
  });

  it("formata CNPJ só quando tem 14 dígitos", () => {
    expect(formatCnpjIfPossible("18555835000173")).toBe("18.555.835/0001-73");
    expect(formatCnpjIfPossible("18.555.835/0001-73")).toBe("18.555.835/0001-73");
    expect(formatCnpjIfPossible("abc")).toBe("abc");
  });

  it("formata telefone único e preserva textos com vários telefones", () => {
    expect(formatPhoneIfPossible("6235189754")).toBe("(62) 3518-9754");
    expect(formatPhoneIfPossible("62999866916")).toBe("(62) 99986-6916");
    expect(formatPhoneIfPossible("62 3518-9754 / 62 99986-6916")).toBe("62 3518-9754 / 62 99986-6916");
  });

  it("formata CEP", () => {
    expect(formatCEP("74215220")).toBe("74215-220");
    expect(onlyDigits("74.215-220")).toBe("74215220");
  });

  it("valida CPF", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("111.111.111-11")).toBe(false);
  });
});
