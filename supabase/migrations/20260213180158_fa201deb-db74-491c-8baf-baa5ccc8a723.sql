
CREATE OR REPLACE FUNCTION public.prevent_fixed_stage_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_fixed = true THEN
      RAISE EXCEPTION 'Etapas fixas do pipeline não podem ser removidas';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_fixed = true THEN
      -- Allow order_index and color changes on fixed stages
      IF NEW.name IS DISTINCT FROM OLD.name THEN
        RAISE EXCEPTION 'Nome de etapas fixas não pode ser alterado';
      END IF;
      IF NEW.is_fixed IS DISTINCT FROM OLD.is_fixed THEN
        RAISE EXCEPTION 'Flag is_fixed não pode ser alterada';
      END IF;
      IF NEW.stage_type IS DISTINCT FROM OLD.stage_type THEN
        RAISE EXCEPTION 'Tipo de etapa fixa não pode ser alterado';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;
