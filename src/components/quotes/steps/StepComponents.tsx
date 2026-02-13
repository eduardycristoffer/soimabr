import { QuoteWizardData } from "@/hooks/useQuoteWizard";
import ProductPicker from "./ProductPicker";

interface Props {
  data: QuoteWizardData;
  updateData: (d: Partial<QuoteWizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
  isInternationalUsd?: boolean;
  usdBrlRate?: number | null;
}

export default function StepComponents({ data, updateData, onNext, onPrev, isInternationalUsd, usdBrlRate }: Props) {
  return (
    <ProductPicker
      categories={["configuracao", "torre", "tramo", "chassis"]}
      items={data.components}
      onItemsChange={(items) => updateData({ components: items })}
      title="Torres, Tramos, Chassis e Configurações"
      onNext={onNext}
      onPrev={onPrev}
      currency={data.currency}
      isInternationalUsd={isInternationalUsd}
      usdBrlRate={usdBrlRate}
    />
  );
}
