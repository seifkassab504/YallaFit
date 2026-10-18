import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { Database, UserRole } from '../../types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type FitnessProfileRow = Database['public']['Tables']['fitness_profiles']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  fitnessProfile: FitnessProfileRow | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  fitnessProfile: null,
  isLoading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fitnessProfile, setFitnessProfile] = useState<FitnessProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfileData = async (userId: string) => {
    try {
      // 1. Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.warn('Error fetching profile:', profileError.message);
      } else {
        setProfile(profileData);
      }

      // 2. Fetch fitness profile
      const { data: fitnessData, error: fitnessError } = await supabase
        .from('fitness_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fitnessError) {
        console.warn('Error fetching fitness profile:', fitnessError.message);
      } else {
        setFitnessProfile(fitnessData);
      }
    } catch (err) {
      console.error('Unexpected error loading profile data:', err);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfileData(user.id);
    }
  };

  useEffect(() => {
    // Initial session retrieval
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchProfileData(initialSession.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfileData(newSession.user.id);
      } else {
        setProfile(null);
        setFitnessProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setFitnessProfile(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        fitnessProfile,
        isLoading,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
