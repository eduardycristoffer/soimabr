import { QuoteWizardData } from "@/hooks/useQuoteWizard";
import ProductPicker from "./ProductPicker";

interface Props {
  data: QuoteWizardData;
  updateData: (d: Partial<QuoteWizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function StepAccessories({ data, updateData, onNext, onPrev }: Props) {
  return (
    <ProductPicker
      categories={["acessorio"]}
      items={data.accessories}
      onItemsChange={(items) => updateData({ accessories: items })}
      title="Acessórios"
      onNext={onNext}
      onPrev={onPrev}
      currency={data.currency}
    />
  );
}
