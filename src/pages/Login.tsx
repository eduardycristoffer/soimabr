import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import loginPhoto from "@/assets/foto-login.webp";
import logoSoima from "@/assets/logo-soima.webp";

export default function Login() {
  const navigate = useNavigate();
  const { user, isLoading, signIn } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Forgot password state
  const [forgotStep, setForgotStep] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // OTP state
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpUserId, setOtpUserId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState("");

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Step 1: Validate credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (signInError) throw signInError;

      const userId = signInData.user?.id;
      if (!userId) throw new Error("Erro ao obter dados do usuário");

      // Sign out immediately - session only after OTP
      await supabase.auth.signOut();

      // Step 2: Request OTP
      const { data: otpData, error: otpError } = await supabase.functions.invoke("login-otp", {
        body: { action: "generate", user_id: userId },
      });

      if (otpError) throw otpError;
      if (otpData?.error) throw new Error(otpData.error);

      // Mask email for display
      const emailParts = loginEmail.split("@");
      const masked = emailParts[0].slice(0, 2) + "***@" + emailParts[1];
      setMaskedEmail(masked);

      setOtpUserId(userId);
      setOtpStep(true);
    } catch {
      toast({
        variant: "destructive",
        title: "Acesso não autorizado",
        description: "Verifique suas credenciais ou fale com o administrador.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6 || !otpUserId) return;
    setLoading(true);
    try {
      // Verify OTP
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke("login-otp", {
        body: { action: "verify", user_id: otpUserId, code: otpCode },
      });

      if (verifyError) throw verifyError;
      if (verifyData?.error) throw new Error(verifyData.error);

      // OTP valid - now do the real sign in
      await signIn(loginEmail, loginPassword);
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Código inválido",
        description: err.message || "Verifique o código e tente novamente.",
      });
      setOtpCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpUserId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("login-otp", {
        body: { action: "generate", user_id: otpUserId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Código reenviado", description: "Verifique seu e-mail." });
      setOtpCode("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setOtpStep(false);
    setOtpCode("");
    setOtpUserId(null);
    setLoginPassword("");
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Photo */}
      <div className="relative hidden w-1/2 lg:block">
        <img
          src={loginPhoto}
          alt="Grua SOIMA em operação"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12">
          <h2 className="text-3xl font-bold text-white">
            Gestão Comercial de Gruas
          </h2>
          <p className="mt-2 text-lg text-white/80">
            Pipeline de vendas e propostas comerciais em um só lugar.
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full flex-col items-center justify-center bg-background px-6 lg:w-1/2">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <img
              src={logoSoima}
              alt="SOIMA BR"
              className="h-14 w-auto"
            />
            <p className="text-sm text-muted-foreground">
              Sistema de Gestão Comercial
            </p>
          </div>

          {forgotStep ? (
            /* Forgot password step */
            <div className="space-y-6">
              {forgotSent ? (
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-semibold">E-mail enviado!</h2>
                  <p className="text-sm text-muted-foreground">
                    Se existe uma conta com esse e-mail, você receberá um link para redefinir sua senha.
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => { setForgotStep(false); setForgotSent(false); setForgotEmail(""); }}>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Voltar ao Login
                  </Button>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-semibold">Esqueci minha senha</h2>
                    <p className="text-sm text-muted-foreground">
                      Informe seu e-mail para receber o link de redefinição.
                    </p>
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setLoading(true);
                    try {
                      await supabase.functions.invoke("reset-password", {
                        body: { action: "request", email: forgotEmail },
                      });
                      setForgotSent(true);
                    } catch {
                      toast({ variant: "destructive", title: "Erro", description: "Não foi possível enviar o e-mail." });
                    } finally {
                      setLoading(false);
                    }
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Enviar Link
                    </Button>
                  </form>
                  <div className="text-center">
                    <Button variant="ghost" size="sm" onClick={() => { setForgotStep(false); setForgotEmail(""); }}>
                      <ArrowLeft className="mr-1 h-4 w-4" />
                      Voltar ao Login
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : !otpStep ? (
            /* Login form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => { setForgotStep(true); setForgotEmail(loginEmail); }}
                >
                  Esqueci minha senha
                </Button>
              </div>
            </form>
          ) : (
            /* OTP verification step */
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Verificação de segurança</h2>
                <p className="text-sm text-muted-foreground">
                  Enviamos um código de 6 dígitos para{" "}
                  <strong>{maskedEmail}</strong>
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  onClick={handleVerifyOtp}
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verificar Código
                </Button>

                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToLogin}
                    disabled={loading}
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResendOtp}
                    disabled={loading}
                  >
                    Reenviar código
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
