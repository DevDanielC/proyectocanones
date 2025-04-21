import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isWeb = Platform.OS === 'web';

const AgregarUsuariosScreen = ({ navigation }) => {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [tipoPersona, setTipoPersona] = useState('maestro');
  const [loading, setLoading] = useState(false);
  const [showTipoPersonaPicker, setShowTipoPersonaPicker] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const tiposPersona = [
    { value: 'maestro', label: 'Maestro' },
    { value: 'directivo', label: 'Directivo' },
    { value: 'invitado', label: 'Invitado' }
  ];

  // Verificar si el usuario es admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile, error } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('idusuario', user.id)
          .single();
        
        if (!error && profile && profile.rol === 'admin') {
          setIsAdmin(true);
        }
      }
    };

    checkAdminStatus();
  }, []);

  const showAlert = (title, message) => {
    if (isWeb) {
      setSuccessMessage(message);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleAgregarPersonal = async () => {
    if (!nombreCompleto.trim()) {
      showAlert('Error', 'Por favor ingrese el nombre completo');
      return;
    }
  
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('personal')
        .insert([
          { 
            nombre_completo: nombreCompleto,
            tipo_persona: tipoPersona,
            estado: 'activo'
          }
        ])
        .select();
  
      if (error) {
        throw error;
      }
  
      if (isWeb) {
        setSuccessMessage(`Personal agregado correctamente como ${tiposPersona.find(t => t.value === tipoPersona)?.label}`);
        setShowSuccessMessage(true);
        
        // Resetear formulario después de 2 segundos
        setTimeout(() => {
          setNombreCompleto('');
          setTipoPersona('maestro');
          setShowTipoPersonaPicker(false);
          setShowSuccessMessage(false);
        }, 2000);
      } else {
        Alert.alert(
          'Éxito',
          `Personal agregado correctamente como ${tiposPersona.find(t => t.value === tipoPersona)?.label}`,
          [
            {
              text: 'Agregar otro',
              onPress: () => {
                setNombreCompleto('');
                setTipoPersona('maestro');
                setShowTipoPersonaPicker(false);
              },
              style: 'cancel'
            },
            {
              text: 'Volver',
              onPress: () => navigation.goBack()
            }
          ],
          { cancelable: false }
        );
      }
  
    } catch (error) {
      let errorMessage = 'Ocurrió un error al agregar el personal';
      if (error.message.includes('duplicate key value')) {
        errorMessage = 'Este nombre de personal ya existe';
      } else if (error.message.includes('permission denied')) {
        errorMessage = 'No tienes permisos para realizar esta acción';
      }
      
      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.unauthorizedContainer}>
        <View style={styles.unauthorizedContent}>
          <Icon name="warning" size={48} color="#EF4444" />
          <Text style={styles.unauthorizedTitle}>Acceso no autorizado</Text>
          <Text style={styles.unauthorizedText}>Solo administradores pueden agregar personal</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver al panel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header con botón de menú */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.openDrawer()}
          style={styles.menuButton}
        >
          <Icon name="menu" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agregar Personal</Text>
      </View>

      {/* Mensaje de éxito para web */}
      {isWeb && showSuccessMessage && (
        <View style={styles.webSuccessMessage}>
          <Icon name="check-circle" size={20} color="#10B981" />
          <Text style={styles.webSuccessText}>{successMessage}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.container}>
        {/* Mensaje especial para web */}
        {isWeb && (
          <View style={styles.webMessage}>
            <Text style={styles.webMessageText}>
              Estás utilizando la versión web del sistema de administración
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.title}>Agregar Nuevo Personal</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre Completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Juan Pérez López"
              value={nombreCompleto}
              onChangeText={setNombreCompleto}
              maxLength={100}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Cargo</Text>
            <TouchableOpacity 
              style={styles.pickerButton}
              onPress={() => setShowTipoPersonaPicker(!showTipoPersonaPicker)}
            >
              <Text style={styles.pickerButtonText}>
                {tiposPersona.find(t => t.value === tipoPersona)?.label}
              </Text>
              <Icon 
                name={showTipoPersonaPicker ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
                size={24} 
                color="#64748B" 
              />
            </TouchableOpacity>

            {showTipoPersonaPicker && (
              <View style={styles.pickerOptions}>
                {tiposPersona.map((tipo) => (
                  <TouchableOpacity
                    key={tipo.value}
                    style={[
                      styles.pickerOption,
                      tipoPersona === tipo.value && styles.selectedPickerOption
                    ]}
                    onPress={() => {
                      setTipoPersona(tipo.value);
                      setShowTipoPersonaPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      tipoPersona === tipo.value && styles.selectedPickerOptionText
                    ]}>
                      {tipo.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAgregarPersonal}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Agregar Personal</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  unauthorizedContent: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  unauthorizedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  unauthorizedText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: isMobile ? 16 : 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  menuButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  container: {
    flexGrow: 1,
    padding: isMobile ? 16 : 24,
    backgroundColor: '#f8f9fa',
  },
  webMessage: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  webMessageText: {
    color: '#1E40AF',
    fontSize: 14,
  },
  webSuccessMessage: {
    position: 'fixed',
    top: 20,
    left: '50%',
    transform: [{ translateX: -180 }],
    width: 360,
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  webSuccessText: {
    color: '#065F46',
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isMobile ? 20 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  pickerButton: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerOptions: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedPickerOption: {
    backgroundColor: '#EFF6FF',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedPickerOptionText: {
    color: '#1D4ED8',
    fontWeight: '500',
  },
  button: {
    height: 50,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AgregarUsuariosScreen;