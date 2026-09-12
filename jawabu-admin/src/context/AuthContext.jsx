import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch staff profile using the Supabase Auth user's UUID
  const fetchProfile = async (userId) => {
    try {
      console.log('Fetching staff profile for user:', userId);

      const { data, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching staff profile:', error);
        setProfile(null);
        return;
      }

      console.log('Staff profile:', data);

      if (!data) {
        console.warn('No staff profile found for this user.');
        setProfile(null);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Unexpected profile error:', error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get current Supabase session
    const getInitialSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Session error:', error);

        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
        }

        return;
      }

      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for login/logout/session changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth event:', _event);

      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (identifier, pin) => {
    const trimmed = String(identifier || '').trim();
    const secret = String(pin || '').trim();

    if (!trimmed.includes('@')) {
      const { data, error } = await supabase.functions.invoke('staff-login', {
        body: { identifier: trimmed, pin: secret },
      });

      if (error || data?.error || !data?.session) {
        return {
          data: { user: null, session: null },
          error: {
            message:
              data?.error ||
              error?.message ||
              'Invalid login details',
          },
        };
      }

      return supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    return supabase.auth.signInWithPassword({
      email: trimmed,
      password: secret,
    });
  };

  const logout = async () => {
    const result = await supabase.auth.signOut();

    setUser(null);
    setSession(null);
    setProfile(null);

    return result;
  };

  const isStaff = Boolean(profile);

  const isActive = Boolean(profile?.active);

  const isAdmin =
    profile?.role === 'admin' ||
    profile?.role === 'owner' ||
    profile?.role === 'manager';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isStaff,
        isActive,
        isAdmin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }

  return context;
};