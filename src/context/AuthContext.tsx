import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: 'user' | 'admin' | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'user' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthContext: Starting getSession");
    supabase.auth.getSession().then(({ data, error }) => {
      console.log("AuthContext: getSession resolved", data, error);
      if (error || !data || !data.session) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      const currentSession = data.session;
      setSession(currentSession);
      setUser(currentSession.user ?? null);
      if (currentSession.user) {
        fetchRole(currentSession.user.id);
      } else {
        setLoading(false);
      }
    }).catch(e => {
      console.error("AuthContext getSession catch:", e);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("AuthContext: onAuthStateChange", _event, session);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    console.log("AuthContext: fetchRole", userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (!error && data) {
        setRole(data.role);
      }
    } catch (error) {
      console.error('Error fetching role:', error);
    } finally {
      console.log("AuthContext: fetchRole done");
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  console.log("AuthContext: rendering, loading =", loading);

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
