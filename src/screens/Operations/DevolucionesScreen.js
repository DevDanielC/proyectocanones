import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  TextInput,
  Modal,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';
import MenuUsuario from '../../components/MenuUsuario';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const DevolucionesScreen = () => {
  const navigation = useNavigation();
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [currentPrestamo, setCurrentPrestamo] = useState(null);
  const [personal, setPersonal] = useState([]);
  const [personalModalVisible, setPersonalModalVisible] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [personalPreseleccionado, setPersonalPreseleccionado] = useState(null);

  useEffect(() => {
    fetchPrestamosActivos();
    fetchPersonalActivo();
  }, []);

  const fetchPrestamosActivos = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      
      const { data, error } = await supabase
        .from('prestamos')
        .select(`
          idprestamo,
          idequipo,
          idusuario,
          idpersonal,
          fechaprestamo,
          horaprestamo,
          estado,
          equipos:equipos(nombreequipo),
          usuarios:usuarios(nombreusuario),
          personal:personal(nombre_completo)
        `)
        .or('estado.eq.Prestado,estado.eq.Reservado')
        .order('fechaprestamo', { ascending: false });

      if (error) throw error;

      const prestamosFormateados = data?.map(item => ({
        ...item,
        nombreequipo: item.equipos?.nombreequipo || 'Equipo no encontrado',
        nombreusuario: item.usuarios?.nombreusuario || 'Usuario no encontrado',
        nombrepersonal: item.personal?.nombre_completo || 'Personal no registrado',
        fechaprestamo: item.fechaprestamo 
          ? new Date(item.fechaprestamo).toLocaleDateString() 
          : 'Sin fecha',
        horaprestamo: item.horaprestamo || 'Sin hora'
      })) || [];

      setPrestamos(prestamosFormateados);
      
    } catch (error) {
      console.error('Error al cargar préstamos activos:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar los préstamos activos',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPersonalActivo = async () => {
    try {
      const { data, error } = await supabase
        .from('personal')
        .select('idpersonal, nombre_completo, tipo_persona, estado')
        .eq('estado', 'activo')
        .order('nombre_completo', { ascending: true });

      if (error) throw error;
      setPersonal(data || []);
    } catch (error) {
      console.error('Error al cargar personal:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo cargar la lista de personal',
      });
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPrestamosActivos();
  };

  const handleDevolucion = (prestamo) => {
    setCurrentPrestamo(prestamo);
    setValidationError('');
    setPersonalPreseleccionado(null);
    setPersonalModalVisible(true);
  };

  const seleccionarPersonal = (personaSeleccionada) => {
    if (currentPrestamo.idpersonal !== personaSeleccionada.idpersonal) {
      setValidationError('Solo el personal que realizó el préstamo puede registrar la devolución');
      return;
    }
    
    setPersonalPreseleccionado(personaSeleccionada);
  };

  const confirmarPersonal = () => {
    if (!personalPreseleccionado) {
      setValidationError('Debe seleccionar una persona');
      return;
    }
    
    if (currentPrestamo.idpersonal !== personalPreseleccionado.idpersonal) {
      setValidationError('Solo el personal que realizó el préstamo puede registrar la devolución');
      return;
    }
    
    setPersonalModalVisible(false);
    setModalVisible(true);
  };

  const confirmarDevolucion = async () => {
    try {
      setLoading(true);
      const { idprestamo, idequipo, idusuario } = currentPrestamo;
      const fechaActual = new Date();
      const horaActual = fechaActual.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const { error: devolucionError } = await supabase
        .from('devoluciones')
        .insert({
          idprestamo,
          idpersonal: personalPreseleccionado.idpersonal,
          fechadevolucion: fechaActual.toISOString(),
          horadevolucion: horaActual,
          observaciones: observaciones || 'Devolución sin observaciones'
        });

      if (devolucionError) throw devolucionError;

      const { error: prestamoError } = await supabase
        .from('prestamos')
        .update({ estado: 'Devuelto' })
        .eq('idprestamo', idprestamo);

      if (prestamoError) throw prestamoError;

      const { error: equipoError } = await supabase
        .from('equipos')
        .update({ estado: 'disponible' })
        .eq('idequipo', idequipo);

      if (equipoError) throw equipoError;

      Toast.show({
        type: 'success',
        text1: 'Devolución registrada',
        text2: 'El equipo ha sido devuelto correctamente',
      });

      setModalVisible(false);
      setObservaciones('');
      setCurrentPrestamo(null);
      setPersonalPreseleccionado(null);

      fetchPrestamosActivos();

    } catch (error) {
      console.error('Error en devolución:', error);
      Toast.show({
        type: 'error',
        text1: 'Error en devolución',
        text2: error.message || 'No se pudo completar la devolución',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderItemPersonal = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.listItem,
        personalPreseleccionado?.idpersonal === item.idpersonal && styles.itemPreselected,
        currentPrestamo?.idpersonal === item.idpersonal && styles.itemSelected
      ]}
      onPress={() => seleccionarPersonal(item)}
    >
      <View>
        <Text style={[
          styles.listItemText,
          (personalPreseleccionado?.idpersonal === item.idpersonal || 
           currentPrestamo?.idpersonal === item.idpersonal) && styles.selectedText
        ]}>
          {item.nombre_completo}
        </Text>
        <Text style={styles.listItemSubText}>{item.tipo_persona}</Text>
        {currentPrestamo?.idpersonal === item.idpersonal && (
          <Text style={styles.prestamoOwner}>(Realizó el préstamo)</Text>
        )}
      </View>
      <MaterialIcons 
        name="person" 
        size={24} 
        color={
          personalPreseleccionado?.idpersonal === item.idpersonal ||
          currentPrestamo?.idpersonal === item.idpersonal ? '#4a6da7' : '#adb5bd'
        } 
      />
    </TouchableOpacity>
  );

  const renderPrestamo = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <MaterialCommunityIcons 
            name={item.estado === 'Prestado' ? 'devices' : 'calendar-clock'} 
            size={24} 
            color={item.estado === 'Prestado' ? '#1976d2' : '#ffa000'} 
          />
          <Text style={styles.cardTitle}>{item.nombreequipo}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.estado === 'Prestado' ? styles.badgeActive : styles.badgeReserved
        ]}>
          <Text style={styles.statusText}>{item.estado}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Icon name="person" size={20} color="#6c757d" />
          <Text style={styles.infoText}>{item.nombreusuario}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="account-hard-hat" size={20} color="#6c757d" />
          <Text style={styles.infoText}>{item.nombrepersonal}</Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="calendar-today" size={20} color="#6c757d" />
          <Text style={styles.infoText}>{item.fechaprestamo}</Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="access-time" size={20} color="#6c757d" />
          <Text style={styles.infoText}>{item.horaprestamo}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.actionButton, loading && styles.disabledButton]}
        onPress={() => handleDevolucion(item)}
        disabled={loading}
      >
        <Text style={styles.actionButtonText}>Registrar Devolución</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && prestamos.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>Cargando préstamos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Menú lateral */}
      {menuVisible && (
        <MenuUsuario 
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
          >
            <MaterialIcons name="menu" size={28} color="#4a6da7" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Devoluciones</Text>
          
          <View style={{ width: 28 }} /> {/* Espacio para alinear */}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#95a5a6" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar préstamos..."
            placeholderTextColor="#95a5a6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Lista de préstamos */}
        <FlatList
          data={prestamos.filter(item => 
            item.nombreequipo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.nombreusuario.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.nombrepersonal.toLowerCase().includes(searchQuery.toLowerCase())
          )}
          renderItem={renderPrestamo}
          keyExtractor={item => item.idprestamo.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4a6da7']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name="clipboard-check-outline" 
                size={48} 
                color="#e0e0e0" 
              />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No se encontraron resultados' : 'No hay préstamos activos'}
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={fetchPrestamosActivos}
              >
                <Text style={styles.retryButtonText}>Recargar</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Modal para seleccionar personal */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={personalModalVisible}
          onRequestClose={() => {
            setPersonalModalVisible(false);
            setPersonalPreseleccionado(null);
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar personal</Text>
              <Text style={styles.modalSubtitle}>
                Equipo: {currentPrestamo?.nombreequipo || 'N/A'}
              </Text>
              {validationError && (
                <Text style={styles.errorText}>{validationError}</Text>
              )}
            </View>
            
            <FlatList
              data={personal}
              renderItem={renderItemPersonal}
              keyExtractor={item => item.idpersonal.toString()}
              contentContainerStyle={{ paddingBottom: 15 }}
            />
            
            <View style={styles.confirmationContainer}>
              <TouchableOpacity 
                style={[
                  styles.confirmButton,
                  !personalPreseleccionado && styles.buttonDisabled
                ]}
                onPress={confirmarPersonal}
                disabled={!personalPreseleccionado}
              >
                <Text style={styles.confirmButtonText}>
                  {personalPreseleccionado ? `Confirmar ${personalPreseleccionado.nombre_completo}` : 'Seleccione una persona'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setPersonalModalVisible(false);
                setPersonalPreseleccionado(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Modal para observaciones */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(false);
            setObservaciones('');
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmar Devolución</Text>
              
              <Text style={styles.modalSubtitle}>
                Equipo: {currentPrestamo?.nombreequipo || 'N/A'}
              </Text>
              
              <Text style={styles.modalSubtitle}>
                Personal: {personalPreseleccionado?.nombre_completo || 'N/A'}
              </Text>
            </View>
            
            <Text style={styles.modalLabel}>Observaciones:</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="Ingrese observaciones sobre la devolución..."
              value={observaciones}
              onChangeText={setObservaciones}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setObservaciones('');
                }}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmarDevolucion}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.modalButtonText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Overlay de carga */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4a6da7" />
            <Text style={styles.loadingText}>Procesando...</Text>
          </View>
        )}
      </View>
      <Toast />
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
  contentWithMenuOpen: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeActive: {
    backgroundColor: '#e3f2fd',
  },
  badgeReserved: {
    backgroundColor: '#fff8e1',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
  },
  cardBody: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6c757d',
  },
  actionButton: {
    backgroundColor: '#4a6da7',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#e0e7ff',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#4a6da7',
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
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
    marginTop: 16,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  confirmButton: {
    backgroundColor: '#4a6da7',
  },
  modalButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 16,
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
  prestamoOwner: {
    fontSize: 12,
    color: '#4a6da7',
    fontStyle: 'italic',
    marginTop: 4,
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
  errorText: {
    color: '#dc3545',
    marginTop: 5,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
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

export default DevolucionesScreen;