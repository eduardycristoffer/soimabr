import { QuoteWizardData } from "@/hooks/useQuoteWizard";
import ProductPicker from "./ProductPicker";

interface Props {
  data: QuoteWizardData;
  updateData: (d: Partial<QuoteWizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function StepEquipment({ data, updateData, onNext, onPrev }: Props) {
  return (
    <ProductPicker
      categories={["grua"]}
      items={data.equipment}
      onItemsChange={(items) => updateData({ equipment: items })}
      title="Selecione a grua principal"
      onNext={onNext}
      onPrev={onPrev}
      currency={data.currency}
    />
  );
}
