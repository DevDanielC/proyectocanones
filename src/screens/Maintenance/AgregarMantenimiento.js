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
  Platform,
  FlatList
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

const AgregarMantenimientoScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [loadingEquipos, setLoadingEquipos] = useState(true);
  const [equipos, setEquipos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [formData, setFormData] = useState({
    idequipo: '',
    tipomantenimiento: 'Preventivo',
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

  // Obtener categorías de equipos
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const { data, error } = await supabase
          .from('categoriasequipos')
          .select('idcategoria, nombrecategoria')
          .order('nombrecategoria', { ascending: true });

        if (error) throw error;
        setCategorias(data || []);
      } catch (error) {
        showError('Error al cargar categorías');
      }
    };
    fetchCategorias();
  }, []);

  // Obtener equipos disponibles
  useEffect(() => {
    fetchEquiposDisponibles();
  }, [filtroCategoria]);

  const fetchEquiposDisponibles = async () => {
    try {
      setLoadingEquipos(true);
      
      let query = supabase
        .from('equipos')
        .select('idequipo, nombreequipo, idcategoria')
        .eq('estado', 'disponible')
        .order('nombreequipo', { ascending: true });

      if (filtroCategoria) {
        query = query.eq('idcategoria', filtroCategoria);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEquipos(data || []);
    } catch (error) {
      showError('Error al cargar equipos disponibles');
    } finally {
      setLoadingEquipos(false);
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
    if (!formData.idequipo) {
      showError('Por favor seleccione un equipo disponible');
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
      // Obtener fecha y hora actual del sistema
      const now = new Date();
      const fechaFormateada = now.toISOString().split('T')[0];
      const horaInicioFormateada = now.toTimeString().substring(0, 8);

      // Insertar en historial_mantenimiento
      const { data: historialData, error: historialError } = await supabase
        .from('historial_mantenimiento')
        .insert([{
          idequipo: parseInt(formData.idequipo),
          idusuario_registro: user.id,
          fechamantenimiento: fechaFormateada,
          horamantenimiento: horaInicioFormateada,
          tipomantenimiento: formData.tipomantenimiento,
          observaciones: formData.observaciones || null,
          accion: 'Registro inicial'
        }])
        .select();

      if (historialError) throw historialError;

      // Insertar en mantenimiento
      const { data: mantenimientoData, error: mantenimientoError } = await supabase
        .from('mantenimiento')
        .insert([{
          idequipo: parseInt(formData.idequipo),
          idusuario_registro: user.id,
          tipomantenimiento: formData.tipomantenimiento.toLowerCase(),
          observaciones: formData.observaciones || null,
          estado: 'en mantenimiento'
        }])
        .select();

      if (mantenimientoError) throw mantenimientoError;

      // Actualizar estado del equipo
      const { error: equipoError } = await supabase
        .from('equipos')
        .update({ estado: 'en mantenimiento' })
        .eq('idequipo', parseInt(formData.idequipo));

      if (equipoError) throw equipoError;

      showSuccess('Mantenimiento registrado correctamente');
      
      // Resetear formulario después de éxito
      setFormData({
        idequipo: '',
        tipomantenimiento: 'Preventivo',
        observaciones: ''
      });
      
      // Refrescar lista de equipos
      fetchEquiposDisponibles();
      
      // Navegar atrás después de 2 segundos
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error) {
      console.error('Error al registrar mantenimiento:', error);
      
      let mensajeError = 'Error al registrar el mantenimiento';
      
      if (error.message.includes('El equipo ya no está disponible')) {
        mensajeError = 'El equipo ya no está disponible';
      } else if (error.message.includes('duplicate key value')) {
        mensajeError = 'Ya existe un mantenimiento para este equipo';
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
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Agregar Mantenimiento</Text>
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
                <Text style={styles.cardTitle}>Registrar Nuevo Mantenimiento</Text>
              </View>
              
              <View style={styles.cardBody}>
                {/* Filtro por categoría */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Filtrar por categoría</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={filtroCategoria}
                      onValueChange={setFiltroCategoria}
                      style={styles.picker}
                      dropdownIconColor="#666"
                    >
                      <Picker.Item label="Todas las categorías" value="" />
                      {categorias.map(categoria => (
                        <Picker.Item 
                          key={categoria.idcategoria} 
                          label={categoria.nombrecategoria} 
                          value={categoria.idcategoria} 
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Selección de equipo */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Equipo Disponible *</Text>
                  {loadingEquipos ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#3B82F6" />
                      <Text style={styles.loadingText}>Cargando equipos...</Text>
                    </View>
                  ) : (
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={formData.idequipo}
                        onValueChange={(value) => handleChange('idequipo', value)}
                        style={styles.picker}
                        dropdownIconColor="#666"
                      >
                        <Picker.Item label="Seleccione un equipo" value="" />
                        {equipos.map(equipo => (
                          <Picker.Item 
                            key={equipo.idequipo} 
                            label={equipo.nombreequipo} 
                            value={equipo.idequipo} 
                          />
                        ))}
                      </Picker>
                    </View>
                  )}
                </View>

                {/* Tipo de mantenimiento */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Tipo de mantenimiento *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.tipomantenimiento}
                      onValueChange={(value) => handleChange('tipomantenimiento', value)}
                      style={styles.picker}
                      dropdownIconColor="#666"
                    >
                      <Picker.Item label="Preventivo" value="Preventivo" />
                      <Picker.Item label="Correctivo" value="Correctivo" />
                    </Picker>
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

                {/* Información de registro */}
                <View style={styles.infoBox}>
                  <Icon name="info-outline" size={20} color="#3B82F6" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoText}>Registrado por: {user?.email || 'Usuario actual'}</Text>
                    <Text style={styles.infoText}>Fecha y hora: Se registrarán automáticamente</Text>
                  </View>
                </View>

                {/* Botón de enviar */}
                <TouchableOpacity 
                  style={[
                    styles.button, 
                    (loading || !formData.idequipo) && styles.buttonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={loading || !formData.idequipo}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.buttonContent}>
                      <MaterialCommunityIcons name="toolbox" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Registrar Mantenimiento</Text>
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
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: '600',
    color: '#2c3e50',
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f1ff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
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

export default AgregarMantenimientoScreen;