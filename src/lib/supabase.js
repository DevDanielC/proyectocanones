import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Configuración segura usando variables de entorno
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://dqiynypelfrofpyodrtx.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaXlueXBlbGZyb2ZweW9kcnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1NjMyNzgsImV4cCI6MjA2MDEzOTI3OH0.nTYDHWCzZmufRlNJJOcPfxve9TBToj1BUtrFsB33zI4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Funciones de utilidad
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
