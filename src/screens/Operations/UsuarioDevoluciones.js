import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  ActivityIndicator, 
  Alert,
  Linking,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { Camera } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import MenuUsuario from '../../components/MenuUsuario';
import QRScannerModal from '../../components/QRScannerModal'; // Asegúrate de tener este componente

const DevolucionesUsuariosScreen = ({ navigation }) => {
  const [prestamosActivos, setPrestamosActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const cargarPrestamosActivos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prestamos')
        .select(`
          idprestamo,
          estado,
          fechaprestamo,
          fechadevolucion_prevista,
          idequipo,
          equipos(nombreequipo, estado, categoriasequipos(nombrecategoria)),
          personal(nombre_completo, tipo_persona)
        `)
        .eq('estado', 'Prestado')
        .order('fechaprestamo', { ascending: false });

      if (error) throw error;
      setPrestamosActivos(data || []);
    } catch (error) {
      console.error('Error cargando préstamos:', error);
      Alert.alert('Error', 'No se pudieron cargar los préstamos activos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    cargarPrestamosActivos();
  };

  const handleScan = async (qrData) => {
    try {
      setScannerVisible(false);
      setLoading(true);
      
      const equipoId = qrData.split('/').pop();
      
      const { data: prestamo, error } = await supabase
        .from('prestamos')
        .select(`
          idprestamo,
          idequipo,
          equipos(nombreequipo, estado, categoriasequipos(nombrecategoria)),
          personal(nombre_completo, tipo_persona)
        `)
        .eq('estado', 'Prestado')
        .eq('equipos.idequipo', equipoId)
        .single();
  
      if (error || !prestamo) {
        throw error || new Error('Préstamo no encontrado para este equipo');
      }
      
      if (prestamo.equipos?.estado !== 'prestado') {
        throw new Error('El equipo no está marcado como prestado en el sistema');
      }
  
      confirmarDevolucion(prestamo);
    } catch (error) {
      console.error('Error en devolución por QR:', error);
      Alert.alert(
        'Error', 
        error.message || 'No se encontró un préstamo activo para este equipo'
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmarDevolucion = (prestamo) => {
    Alert.alert(
      'Confirmar Devolución',
      `¿Desea registrar la devolución del equipo?\n\n` +
      `Equipo: ${prestamo.equipos?.nombreequipo}\n` +
      `Categoría: ${prestamo.equipos?.categoriasequipos?.nombrecategoria || 'N/A'}\n` +
      `Prestado a: ${prestamo.personal?.nombre_completo}\n` +
      `Tipo: ${prestamo.personal?.tipo_persona || 'No especificado'}`,
      [
        { 
          text: 'Cancelar', 
          style: 'cancel',
          onPress: () => console.log('Devolución cancelada') 
        },
        { 
          text: 'Confirmar', 
          onPress: () => procesarDevolucion(prestamo) 
        }
      ]
    );
  };

  const procesarDevolucion = async (prestamo) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('registrar_devolucion_app', { 
          p_idprestamo: prestamo.idprestamo 
        });
      
      if (error || data?.error) {
        throw new Error(error?.message || data?.message || 'Error en la devolución');
      }
  
      Alert.alert(
        'Éxito', 
        'Devolución registrada correctamente',
        [{ text: 'OK', onPress: () => cargarPrestamosActivos() }]
      );
    } catch (error) {
      console.error('Error en devolución:', error);
      Alert.alert(
        'Error', 
        `No se pudo completar la devolución: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };
  const renderPrestamoItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.listItem}
      onPress={() => navigation.navigate('DetallePrestamo', { prestamoId: item.idprestamo })}
      onLongPress={() => confirmarDevolucion(item)}
    >
      <View style={styles.prestamoInfo}>
        <Text style={styles.listItemTitle}>{item.equipos?.nombreequipo}</Text>
        <Text style={styles.listItemText}>
          <Text style={styles.label}>Prestado a: </Text>
          {item.personal?.nombre_completo}
        </Text>
        <Text style={styles.listItemSubText}>
          <Text style={styles.label}>Fecha préstamo: </Text>
          {new Date(item.fechaprestamo).toLocaleDateString()}
        </Text>
        {item.fechadevolucion_prevista && (
          <Text style={styles.listItemSubText}>
            <Text style={styles.label}>Devolución prevista: </Text>
            {new Date(item.fechadevolucion_prevista).toLocaleDateString()}
          </Text>
        )}
      </View>
      <TouchableOpacity 
        style={styles.devolverButton}
        onPress={() => confirmarDevolucion(item)}
      >
        <Text style={styles.devolverButtonText}>Devolver</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', cargarPrestamosActivos);
    return unsubscribe;
  }, [navigation]);

  const toggleMenu = () => setMenuVisible(!menuVisible);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <Modal
        animationType="slide"
        transparent={false}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <MenuUsuario navigation={navigation} onClose={() => setMenuVisible(false)} />
      </Modal>

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
            <MaterialIcons name="menu" size={28} color="#4a6da7" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Devolución de Equipos</Text>
          <TouchableOpacity 
            onPress={() => setScannerVisible(true)}
            style={styles.scanButton}
            disabled={loading}
          >
            <MaterialIcons 
              name="qr-code-scanner" 
              size={28} 
              color={loading ? '#adb5bd' : '#4a6da7'} 
            />
          </TouchableOpacity>
        </View>

        <FlatList
          data={prestamosActivos}
          renderItem={renderPrestamoItem}
          keyExtractor={(item) => item.idprestamo.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {loading ? (
                <>
                  <ActivityIndicator size="large" color="#4a6da7" />
                  <Text style={styles.loadingText}>Cargando préstamos...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="assignment-return" size={50} color="#6c757d" />
                  <Text style={styles.emptyText}>No hay préstamos activos</Text>
                </>
              )}
            </View>
          }
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />

        <QRScannerModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScan={handleScan}
        />

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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
  listContainer: {
    padding: 15,
    paddingBottom: 20,
    flexGrow: 1,
  },
  listItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  prestamoInfo: {
    flex: 1,
    marginRight: 10,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 4,
  },
  listItemText: {
    fontSize: 14,
    color: '#495057',
    marginVertical: 2,
  },
  listItemSubText: {
    fontSize: 13,
    color: '#6c757d',
    marginVertical: 2,
  },
  label: {
    color: '#6c757d',
    fontWeight: 'normal',
  },
  devolverButton: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  devolverButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
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
    marginTop: 10,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  }
});

export default DevolucionesUsuariosScreen;