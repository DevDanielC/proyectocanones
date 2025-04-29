import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  ActivityIndicator, 
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform
} from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import QRScannerModal from '../../components/QRScannerModal';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isWeb = Platform.OS === 'web';
const MAX_CONTENT_WIDTH = 1200;

const PrestamosScreen = ({ navigation }) => {
  // Estados para datos y carga
  const [categorias, setCategorias] = useState([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para modales
  const [modalEquiposVisible, setModalEquiposVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  
  // Estados para selección
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [equipoPreseleccionado, setEquipoPreseleccionado] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Estados para mensajes
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Mostrar mensaje de éxito
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  // Mostrar mensaje de error
  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorMessage(true);
    setTimeout(() => setShowErrorMessage(false), 3000);
    
    if (isWeb) {
      console.error(message);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Obtener usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user) {
          const { data: usuarioData, error: usuarioError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('idusuario', user.id)
            .single();
          
          if (usuarioError) throw usuarioError;
          setCurrentUser(usuarioData);
        }

        // Obtener categorías
        const { data: categoriasData, error: errorCategorias } = await supabase
          .from('categoriasequipos')
          .select('*')
          .eq('estado', 'activo')
          .order('nombrecategoria', { ascending: true });
        
        if (errorCategorias) throw errorCategorias;
        
        setCategorias(categoriasData || []);
        
      } catch (error) {
        console.error('Error cargando datos:', error);
        showError('No se pudieron cargar los datos iniciales');
      } finally {
        setLoading(false);
      }
    };
    
    const unsubscribe = navigation.addListener('focus', fetchData);
    return unsubscribe;
  }, [navigation]);

  // Manejar selección de categoría
  const handleCategoriaPress = async (categoria) => {
    try {
      setLoading(true);
      setEquipoPreseleccionado(null);
      
      const { data: equiposData, error } = await supabase
        .from('equipos')
        .select(`
          idequipo, 
          nombreequipo, 
          estado, 
          idcategoria, 
          descripcion,
          categoriasequipos(nombrecategoria)
        `)
        .eq('idcategoria', categoria.idcategoria)
        .order('nombreequipo', { ascending: true });
  
      if (error) throw error;
  
      if (!equiposData || equiposData.length === 0) {
        showError(`No hay equipos registrados en la categoría "${categoria.nombrecategoria}"`);
        return;
      }
  
      setEquiposDisponibles(equiposData);
      setCategoriaSeleccionada(categoria);
      setModalEquiposVisible(true);
  
    } catch (error) {
      console.error('Error:', error);
      showError('Falló al cargar equipos');
    } finally {
      setLoading(false);
    }
  };

  // Manejar selección de equipo
  const handleEquipoSeleccionado = (equipo) => {
    if (!equipo) return;
    
    setEquipoSeleccionado(equipo);
    setEquipoPreseleccionado(null);
    setModalEquiposVisible(false);
    confirmarPrestamo();
  };

  // Manejar escaneo QR
  const handleScan = async (qrData) => {
    try {
      setLoading(true);
      setScannerVisible(false);
      
      const equipoId = qrData.split('/').pop();
      
      const { data: equipoData, error } = await supabase
        .from('equipos')
        .select('*, categoriasequipos(*)')
        .eq('idequipo', equipoId)
        .single();
      
      if (error || !equipoData) {
        throw error || new Error('Equipo no encontrado');
      }
      
      navigation.navigate('DetallesEquipo', { 
        equipoId: equipoData.idequipo,
        equipo: equipoData,
        categoria: equipoData.categoriasequipos 
      });
      
    } catch (error) {
      console.error('Error al buscar equipo:', error);
      showError('No se pudo encontrar el equipo escaneado');
    } finally {
      setLoading(false);
    }
  };

  // Confirmar préstamo
  const confirmarPrestamo = () => {
    if (!equipoSeleccionado) {
      showError('Debe seleccionar un equipo');
      return;
    }

    if (!currentUser?.idusuario) {
      showError('No se pudo identificar al usuario');
      return;
    }

    registrarPrestamo();
  };

// Registrar préstamo en Supabase
const registrarPrestamo = async () => {
  if (!equipoSeleccionado || !currentUser?.idusuario) {
    showError('Debe seleccionar un equipo y estar autenticado');
    return;
  }

  setLoading(true);
  try {
    // Verificar estado del equipo
    const { data: equipoVerificado, error: errorVerificacion } = await supabase
      .from('equipos')
      .select('estado')
      .eq('idequipo', equipoSeleccionado.idequipo)
      .single();

    if (errorVerificacion || !equipoVerificado) {
      throw new Error('No se pudo verificar el estado del equipo');
    }

    if (equipoVerificado.estado !== 'disponible') {
      throw new Error(`El equipo no está disponible (Estado actual: ${equipoVerificado.estado})`);
    }

    // Datos del préstamo (sin idpersonal)
    const prestamoData = {
      idequipo: equipoSeleccionado.idequipo,
      idusuario_prestamo: currentUser.idusuario, // Usamos directamente el UUID del usuario
      idusuario_registro: currentUser.idusuario,
      estado: 'Prestado',
      fechaprestamo: new Date().toISOString(),
      fechadevolucion_prevista: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    const { data: newPrestamo, error: errorPrestamo } = await supabase
      .from('prestamos')
      .insert(prestamoData)
      .select('*')
      .single();

    if (errorPrestamo || !newPrestamo) {
      throw errorPrestamo || new Error('No se pudo crear el préstamo');
    }

    // Actualizar estado del equipo
    const { error: errorEquipo } = await supabase
      .from('equipos')
      .update({ 
        estado: 'prestado',
        fechaactualizacion: new Date().toISOString() 
      })
      .eq('idequipo', equipoSeleccionado.idequipo);

    if (errorEquipo) throw errorEquipo;

    // Registrar en historial (también actualizado)
    const historialData = {
      idprestamo: newPrestamo.idprestamo,
      idusuario: currentUser.idusuario, // Usamos el UUID del usuario
      accion: 'Préstamo',
      fechaaccion: new Date().toISOString(),
      detalles: `Préstamo del equipo ${equipoSeleccionado.nombreequipo} al usuario ${currentUser.nombreusuario}`
    };

    const { error: errorHistorial } = await supabase
      .from('historial_prestamos')
      .insert(historialData);

    if (errorHistorial) throw errorHistorial;

    showSuccess(`Préstamo registrado: ${equipoSeleccionado.nombreequipo} a ${currentUser.nombreusuario}`);
    resetForm();
    
  } catch (error) {
    console.error('Error registrando préstamo:', error);
    showError(error.message || 'No se pudo registrar el préstamo');
  } finally {
    setLoading(false);
  }
};

  // Resetear formulario
  const resetForm = () => {
    setEquipoSeleccionado(null);
    setCategoriaSeleccionada(null);
    setEquipoPreseleccionado(null);
  };

  // Renderizar categorías
  const renderCategoriaCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handleCategoriaPress(item)}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <MaterialIcons 
          name="category" 
          size={24} 
          color={item.estado === 'activo' ? '#4a6da7' : '#6c757d'} 
        />
        <Text style={styles.cardTitle}>{item.nombrecategoria}</Text>
      </View>
      <Text style={styles.cardDescription}>{item.descripcion}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.disponibleText}>
          {item.estado === 'activo' ? 'Categoría activa' : 'Categoría inactiva'}
        </Text>
        <FontAwesome name="chevron-right" size={16} color="#4a6da7" />
      </View>
    </TouchableOpacity>
  );

  // Renderizar equipos
  const renderEquipoItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.listItem,
        item.estado !== 'disponible' && styles.itemDisabled,
        equipoPreseleccionado?.idequipo === item.idequipo && styles.itemPreselected
      ]}
      onPress={() => {
        if (item.estado === 'disponible') {
          setEquipoPreseleccionado(item);
        }
      }}
      onLongPress={() => {
        if (item.estado === 'disponible') {
          handleEquipoSeleccionado(item);
        }
      }}
      disabled={item.estado !== 'disponible'}
      activeOpacity={0.7}
    >
      <View style={styles.equipoInfo}>
        <Text style={[
          styles.listItemTitle,
          equipoPreseleccionado?.idequipo === item.idequipo && styles.selectedText
        ]}>
          {item.nombreequipo}
        </Text>
        <Text style={styles.listItemText}>
          <Text style={styles.label}>Categoría: </Text>
          {item.categoriasequipos?.nombrecategoria || 'General'}
        </Text>
        {item.descripcion && (
          <Text style={styles.listItemText}>{item.descripcion}</Text>
        )}
      </View>
      
      <View style={[
        styles.statusBadge,
        { backgroundColor: item.estado === 'disponible' ? '#e6f7ee' : '#fff0f0' }
      ]}>
        <Text style={[
          styles.statusText,
          { color: item.estado === 'disponible' ? '#28a745' : '#dc3545' }
        ]}>
          {item.estado.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Contenido principal */}
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.openDrawer()}
            style={styles.menuButton}
            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
          >
            <MaterialIcons name="menu" size={24} color="#2c3e50" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Préstamos Directos</Text>
          
          <TouchableOpacity 
            onPress={() => setScannerVisible(true)}
            style={styles.scanButton}
            disabled={loading}
          >
            <MaterialIcons 
              name="qr-code-scanner" 
              size={24} 
              color={loading ? '#adb5bd' : '#4a6da7'} 
            />
          </TouchableOpacity>
        </View>

        {/* Mensajes flotantes (web) */}
        {isWeb && showSuccessMessage && (
          <View style={styles.webSuccessMessage}>
            <MaterialIcons name="check-circle" size={20} color="#10B981" />
            <Text style={styles.webSuccessText}>{successMessage}</Text>
          </View>
        )}

        {isWeb && showErrorMessage && (
          <View style={styles.webErrorMessage}>
            <MaterialIcons name="error" size={20} color="#EF4444" />
            <Text style={styles.webErrorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Listado de categorías */}
        <ScrollView contentContainerStyle={styles.listContainer}>
          {loading && categorias.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4a6da7" />
              <Text style={styles.loadingText}>Cargando datos...</Text>
            </View>
          ) : categorias.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="error-outline" size={50} color="#6c757d" />
              <Text style={styles.emptyText}>No hay categorías disponibles</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Seleccione una categoría:</Text>
              <FlatList
                data={categorias}
                renderItem={renderCategoriaCard}
                keyExtractor={(item) => item.idcategoria.toString()}
                scrollEnabled={false}
              />
            </>
          )}
        </ScrollView>

        {/* Modal para selección de equipos */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalEquiposVisible}
          onRequestClose={() => {
            setEquipoPreseleccionado(null);
            setModalEquiposVisible(false);
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar equipo</Text>
              <Text style={styles.modalSubtitle}>{categoriaSeleccionada?.nombrecategoria || 'Categoría no especificada'}</Text>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a6da7" />
                <Text style={styles.loadingText}>Buscando equipos...</Text>
              </View>
            ) : equiposDisponibles.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="error-outline" size={50} color="#6c757d" />
                <Text style={styles.emptyText}>No hay equipos disponibles en esta categoría</Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={equiposDisponibles}
                  renderItem={renderEquipoItem}
                  keyExtractor={(item) => item.idequipo.toString()}
                  contentContainerStyle={{ paddingBottom: 15 }}
                />
                <View style={styles.confirmationContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.confirmButton,
                      !equipoPreseleccionado && styles.buttonDisabled
                    ]}
                    onPress={() => equipoPreseleccionado && handleEquipoSeleccionado(equipoPreseleccionado)}
                    disabled={!equipoPreseleccionado}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.confirmButtonText}>
                      {equipoPreseleccionado ? `Confirmar ${equipoPreseleccionado.nombreequipo}` : 'Seleccione un equipo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setEquipoPreseleccionado(null);
                setModalEquiposVisible(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Volver a categorías</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Modal para escanear QR */}
        <QRScannerModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScan={handleScan}
        />

        {/* Overlay de carga */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4a6da7" />
            <Text style={styles.loadingText}>Procesando...</Text>
          </View>
        )}
      </View>

      {/* Alertas para móvil */}
      {!isWeb && showSuccessMessage && (
        <View style={styles.mobileSuccessMessage}>
          <MaterialIcons name="check-circle" size={20} color="#10B981" />
          <Text style={styles.mobileMessageText}>{successMessage}</Text>
        </View>
      )}

      {!isWeb && showErrorMessage && (
        <View style={styles.mobileErrorMessage}>
          <MaterialIcons name="error" size={20} color="#EF4444" />
          <Text style={styles.mobileMessageText}>{errorMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// Estilos (se mantienen igual que en tu versión original)
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#343a40',
  },
  scanButton: {
    padding: 8,
  },
  listContainer: {
    padding: 15,
    flexGrow: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginLeft: 10,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 15,
  },
  disponibleText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  modalHeader: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#343a40',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 5,
  },
  listItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  itemSelected: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 4,
    borderLeftColor: '#4a6da7',
  },
  itemPreselected: {
    backgroundColor: '#e6f3ff',
    borderLeftWidth: 4,
    borderLeftColor: '#8ab6f9',
  },
  itemDisabled: {
    opacity: 0.6,
  },
  listItemText: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
  },
  selectedText: {
    fontWeight: 'bold',
    color: '#2c5282',
  },
  listItemSubText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 3,
  },
  listItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 5,
  },
  label: {
    color: '#6c757d',
    fontWeight: 'normal',
  },
  equipoInfo: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  confirmationContainer: {
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  confirmButton: {
    backgroundColor: '#4299e1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a0aec0',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 15,
  },
  cancelButtonText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 15,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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

export default PrestamosScreen;