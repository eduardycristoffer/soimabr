// Validação de CNPJ
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  const calc = (digits: string, factors: number[]) =>
    digits.split("").reduce((sum, d, i) => sum + parseInt(d) * factors[i], 0);

  const f1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const f2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const r1 = calc(cleaned.slice(0, 12), f1) % 11;
  const d1 = r1 < 2 ? 0 : 11 - r1;
  if (parseInt(cleaned[12]) !== d1) return false;

  const r2 = calc(cleaned.slice(0, 13), f2) % 11;
  const d2 = r2 < 2 ? 0 : 11 - r2;
  if (parseInt(cleaned[13]) !== d2) return false;

  return true;
}

// Validação de CPF
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (parseInt(cleaned[9]) !== d1) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  if (parseInt(cleaned[10]) !== d2) return false;

  return true;
}

// Máscaras
export function formatCNPJ(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, 14);
  return cleaned
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatCPF(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, 11);
  return cleaned
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, 11);
  if (cleaned.length <= 10) {
    return cleaned
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return cleaned
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function onlyDigits(value: string | null | undefined): string {
  return (value || "").replace(/\D/g, "");
}

export function formatCEP(value: string): string {
  const cleaned = onlyDigits(value).slice(0, 8);
  return cleaned.replace(/^(\d{5})(\d)/, "$1-$2");
}

// Versões "tolerantes": só formatam quando o valor tem o tamanho esperado.
// Servem para exibir/gravar dados já cadastrados sem estragar textos livres
// (ex.: "62 3518-9754 / 62 99986-6916" continua como está).
export function formatCpfIfPossible(value: string | null | undefined): string {
  const v = (value || "").trim();
  return onlyDigits(v).length === 11 && /^[\d.\-\s]+$/.test(v) ? formatCPF(v) : v;
}

export function formatCnpjIfPossible(value: string | null | undefined): string {
  const v = (value || "").trim();
  return onlyDigits(v).length === 14 && /^[\d.\-/\s]+$/.test(v) ? formatCNPJ(v) : v;
}

export function formatPhoneIfPossible(value: string | null | undefined): string {
  const v = (value || "").trim();
  const d = onlyDigits(v);
  const looksLikeSinglePhone = /^[\d()\s\-+]+$/.test(v);
  if (!looksLikeSinglePhone) return v;
  if (d.length === 10 || d.length === 11) return formatPhone(v);
  return v;
}
