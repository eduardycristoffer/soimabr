import { useState } from "react";
import { Braces } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { FIELD_CATALOG, FIELD_GROUPS, shortSample } from "@/lib/contractFields";

/** Sem acento e sem maiúsculas: "inscricao" acha "Inscrição". */
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Todas as palavras digitadas precisam aparecer (nada de "parecido": "cidade" não pode trazer "Inscrição estadual"). */
const matchAllTerms = (value: string, search: string) => {
  const terms = norm(search).split(/\s+/).filter(Boolean);
  const v = norm(value);
  return terms.every((t) => v.includes(t)) ? 1 : 0;
};

interface Props {
  /** valores de exemplo, para a pessoa ver o que cada campo vira */
  sample: Record<string, string>;
  onPick: (key: string) => void;
  disabled?: boolean;
}

/**
 * Menu "Inserir campo automático": em vez de decorar {{vendedora_cnpj}}, a pessoa procura por
 * "CNPJ" e vê, ao lado de cada opção, o dado de exemplo que ela vai receber.
 */
export function FieldPicker({ sample, onPick, disabled }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <Braces className="mr-1.5 h-3.5 w-3.5" />
          Inserir campo automático
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,380px)] p-0" align="start">
        <Command filter={matchAllTerms}>
          <CommandInput placeholder="Buscar: CNPJ, valor, prazo, cidade…" />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>Nenhum campo encontrado.</CommandEmpty>
            {FIELD_GROUPS.map((g) => {
              const keys = Object.keys(FIELD_CATALOG).filter((k) => FIELD_CATALOG[k].group === g.id);
              return (
                <CommandGroup key={g.id} heading={g.label}>
                  {keys.map((k) => (
                    <CommandItem
                      key={k}
                      value={`${g.label} ${FIELD_CATALOG[k].label} ${k}`}
                      onSelect={() => {
                        onPick(k);
                        setOpen(false);
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">{FIELD_CATALOG[k].label}</div>
                        <div className="truncate text-xs text-muted-foreground">{shortSample(sample[k])}</div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
