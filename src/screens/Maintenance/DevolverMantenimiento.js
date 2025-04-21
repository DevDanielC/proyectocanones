import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  TextInput,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isWeb = Platform.OS === 'web';
const MAX_CONTENT_WIDTH = 1200;

const DevolverMantenimientoScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [loadingMantenimientos, setLoadingMantenimientos] = useState(true);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [formData, setFormData] = useState({
    idhistorialmantenimiento: '',
    observaciones: ''
  });
  const [user, setUser] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Obtener usuario actual
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        showError('Error obteniendo usuario');
        return;
      }
      setUser(user);
    };
    fetchUser();
  }, []);

  // Obtener mantenimientos activos
  useEffect(() => {
    fetchMantenimientosActivos();
  }, []);

  const fetchMantenimientosActivos = async () => {
    try {
      setLoadingMantenimientos(true);
      
      const { data, error } = await supabase
        .from('historial_mantenimiento')
        .select(`
          idhistorialmantenimiento, 
          idequipo, 
          fechamantenimiento,
          horamantenimiento,
          tipomantenimiento,
          equipos:equipos(nombreequipo),
          usuarios:usuarios(nombreusuario)
        `)
        .is('horadevolucion', null)
        .order('fechamantenimiento', { ascending: false });

      if (error) throw error;
      setMantenimientos(data || []);
    } catch (error) {
      showError('No se pudieron cargar los mantenimientos activos');
      console.error('Error fetching maintenance:', error);
    } finally {
      setLoadingMantenimientos(false);
    }
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorMessage(true);
    setTimeout(() => setShowErrorMessage(false), 3000);
    
    if (isWeb) {
      console.error(message);
    }
  };

  const handleSubmit = async () => {
    if (!formData.idhistorialmantenimiento) {
      showError('Por favor seleccione un mantenimiento');
      return;
    }

    if (!user) {
      showError('No se pudo identificar al usuario');
      return;
    }

    setLoading(true);
    setShowSuccessMessage(false);
    setShowErrorMessage(false);
    
    try {
      // Obtener la fecha y hora actual del sistema
      const now = new Date();
      const horaDevolucionFormateada = now.toTimeString().substring(0, 8);

      // 1. Actualizar el mantenimiento en historial_mantenimiento
      const { data: mantenimientoData, error: mantenimientoError } = await supabase
        .from('historial_mantenimiento')
        .update({
          horadevolucion: horaDevolucionFormateada,
          observaciones: formData.observaciones || null,
          accion: 'Mantenimiento completado'
        })
        .eq('idhistorialmantenimiento', parseInt(formData.idhistorialmantenimiento))
        .select()
        .single();

      if (mantenimientoError) throw mantenimientoError;

      // 2. Obtener el idequipo del mantenimiento
      const mantenimientoSeleccionado = mantenimientos.find(
        m => m.idhistorialmantenimiento.toString() === formData.idhistorialmantenimiento
      );

      if (!mantenimientoSeleccionado) {
        throw new Error('No se encontró el mantenimiento seleccionado');
      }

      // 3. Actualizar el estado del equipo
      const { error: equipoError } = await supabase
        .from('equipos')
        .update({ estado: 'disponible' })
        .eq('idequipo', mantenimientoSeleccionado.idequipo);

      if (equipoError) throw equipoError;

      // 4. Actualizar la tabla mantenimiento
      const { error: mantenimientoEstadoError } = await supabase
        .from('mantenimiento')
        .update({
          estado: 'completado',
          fechafin: now.toISOString()
        })
        .eq('idequipo', mantenimientoSeleccionado.idequipo)
        .eq('estado', 'en mantenimiento');

      if (mantenimientoEstadoError) throw mantenimientoEstadoError;

      showSuccess('Devolución registrada correctamente');
      
      // Resetear formulario
      setFormData({
        idhistorialmantenimiento: '',
        observaciones: ''
      });
      
      // Refrescar lista de mantenimientos
      fetchMantenimientosActivos();
      
      // Navegar atrás después de 2 segundos
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error) {
      console.error('Error al registrar devolución:', error);
      
      let mensajeError = 'Error al registrar la devolución';
      
      if (error.message.includes('No se encontró el mantenimiento')) {
        mensajeError = 'Mantenimiento no encontrado';
      } else if (error.message.includes('foreign key constraint')) {
        mensajeError = 'Error: Datos inválidos';
      } else if (error.code === '23502') {
        mensajeError = 'Faltan datos requeridos';
      }
      
      showError(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.openDrawer()}
            style={styles.menuButton}
          >
            <Icon name="menu" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Devolver Equipo de Mantenimiento</Text>
          <TouchableOpacity 
            onPress={fetchMantenimientosActivos}
            style={styles.refreshButton}
          >
            <Icon name="refresh" size={24} color="#2c3e50" />
          </TouchableOpacity>
        </View>

        {/* Mensajes flotantes (web) */}
        {isWeb && showSuccessMessage && (
          <View style={styles.webSuccessMessage}>
            <Icon name="check-circle" size={20} color="#10B981" />
            <Text style={styles.webSuccessText}>{successMessage}</Text>
          </View>
        )}

        {isWeb && showErrorMessage && (
          <View style={styles.webErrorMessage}>
            <Icon name="error" size={20} color="#EF4444" />
            <Text style={styles.webErrorText}>{errorMessage}</Text>
          </View>
        )}

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Registrar Devolución</Text>
              </View>
              
              <View style={styles.cardBody}>
                {/* Selección de mantenimiento */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Mantenimiento Activo *</Text>
                  {loadingMantenimientos ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#3B82F6" />
                      <Text style={styles.loadingText}>Cargando mantenimientos...</Text>
                    </View>
                  ) : (
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={formData.idhistorialmantenimiento}
                        onValueChange={(value) => handleChange('idhistorialmantenimiento', value)}
                        style={styles.picker}
                        dropdownIconColor="#666"
                      >
                        <Picker.Item label="Seleccione un mantenimiento" value="" />
                        {mantenimientos.map(mantenimiento => (
                          <Picker.Item 
                            key={mantenimiento.idhistorialmantenimiento} 
                            label={`${mantenimiento.equipos.nombreequipo} - ${new Date(mantenimiento.fechamantenimiento).toLocaleDateString()} (${mantenimiento.tipomantenimiento})`}
                            value={mantenimiento.idhistorialmantenimiento.toString()} 
                          />
                        ))}
                      </Picker>
                    </View>
                  )}
                </View>

                {/* Información de fecha/hora automática */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Información de devolución</Text>
                  <View style={styles.infoBox}>
                    <Icon name="info-outline" size={20} color="#3B82F6" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoText}>Fecha y hora: El sistema registrará automáticamente</Text>
                      <Text style={styles.infoText}>Usuario: {user?.email || 'Usuario actual'}</Text>
                    </View>
                  </View>
                </View>

                {/* Observaciones */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Observaciones</Text>
                  <TextInput
                    style={styles.textInput}
                    multiline
                    numberOfLines={4}
                    placeholder="Describa las observaciones del mantenimiento..."
                    value={formData.observaciones}
                    onChangeText={(text) => handleChange('observaciones', text)}
                  />
                </View>

                {/* Botón de enviar */}
                <TouchableOpacity 
                  style={[
                    styles.button, 
                    (loading || !formData.idhistorialmantenimiento) && styles.buttonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={loading || !formData.idhistorialmantenimiento}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.buttonContent}>
                      <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Registrar Devolución</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Alertas para móvil */}
      {!isWeb && showSuccessMessage && (
        <View style={styles.mobileSuccessMessage}>
          <Icon name="check-circle" size={20} color="#10B981" />
          <Text style={styles.mobileMessageText}>{successMessage}</Text>
        </View>
      )}

      {!isWeb && showErrorMessage && (
        <View style={styles.mobileErrorMessage}>
          <Icon name="error" size={20} color="#EF4444" />
          <Text style={styles.mobileMessageText}>{errorMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  refreshButton: {
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  content: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: isMobile ? 16 : 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    padding: isMobile ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cardTitle: {
    fontSize: isMobile ? 16 : 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  cardBody: {
    padding: isMobile ? 16 : 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#495057',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f1ff',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTextContainer: {
    marginLeft: 10,
  },
  infoText: {
    color: '#1E40AF',
    fontSize: 14,
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadingText: {
    marginLeft: 10,
    color: '#64748B',
  },
  button: {
    backgroundColor: '#4a6da7',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    flexDirection: 'row',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
  // Estilos para mensajes web
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
  webErrorMessage: {
    position: 'fixed',
    top: 20,
    left: '50%',
    transform: [{ translateX: -180 }],
    width: 360,
    backgroundColor: '#FEE2E2',
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
  webErrorText: {
    color: '#B91C1C',
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  // Estilos para mensajes móviles
  mobileSuccessMessage: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
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
  mobileErrorMessage: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FEE2E2',
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
  mobileMessageText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default DevolverMantenimientoScreen;