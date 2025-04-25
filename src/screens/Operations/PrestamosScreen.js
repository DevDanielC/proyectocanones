import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import MenuAdmin from '../../components/MenuAdmin';
import QRScannerModal from '../../components/QRScannerModal';

const PrestamosScreen = ({ navigation }) => {
  // Estados para datos y carga
  const [categorias, setCategorias] = useState([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [personalDisponible, setPersonalDisponible] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para modales y selecciones
  const [modalEquiposVisible, setModalEquiposVisible] = useState(false);
  const [modalPersonalVisible, setModalPersonalVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Estados para búsqueda y selección
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [personalSeleccionado, setPersonalSeleccionado] = useState(null);
  const [equipoPreseleccionado, setEquipoPreseleccionado] = useState(null);
  const [personalPreseleccionado, setPersonalPreseleccionado] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Obtener categorías
        const { data: categoriasData, error: errorCategorias } = await supabase
          .from('categoriasequipos')
          .select('*')
          .eq('estado', 'activo')
          .order('nombrecategoria', { ascending: true });
        
        if (errorCategorias) throw errorCategorias;
        setCategorias(categoriasData || []);
        
        // Obtener personal
        const { data: personalData, error: errorPersonal } = await supabase
          .from('personal')
          .select('idpersonal, nombre_completo, tipo_persona, estado')
          .eq('estado', 'activo')
          .order('nombre_completo', { ascending: true });
        
        if (errorPersonal) throw errorPersonal;
        setPersonalDisponible(personalData || []);
        
      } catch (error) {
        console.error('Error cargando datos:', error);
        Alert.alert('Error', 'No se pudieron cargar los datos iniciales');
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
        Alert.alert(
          'Sin equipos', 
          `No hay equipos registrados en la categoría "${categoria.nombrecategoria}"`
        );
        return;
      }
  
      setEquiposDisponibles(equiposData);
      setCategoriaSeleccionada(categoria);
      setModalEquiposVisible(true);
  
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Falló al cargar equipos');
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
    setPersonalPreseleccionado(null);
    setModalPersonalVisible(true);
  };

  // Manejar selección de personal
  const handlePersonalSeleccionado = (persona) => {
    if (!persona) return;
    
    setPersonalSeleccionado(persona);
    setPersonalPreseleccionado(null);
    setModalPersonalVisible(false);
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
      Alert.alert('Error', 'No se pudo encontrar el equipo escaneado');
    } finally {
      setLoading(false);
    }
  };

  // Confirmar préstamo
  const confirmarPrestamo = () => {
    if (!equipoSeleccionado || !personalSeleccionado) {
      Alert.alert('Error', 'Debe seleccionar tanto el equipo como el personal');
      return;
    }

    Alert.alert(
      'Confirmar préstamo',
      `¿Desea registrar el préstamo de:\n\nEquipo: ${equipoSeleccionado.nombreequipo}\nA: ${personalSeleccionado.nombre_completo}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: registrarPrestamo }
      ]
    );
  };

  // Registrar préstamo en Supabase
  const registrarPrestamo = async () => {
    if (!equipoSeleccionado || !personalSeleccionado) return;
    
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
  
      // Registrar préstamo
      const { data: newPrestamo, error: errorPrestamo } = await supabase
        .from('prestamos')
        .insert({
          idpersonal: personalSeleccionado.idpersonal,
          idequipo: equipoSeleccionado.idequipo,
          estado: 'Prestado',
          fechaprestamo: new Date().toISOString(),
          fechadevolucion_prevista: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
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
  
      // Registrar en historial
      const { error: errorHistorial } = await supabase
        .from('historial_prestamos')
        .insert({
          idprestamo: newPrestamo.idprestamo,
          idpersonal: personalSeleccionado.idpersonal,
          accion: 'Préstamo',
          fechaaccion: new Date().toISOString(),
          detalles: `Préstamo del equipo ${equipoSeleccionado.nombreequipo} a ${personalSeleccionado.nombre_completo}`
        });
  
      if (errorHistorial) throw errorHistorial;
  
      Alert.alert(
        'Éxito', 
        `Préstamo registrado:\n\nEquipo: ${equipoSeleccionado.nombreequipo}\nPersona: ${personalSeleccionado.nombre_completo}`,
        [{ text: 'OK', onPress: resetForm }]
      );
      
    } catch (error) {
      console.error('Error registrando préstamo:', error);
      Alert.alert(
        'Error', 
        error.message || 'No se pudo registrar el préstamo'
      );
    } finally {
      setLoading(false);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setEquipoSeleccionado(null);
    setPersonalSeleccionado(null);
    setCategoriaSeleccionada(null);
    setSearchTerm('');
    setEquipoPreseleccionado(null);
    setPersonalPreseleccionado(null);
  };

  // Filtrar personal según búsqueda
  const filteredPersonal = personalDisponible.filter(persona =>
    persona.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // Renderizar personal
  const renderPersonalItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.listItem,
        personalPreseleccionado?.idpersonal === item.idpersonal && styles.itemPreselected,
        personalSeleccionado?.idpersonal === item.idpersonal && styles.itemSelected,
        item.estado === 'inactivo' && styles.itemDisabled
      ]} 
      onPress={() => {
        if (item.estado === 'activo') {
          setPersonalPreseleccionado(item);
        }
      }}
      onLongPress={() => {
        if (item.estado === 'activo') {
          handlePersonalSeleccionado(item);
        }
      }}
      disabled={item.estado === 'inactivo'}
      activeOpacity={0.7}
    >
      <View>
        <Text style={[
          styles.listItemText,
          (personalPreseleccionado?.idpersonal === item.idpersonal || 
           personalSeleccionado?.idpersonal === item.idpersonal) && styles.selectedText
        ]}>
          {item.nombre_completo}
        </Text>
        <Text style={styles.listItemSubText}>{item.tipo_persona}</Text>
      </View>
      <MaterialIcons 
        name="person" 
        size={24} 
        color={
          item.estado === 'inactivo' ? '#ced4da' :
          (personalPreseleccionado?.idpersonal === item.idpersonal ||
           personalSeleccionado?.idpersonal === item.idpersonal) ? '#4a6da7' : '#adb5bd'
        } 
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Menú lateral con overlay - AHORA CON MenuAdmin */}
      {menuVisible && (
        <MenuAdmin 
          navigation={navigation} 
          onClose={() => setMenuVisible(false)} 
        />
      )}

      {/* Contenido principal */}
      <View style={[
        styles.container,
        menuVisible && styles.contentWithMenuOpen
      ]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => setMenuVisible(true)} 
            style={styles.menuButton} 
            activeOpacity={0.7}
          >
            <MaterialIcons name="menu" size={28} color="#4a6da7" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Préstamos Directos</Text>
          
          <TouchableOpacity 
            onPress={() => setScannerVisible(true)}
            style={styles.scanButton}
            disabled={loading}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="qr-code-scanner" 
              size={28} 
              color={loading ? '#adb5bd' : '#4a6da7'} 
            />
          </TouchableOpacity>
        </View>

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

        {/* Modal para selección de personal */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalPersonalVisible}
          onRequestClose={() => {
            setPersonalPreseleccionado(null);
            setModalPersonalVisible(false);
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Asignar a persona</Text>
              <Text style={styles.modalSubtitle}>Seleccione el beneficiario</Text>
              {equipoSeleccionado && (
                <Text style={styles.modalSubtitle}>Equipo: {equipoSeleccionado.nombreequipo}</Text>
              )}
            </View>
            
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar personal..."
              placeholderTextColor="#6c757d"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a6da7" />
                <Text style={styles.loadingText}>Cargando personal...</Text>
              </View>
            ) : filteredPersonal.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="person-off" size={50} color="#6c757d" />
                <Text style={styles.emptyText}>
                  {searchTerm ? 'No se encontraron coincidencias' : 'No hay personal disponible'}
                </Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={filteredPersonal}
                  renderItem={renderPersonalItem}
                  keyExtractor={(item) => item.idpersonal.toString()}
                  contentContainerStyle={{ paddingBottom: 15 }}
                />
                <View style={styles.confirmationContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.confirmButton,
                      !personalPreseleccionado && styles.buttonDisabled
                    ]}
                    onPress={() => personalPreseleccionado && handlePersonalSeleccionado(personalPreseleccionado)}
                    disabled={!personalPreseleccionado}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.confirmButtonText}>
                      {personalPreseleccionado ? `Confirmar ${personalPreseleccionado.nombre_completo}` : 'Seleccione una persona'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setPersonalPreseleccionado(null);
                setModalPersonalVisible(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancelar préstamo</Text>
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
    </SafeAreaView>
  );
};

// Estilos
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentWithMenuOpen: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
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
    zIndex: 1,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#343a40',
  },
  scanButton: {
    padding: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a6da7',
    marginBottom: 10,
    paddingHorizontal: 15,
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
  searchInput: {
    height: 50,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#495057',
    backgroundColor: 'white',
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
});

export default PrestamosScreen;