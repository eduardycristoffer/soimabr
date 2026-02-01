import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Profile, AppRole, AuthContextType } from "@/types";
import { User } from "@supabase/supabase-js";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (authUser: User) => {
    try {
      // Buscar profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      if (profileError) throw profileError;

      // Buscar role
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authUser.id)
        .single();

      setUser(profile);
      setRole(userRole?.role || "operator");
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      setUser(null);
      setRole(null);
    }
  };

  useEffect(() => {
    // Configurar listener de auth ANTES de buscar sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Usar setTimeout para evitar deadlock
          setTimeout(() => fetchUserProfile(session.user), 0);
        } else {
          setUser(null);
          setRole(null);
        }
        setIsLoading(false);
      }
    );

    // Buscar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setRole(null);
  };

  const value: AuthContextType = {
    user,
    role,
    isAdmin: role === "admin",
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
