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
  Modal,
  FlatList,
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const MAX_CONTENT_WIDTH = 1200;

const DevolucionesScreen = () => {
  const navigation = useNavigation();
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [currentPrestamo, setCurrentPrestamo] = useState(null);

  useEffect(() => {
    fetchPrestamosActivos();
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
          fechaprestamo,
          horaprestamo,
          estado,
          equipos:equipos(nombreequipo),
          usuarios:usuarios(nombreusuario)
        `)
        .or('estado.eq.Prestado,estado.eq.Reservado')
        .order('fechaprestamo', { ascending: false });

      if (error) throw error;

      const prestamosFormateados = data?.map(item => ({
        idprestamo: item.idprestamo,
        idequipo: item.idequipo,
        idusuario: item.idusuario,
        nombreequipo: item.equipos?.nombreequipo || 'Equipo no encontrado',
        nombreusuario: item.usuarios?.nombreusuario || 'Usuario no encontrado',
        fechaprestamo: item.fechaprestamo 
          ? new Date(item.fechaprestamo).toLocaleDateString() 
          : 'Sin fecha',
        horaprestamo: item.horaprestamo || 'Sin hora',
        estado: item.estado
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

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPrestamosActivos();
  };

  const handleDevolucion = (prestamo) => {
    setCurrentPrestamo(prestamo);
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

      // 1. Registrar en tabla devoluciones
      const { error: devolucionError } = await supabase
        .from('devoluciones')
        .insert({
          idprestamo,
          fechadevolucion: fechaActual.toISOString(),
          horadevolucion: horaActual,
          observaciones: observaciones || 'Devolución sin observaciones'
        });

      if (devolucionError) throw devolucionError;

      // 2. Registrar en historial_prestamos
      const { error: historialError } = await supabase
        .from('historial_prestamos')
        .insert({
          idprestamo,
          idusuario,
          accion: 'Devolución',
          fechaaccion: fechaActual.toISOString(),
          detalles: observaciones || 'Devolución registrada'
        });

      if (historialError) throw historialError;

      // 3. Actualizar estado del préstamo
      const { error: prestamoError } = await supabase
        .from('prestamos')
        .update({ estado: 'Devuelto' })
        .eq('idprestamo', idprestamo);

      if (prestamoError) throw prestamoError;

      // 4. Actualizar estado del equipo
      const { error: equipoError } = await supabase
        .from('equipos')
        .update({ estado: 'disponible' })
        .eq('idequipo', idequipo);

      if (equipoError) throw equipoError;

      // Mostrar notificación de éxito
      Toast.show({
        type: 'success',
        text1: 'Devolución registrada',
        text2: 'El equipo está disponible nuevamente',
        visibilityTime: 3000,
      });

      // Cerrar modal y limpiar
      setModalVisible(false);
      setObservaciones('');
      setCurrentPrestamo(null);

      // Actualizar la lista
      setTimeout(() => {
        fetchPrestamosActivos();
      }, 500);

    } catch (error) {
      console.error('Error en devolución:', error);
      Toast.show({
        type: 'error',
        text1: 'Error en devolución',
        text2: error.message || 'No se pudo completar la devolución',
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

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
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.openDrawer()}
            style={styles.menuButton}
            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
          >
            <Icon name="menu" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Devoluciones</Text>
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

        {/* Content */}
        <FlatList
          data={prestamos.filter(item => 
            item.nombreequipo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.nombreusuario.toLowerCase().includes(searchQuery.toLowerCase())
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

        {/* Modal para observaciones */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(false);
            setObservaciones('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Registrar Devolución</Text>
              
              <Text style={styles.modalText}>
                Equipo: {currentPrestamo?.nombreequipo || 'N/A'}
              </Text>
              
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
          </View>
        </Modal>
      </View>
      <Toast />
    </SafeAreaView>
  );
};

// Los estilos permanecen iguales
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: isMobile ? '90%' : '70%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 12,
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
});

export default DevolucionesScreen;