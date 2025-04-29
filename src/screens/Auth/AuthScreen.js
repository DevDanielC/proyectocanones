import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AuthScreen({ navigation }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          navigation.replace('Login');
          return;
        }

        // Verificar si el usuario es admin
        const { data: user, error: userError } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('idusuario', session.user.id)
          .single();

        if (userError || !user || user.rol !== 'admin') {
          await supabase.auth.signOut();
          navigation.replace('Login');
          return;
        }

        // Si es admin, redirigir al área de administración
        navigation.replace('AdminArea', {
          screen: 'PrincipalAdmin',
          params: { userId: session.user.id }
        });

      } catch (error) {
        console.error('Error de autenticación:', error);
        navigation.replace('Login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}