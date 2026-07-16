import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import Login from "@/pages/Login";
import VerifyEmail from "@/pages/VerifyEmail";
import ResetPassword from "@/pages/ResetPassword";
import MeuPerfil from "@/pages/MeuPerfil";
import Dashboard from "@/pages/Dashboard";
import Clientes from "@/pages/Clientes";
import Produtos from "@/pages/Produtos";
import Pipeline from "@/pages/Pipeline";
import Orcamentos from "@/pages/Orcamentos";
import Contratos from "@/pages/Contratos";
import ContratoEditor from "@/pages/ContratoEditor";
import ContractTemplates from "@/pages/ContractTemplates";
import Usuarios from "@/pages/Usuarios";
import Auditoria from "@/pages/Auditoria";
import RegrasDesconto from "@/pages/RegrasDesconto";
import Aprovacoes from "@/pages/Aprovacoes";
import SolicitacoesAcesso from "@/pages/SolicitacoesAcesso";
import ConfiguracaoEmpresa from "@/pages/ConfiguracaoEmpresa";
import WebhooksIntegracoes from "@/pages/WebhooksIntegracoes";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth/verify" element={<VerifyEmail />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            
            {/* Protected routes */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/orcamentos" element={<Orcamentos />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/regras-desconto" element={<RegrasDesconto />} />
              <Route path="/aprovacoes" element={<Aprovacoes />} />
              <Route path="/solicitacoes-acesso" element={<SolicitacoesAcesso />} />
              <Route path="/auditoria" element={<Auditoria />} />
              <Route path="/configuracao-empresa" element={<ConfiguracaoEmpresa />} />
              <Route path="/webhooks" element={<WebhooksIntegracoes />} />
              <Route path="/perfil" element={<MeuPerfil />} />
            </Route>
            
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
