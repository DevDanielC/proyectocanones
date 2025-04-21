import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');
const isMobile = width < 768;
const isTablet = width >= 768 && width < 1024;
const isWeb = Platform.OS === 'web';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState({
    email: false,
    password: false
  });

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('idusuario', user.id)
        .single();

      if (userError) throw userError;

      if (usuario.rol === 'admin') {
        navigation.replace('AdminArea', { 
          screen: 'PrincipalAdmin',
          params: { userId: user.id }
        });
      } else {
        navigation.replace('UserArea', {
          screen: 'SolicitarPrestamo',
          params: { userId: user.id }
        });
      }
      
    } catch (error) {
      Alert.alert(
        'Error de inicio de sesión', 
        error.message || 'Ocurrió un error al iniciar sesión'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFocus = (field) => setIsFocused({...isFocused, [field]: true});
  const handleBlur = (field) => setIsFocused({...isFocused, [field]: false});

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Logo Institucional */}
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: 'https://utregionaldelsur.sidci.mx/img/logo.png' }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Título */}
          <Text style={styles.title}>Sistema de Gestión de Equipos</Text>
          <Text style={styles.subtitle}>Inicio de sesión</Text>

          {/* Formulario */}
          <View style={styles.form}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              placeholder="usuario@gmail.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.input,
                isFocused.email && styles.inputFocused
              ]}
              onFocus={() => handleFocus('email')}
              onBlur={() => handleBlur('email')}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              placeholder="Min. 6 caracteres"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={[
                styles.input,
                isFocused.password && styles.inputFocused
              ]}
              onFocus={() => handleFocus('password')}
              onBlur={() => handleBlur('password')}
            />

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Ingresar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => {}}
            >
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: isMobile ? 20 : isTablet ? 40 : 0,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isMobile ? 24 : 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: isWeb ? 480 : '100%',
    width: isWeb ? '100%' : 'auto',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: isMobile ? 200 : 240,
    height: isMobile ? 80 : 100,
  },
  title: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: isMobile ? 16 : 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  inputFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
  },
  loginButton: {
    height: 48,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  forgotText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  }
});