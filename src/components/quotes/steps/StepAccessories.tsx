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

export default function StepAccessories({ data, updateData, onNext, onPrev, isInternationalUsd, usdBrlRate }: Props) {
  return (
    <ProductPicker
      categories={["acessorio"]}
      items={data.accessories}
      onItemsChange={(items) => updateData({ accessories: items })}
      title="Acessórios"
      onNext={onNext}
      onPrev={onPrev}
      currency={data.currency}
      isInternationalUsd={isInternationalUsd}
      usdBrlRate={usdBrlRate}
    />
  );
}
