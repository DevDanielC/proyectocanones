import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  ActivityIndicator, 
  Alert,
  SafeAreaView,
  StatusBar,
  Animated,
  Appearance,
  Dimensions
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import MenuUsuario from '../../components/MenuUsuario';
import QRScannerModal from '../../components/QRScannerModal';

const { width, height } = Dimensions.get('window');

const DevolucionesUsuariosScreen = ({ navigation }) => {
  const [prestamosActivos, setPrestamosActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [temaOscuro, setTemaOscuro] = useState(Appearance.getColorScheme() === 'dark');
  
  // Animaciones
  const scaleValue = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Colores según el tema
  const colores = {
    fondo: temaOscuro ? '#121212' : '#f8f9fa',
    fondoHeader: temaOscuro ? '#1e1e1e' : '#ffffff',
    fondoCard: temaOscuro ? '#1e1e1e' : '#ffffff',
    texto: temaOscuro ? '#e0e0e0' : '#1a202c',
    textoSecundario: temaOscuro ? '#9e9e9e' : '#4a5568',
    borde: temaOscuro ? '#424242' : '#e2e8f0',
    botonPrimario: temaOscuro ? '#1976d2' : '#4f46e5',
    botonDesactivado: temaOscuro ? '#424242' : '#d1d5db',
    icono: temaOscuro ? '#e0e0e0' : '#4a5568',
    overlay: temaOscuro ? 'rgba(30, 30, 30, 0.9)' : 'rgba(248, 249, 250, 0.9)',
    activo: temaOscuro ? '#4caf50' : '#059669',
    inactivo: temaOscuro ? '#f44336' : '#dc2626',
    seleccionado: temaOscuro ? '#303f9f' : '#6366f1'
  };

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
      style={[
        styles.listItem,
        { 
          backgroundColor: colores.fondoCard,
          borderColor: colores.borde
        }
      ]}
      onPress={() => navigation.navigate('DetallePrestamo', { prestamoId: item.idprestamo })}
      onLongPress={() => confirmarDevolucion(item)}
    >
      <View style={styles.prestamoInfo}>
        <Text style={[styles.listItemTitle, { color: colores.texto }]}>{item.equipos?.nombreequipo}</Text>
        <Text style={[styles.listItemText, { color: colores.texto }]}>
          <Text style={[styles.label, { color: colores.textoSecundario }]}>Prestado a: </Text>
          {item.personal?.nombre_completo}
        </Text>
        <Text style={[styles.listItemSubText, { color: colores.textoSecundario }]}>
          <Text style={[styles.label, { color: colores.textoSecundario }]}>Fecha préstamo: </Text>
          {new Date(item.fechaprestamo).toLocaleDateString()}
        </Text>
        {item.fechadevolucion_prevista && (
          <Text style={[styles.listItemSubText, { color: colores.textoSecundario }]}>
            <Text style={[styles.label, { color: colores.textoSecundario }]}>Devolución prevista: </Text>
            {new Date(item.fechadevolucion_prevista).toLocaleDateString()}
          </Text>
        )}
      </View>
      <TouchableOpacity 
        style={[
          styles.devolverButton,
          { backgroundColor: colores.botonPrimario }
        ]}
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

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
  }, []);

  useEffect(() => {
    if (menuVisible) {
      Animated.spring(scaleValue, {
        toValue: 0.95,
        useNativeDriver: true,
        damping: 20,
        stiffness: 400
      }).start();
    } else {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        stiffness: 400
      }).start();
    }
  }, [menuVisible]);

  const toggleMenu = () => setMenuVisible(!menuVisible);
  const alternarTema = () => setTemaOscuro(!temaOscuro);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colores.fondo }]}>
      <StatusBar barStyle={temaOscuro ? 'light-content' : 'dark-content'} backgroundColor={colores.fondoHeader} />
      
      {menuVisible && (
        <MenuUsuario navigation={navigation} onClose={() => setMenuVisible(false)} temaOscuro={temaOscuro} />
      )}

      <Animated.View style={[styles.container, { transform: [{ scale: scaleValue }], backgroundColor: colores.fondo }]}>
        <View style={[styles.header, { backgroundColor: colores.fondoHeader, borderBottomColor: colores.borde }]}>
          <TouchableOpacity 
            onPress={toggleMenu} 
            style={[styles.menuButton, { backgroundColor: `${colores.borde}50` }]}
          >
            <MaterialIcons name="menu" size={28} color={colores.icono} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: colores.texto }]}>Devolución de Equipos</Text>
          
          <View style={styles.headerRight}>
            <TouchableOpacity 
              onPress={alternarTema}
              style={[styles.themeButton, { backgroundColor: `${colores.borde}50` }]}
            >
              <MaterialIcons 
                name={temaOscuro ? 'wb-sunny' : 'brightness-2'} 
                size={24} 
                color={colores.icono} 
              />
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <FlatList
            data={prestamosActivos}
            renderItem={renderPrestamoItem}
            keyExtractor={(item) => item.idprestamo.toString()}
            contentContainerStyle={[styles.listContainer, { paddingBottom: 100 }]} // Añadido padding para el FAB
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                {loading ? (
                  <>
                    <ActivityIndicator size="large" color={colores.botonPrimario} />
                    <Text style={[styles.loadingText, { color: colores.textoSecundario }]}>Cargando préstamos...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="file-tray-outline" size={50} color={colores.textoSecundario} />
                    <Text style={[styles.emptyText, { color: colores.textoSecundario }]}>No hay préstamos activos</Text>
                  </>
                )}
              </View>
            }
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        </Animated.View>

        {/* Botón flotante para escanear */}
        <TouchableOpacity 
          style={[
            styles.scanFab,
            { 
              backgroundColor: colores.botonPrimario,
              shadowColor: temaOscuro ? '#000' : colores.botonPrimario
            }
          ]}
          onPress={() => setScannerVisible(true)}
          disabled={loading}
        >
          <MaterialIcons 
            name="qr-code-scanner" 
            size={28} 
            color="white" 
          />
          <Text style={styles.scanFabText}>Escanear QR</Text>
        </TouchableOpacity>

        <QRScannerModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScan={handleScan}
          theme={temaOscuro ? "dark" : "light"}
        />

        {loading && (
          <View style={[styles.loadingOverlay, { backgroundColor: colores.overlay }]}>
            <ActivityIndicator size="large" color={colores.botonPrimario} />
            <Text style={[styles.loadingText, { color: colores.texto }]}>Procesando...</Text>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
  },
  themeButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  listItem: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
  },
  prestamoInfo: {
    flex: 1,
    marginRight: 10,
  },
  listItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  listItemText: {
    fontSize: 14,
    marginVertical: 2,
  },
  listItemSubText: {
    fontSize: 13,
    marginVertical: 2,
  },
  label: {
    fontWeight: 'normal',
  },
  devolverButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
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
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scanFab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.4,
    height: 50,
    borderRadius: 25,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 5,
  },
  scanFabText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default DevolucionesUsuariosScreen;