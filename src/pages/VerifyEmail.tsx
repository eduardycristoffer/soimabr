import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logoSoima from "@/assets/logo-soima.webp";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "complete_profile" | "profile_done" | "error">("loading");
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const token = searchParams.get("token");

  // Profile completion form
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token não encontrado na URL.");
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-email", {
          body: { token },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        if (data?.must_complete_profile && data?.user_id) {
          setUserId(data.user_id);
          setStatus("complete_profile");
        } else {
          setStatus("success");
          setMessage(data?.message || "E-mail verificado com sucesso!");
        }
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Erro ao verificar e-mail.");
      }
    };

    verify();
  }, [token]);

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 2) {
      toast({ title: "Nome deve ter pelo menos 2 caracteres", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "complete_profile", user_id: userId, name: name.trim(), password },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStatus("profile_done");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <img src={logoSoima} alt="SOIMA" className="mx-auto h-12 w-auto" />

        {status === "loading" && (
          <div className="space-y-3">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Verificando seu e-mail...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-primary" />
            <h2 className="text-xl font-semibold">{message}</h2>
            <p className="text-sm text-muted-foreground">
              Agora você pode fazer login no sistema.
            </p>
            <Button onClick={() => navigate("/login")} className="w-full">
              Ir para o Login
            </Button>
          </div>
        )}

        {status === "complete_profile" && (
          <div className="space-y-4 text-left">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-primary" />
              <h2 className="mt-3 text-xl font-semibold">E-mail verificado!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Agora defina seu nome e senha para completar o cadastro.
              </p>
            </div>

            <form onSubmit={handleCompleteProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Concluir Cadastro
              </Button>
            </form>
          </div>
        )}

        {status === "profile_done" && (
          <div className="space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-primary" />
            <h2 className="text-xl font-semibold">Cadastro concluído!</h2>
            <p className="text-sm text-muted-foreground">
              Sua conta está pronta. Faça login com seu e-mail e a senha que você definiu.
            </p>
            <Button onClick={() => navigate("/login")} className="w-full">
              Ir para o Login
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold">Verificação falhou</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button variant="outline" onClick={() => navigate("/login")} className="w-full">
              Voltar ao Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
