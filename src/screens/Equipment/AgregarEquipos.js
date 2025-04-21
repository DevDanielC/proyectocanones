import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Platform,
  Linking
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const MAX_CONTENT_WIDTH = 1200;

const AgregarEquiposScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [equipoId, setEquipoId] = useState(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombreequipo: '',
    idcategoria: '',
    descripcion: ''
  });

  // Configurar el manejo de deep linking
  useEffect(() => {
    const handleDeepLink = (event) => {
      if (event.url) {
        const route = event.url.replace(/.*?:\/\//g, '');
        const [routeName, id] = route.split('/');
        if (routeName === 'equipos' && id) {
          navigation.navigate('DetallesEquipo', { equipoId: id });
        }
      }
    };

    // Escuchar eventos de deep linking
    Linking.addEventListener('url', handleDeepLink);

    return () => {
      Linking.removeEventListener('url', handleDeepLink);
    };
  }, [navigation]);

  // Mostrar mensajes consistentes en web y móvil
  const showMessage = (title, message, isSuccess = false) => {
    if (Platform.OS === 'web') {
      const webMessage = `${title}\n${message}\n\n${isSuccess ? '✅' : '❌'}`;
      alert(webMessage);
    } else {
      Alert.alert(
        title,
        message,
        isSuccess ? [
          { text: 'OK', onPress: () => {} }
        ] : null
      );
    }
  };

  // Cargar categorías al montar el componente
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const { data, error } = await supabase
          .from('categoriasequipos')
          .select('idcategoria, nombrecategoria')
          .order('nombrecategoria', { ascending: true });
        
        if (error) throw error;
        setCategorias(data);
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        showMessage('Error', 'No se pudieron cargar las categorías. Por favor, intente nuevamente.');
      }
    };
    
    fetchCategorias();
  }, []);

  const handleChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: String(value)
    });
  };

  const handleSubmit = async () => {
    // Validación de campos
    if (!formData.nombreequipo.trim()) {
      showMessage('Campo requerido', 'Por favor ingrese el nombre del equipo');
      return;
    }

    if (!formData.idcategoria) {
      showMessage('Campo requerido', 'Por favor seleccione una categoría');
      return;
    }

    setLoading(true);
    
    try {
      const equipoData = {
        nombreequipo: formData.nombreequipo.trim(),
        idcategoria: Number(formData.idcategoria),
        estado: 'disponible',
        descripcion: formData.descripcion.trim()
      };

      const { data, error } = await supabase
        .from('equipos')
        .insert([equipoData])
        .select();
      
      if (error) throw error;

      // Generar datos para el QR
      const qrContent = `equipos://${data[0].idequipo}`;
      setQrData(qrContent);
      setEquipoId(data[0].idequipo);
      setShowQR(true);
      
      showMessage('¡Éxito!', 'El equipo se ha registrado exitosamente. Puede escanear el código QR para ver los detalles.');
      
    } catch (error) {
      console.error('Error al guardar equipo:', error);
      let errorMessage = 'Ocurrió un error al intentar guardar el equipo.';
      if (error.message.includes('duplicate key')) {
        errorMessage = 'Ya existe un equipo con ese nombre. Por favor use un nombre diferente.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      showMessage('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseQR = () => {
    setShowQR(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header con menú */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.openDrawer()}
            style={styles.menuButton}
            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
          >
            <Icon name="menu" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Agregar Nuevo Equipo</Text>
        </View>
        
        {showQR ? (
          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>Código QR del Equipo</Text>
            <Text style={styles.qrSubtitle}>Escanea este código para ver los detalles del equipo</Text>
            
            <View style={styles.qrCodeContainer}>
              <QRCode
                value={qrData}
                size={isMobile ? 250 : 300}
                color="#2c3e50"
                backgroundColor="white"
              />
            </View>
            
            <Text style={styles.qrInfo}>Equipo: {formData.nombreequipo}</Text>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => navigation.navigate('DetallesEquipo', { equipoId })}
            >
              <Text style={styles.closeButtonText}>Ver Detalles</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: '#6c757d', marginTop: 10 }]}
              onPress={handleCloseQR}
            >
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <View style={styles.formContainer}>
                {/* Nombre del equipo */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nombre del equipo*</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. Laptop Dell XPS 15"
                    value={formData.nombreequipo}
                    onChangeText={(text) => handleChange('nombreequipo', text)}
                    maxLength={50}
                  />
                </View>
                
                {/* Categoría */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Categoría*</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.idcategoria}
                      onValueChange={(value) => handleChange('idcategoria', value)}
                    >
                      <Picker.Item label="Seleccione una categoría" value="" />
                      {categorias.map((cat) => (
                        <Picker.Item 
                          key={String(cat.idcategoria)}
                          label={cat.nombrecategoria} 
                          value={String(cat.idcategoria)}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
                
                {/* Descripción */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Descripción</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    placeholder="Detalles adicionales sobre el equipo"
                    value={formData.descripcion}
                    onChangeText={(text) => handleChange('descripcion', text)}
                    multiline
                    numberOfLines={4}
                    maxLength={200}
                  />
                </View>
                
                <TouchableOpacity 
                  style={[styles.submitButton, loading && styles.disabledButton]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Icon name="save" size={20} color="#ffffff" style={styles.buttonIcon} />
                      <Text style={styles.submitButtonText}>Guardar Equipo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
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
    backgroundColor: '#f8f9fa',
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
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: isMobile ? 16 : 24,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: isMobile ? 12 : 14,
    fontSize: 16,
    color: '#495057',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    color: '#495057',
  },
  submitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4a6da7',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },

  qrContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 24,
    textAlign: 'center',
  },
  qrCodeContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  qrInfo: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 24,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#4a6da7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AgregarEquiposScreen;