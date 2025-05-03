import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
  Animated,
  Easing,
  Appearance
} from 'react-native';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import MenuUsuario from '../components/MenuUsuario';
import QRScannerModal from '../components/QRScannerModal';

const { width, height } = Dimensions.get('window');

const SolicitarPrestamoUsuario = ({ navigation }) => {
  // Estados
  const [categorias, setCategorias] = useState([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [personalDisponible, setPersonalDisponible] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalEquiposVisible, setModalEquiposVisible] = useState(false);
  const [modalPersonalVisible, setModalPersonalVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [personalSeleccionado, setPersonalSeleccionado] = useState(null);
  const [equipoPreseleccionado, setEquipoPreseleccionado] = useState(null);
  const [personalPreseleccionado, setPersonalPreseleccionado] = useState(null);
  const [temaOscuro, setTemaOscuro] = useState(Appearance.getColorScheme() === 'dark');

  // Animaciones
  const scaleValue = useRef(new Animated.Value(1)).current;
  const modalSlideAnim = useRef(new Animated.Value(0)).current;
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
    inputFondo: temaOscuro ? '#1e1e1e' : '#ffffff',
    inputTexto: temaOscuro ? '#e0e0e0' : '#1a202c',
    inputPlaceholder: temaOscuro ? '#757575' : '#a0aec0',
    activo: temaOscuro ? '#4caf50' : '#059669',
    inactivo: temaOscuro ? '#f44336' : '#dc2626',
    preseleccionado: temaOscuro ? '#1a237e' : '#2196f3',
    seleccionado: temaOscuro ? '#0d47a1' : '#1976d2'
  };

  // Componente ContenedorModal actualizado
  const ContenedorModal = ({ children }) => {
    const modalHeight = height * 0.8;
    
    return (
      <Animated.View 
        style={[
          styles.modalContainer,
          {
            transform: [{
              translateY: modalSlideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [modalHeight, 0]
              })
            }],
            backgroundColor: colores.fondoCard,
            height: modalHeight,
            width: width - 32,
            borderRadius: 16,
          }
        ]}
      >
        <View style={[styles.modalContent, { borderColor: colores.borde }]}>
          {children}
        </View>
      </Animated.View>
    );
  };

  // Función para manejar el escaneo QR
  const manejarEscaneoQR = async (qrData) => {
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

  // Efecto para animaciones del menú
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

  // Efecto para animación de entrada de modal
  useEffect(() => {
    if (modalEquiposVisible || modalPersonalVisible) {
      modalSlideAnim.setValue(0);
      Animated.timing(modalSlideAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start();
    }
  }, [modalEquiposVisible, modalPersonalVisible]);

  // Efecto para animación de fade in
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
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
    
    const unsubscribe = navigation.addListener('focus', cargarDatos);
    return unsubscribe;
  }, [navigation]);

  // Alternar tema claro/oscuro
  const alternarTema = () => {
    setTemaOscuro(!temaOscuro);
  };

  // Manejar selección de categoría
  const manejarSeleccionCategoria = async (categoria) => {
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
  const manejarEquipoSeleccionado = (equipo) => {
    if (!equipo) return;
    
    setEquipoSeleccionado(equipo);
    setEquipoPreseleccionado(null);
    setModalEquiposVisible(false);
    setPersonalPreseleccionado(null);
    setModalPersonalVisible(true);
  };

  // Manejar selección de personal
  const manejarPersonalSeleccionado = (persona) => {
    if (!persona) return;
    
    setPersonalSeleccionado(persona);
    setPersonalPreseleccionado(null);
    setModalPersonalVisible(false);
    confirmarPrestamo(equipoSeleccionado, persona);
  };

  // Confirmar préstamo
  const confirmarPrestamo = (equipo, personal) => {
    if (!equipo || !personal) {
      Alert.alert('Error', 'Debe seleccionar tanto el equipo como el personal');
      return;
    }

    Alert.alert(
      'Confirmar préstamo',
      `¿Desea registrar el préstamo de:\n\nEquipo: ${equipo.nombreequipo}\nA: ${personal.nombre_completo}?`,
      [
        { 
          text: 'Cancelar', 
          style: 'cancel',
          onPress: () => setModalPersonalVisible(true)
        },
        { 
          text: 'Confirmar', 
          onPress: () => registrarPrestamo(equipo, personal)
        }
      ],
      { cancelable: false }
    );
  };

  // Registrar préstamo
  const registrarPrestamo = async (equipo, personal) => {
    if (!equipo || !personal) return;
    
    setLoading(true);
    try {
      // Verificar estado del equipo
      const { data: equipoVerificado, error: errorVerificacion } = await supabase
        .from('equipos')
        .select('estado')
        .eq('idequipo', equipo.idequipo)
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
          idpersonal: personal.idpersonal,
          idequipo: equipo.idequipo,
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
        .eq('idequipo', equipo.idequipo);
  
      if (errorEquipo) throw errorEquipo;
  
      // Registrar en historial
      const { error: errorHistorial } = await supabase
        .from('historial_prestamos')
        .insert({
          idprestamo: newPrestamo.idprestamo,
          idpersonal: personal.idpersonal,
          accion: 'Préstamo',
          fechaaccion: new Date().toISOString(),
          detalles: `Préstamo del equipo ${equipo.nombreequipo} a ${personal.nombre_completo}`
        });
  
      if (errorHistorial) throw errorHistorial;
  
      Alert.alert(
        'Éxito', 
        `Préstamo registrado:\n\nEquipo: ${equipo.nombreequipo}\nPersona: ${personal.nombre_completo}`,
        [{ 
          text: 'OK', 
          onPress: () => {
            resetearFormulario();
            navigation.navigate('HistorialPrestamos');
          }
        }]
      );
      
    } catch (error) {
      console.error('Error registrando préstamo:', error);
      Alert.alert(
        'Error', 
        error.message || 'No se pudo registrar el préstamo',
        [{
          text: 'OK',
          onPress: () => setModalPersonalVisible(true)
        }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Resetear formulario
  const resetearFormulario = () => {
    setEquipoSeleccionado(null);
    setPersonalSeleccionado(null);
    setCategoriaSeleccionada(null);
    setSearchTerm('');
    setEquipoPreseleccionado(null);
    setPersonalPreseleccionado(null);
  };

  // Filtrar personal según búsqueda
  const personalFiltrado = personalDisponible.filter(persona =>
    persona.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Renderizar categorías
  const renderizarCategoria = ({ item }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity 
        style={[
          styles.card, 
          { 
            backgroundColor: colores.fondoCard,
            borderColor: colores.borde
          }
        ]} 
        onPress={() => manejarSeleccionCategoria(item)}
        disabled={loading}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={[
            styles.iconContainer,
            { 
              backgroundColor: item.estado === 'activo' ? colores.activo : colores.botonDesactivado
            }
          ]}>
            <MaterialIcons 
              name="category" 
              size={20} 
              color="white"
            />
          </View>
          <Text style={[styles.cardTitle, { color: colores.texto }]}>{item.nombrecategoria}</Text>
        </View>
        <Text style={[styles.cardDescription, { color: colores.textoSecundario }]}>{item.descripcion}</Text>
        <View style={[styles.cardFooter, { borderTopColor: colores.borde }]}>
          <View style={[
            styles.statusBadge,
            { 
              backgroundColor: item.estado === 'activo' ? `${colores.activo}20` : `${colores.inactivo}20`,
              borderColor: item.estado === 'activo' ? colores.activo : colores.inactivo
            }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.estado === 'activo' ? colores.activo : colores.inactivo }
            ]}>
              {item.estado === 'activo' ? 'Disponible' : 'No disponible'}
            </Text>
          </View>
          <View style={[styles.arrowContainer, { backgroundColor: colores.borde }]}>
            <FontAwesome name="chevron-right" size={14} color={colores.textoSecundario} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // Renderizar equipos
  const renderizarEquipo = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.listItem,
        { 
          backgroundColor: colores.fondoCard,
          borderColor: colores.borde
        },
        item.estado !== 'disponible' && styles.itemDisabled,
        equipoPreseleccionado?.idequipo === item.idequipo && {
          backgroundColor: colores.preseleccionado,
          borderLeftWidth: 6,
          borderLeftColor: colores.botonPrimario
        }
      ]}
      onPress={() => {
        if (item.estado === 'disponible') {
          setEquipoPreseleccionado(item);
        }
      }}
      onLongPress={() => {
        if (item.estado === 'disponible') {
          manejarEquipoSeleccionado(item);
        }
      }}
      disabled={item.estado !== 'disponible'}
      activeOpacity={0.8}
    >
      <View style={styles.equipoInfo}>
        <Text style={[
          styles.listItemTitle,
          { color: colores.texto },
          equipoPreseleccionado?.idequipo === item.idequipo && { color: 'white' }
        ]}>
          {item.nombreequipo}
        </Text>
        <Text style={[
          styles.listItemText, 
          { color: colores.texto },
          equipoPreseleccionado?.idequipo === item.idequipo && { color: 'white' }
        ]}>
          <Text style={[
            styles.label, 
            { color: colores.textoSecundario },
            equipoPreseleccionado?.idequipo === item.idequipo && { color: 'rgba(255,255,255,0.8)' }
          ]}>Categoría: </Text>
          {item.categoriasequipos?.nombrecategoria || 'General'}
        </Text>
        {item.descripcion && (
          <Text style={[
            styles.listItemText, 
            { color: colores.texto },
            equipoPreseleccionado?.idequipo === item.idequipo && { color: 'white' }
          ]}>{item.descripcion}</Text>
        )}
      </View>
      
      <View style={[
        styles.statusBadge,
        { 
          backgroundColor: item.estado === 'disponible' ? `${colores.activo}20` : `${colores.inactivo}20`,
          borderColor: item.estado === 'disponible' ? colores.activo : colores.inactivo
        }
      ]}>
        <Text style={[
          styles.statusText,
          { color: item.estado === 'disponible' ? colores.activo : colores.inactivo }
        ]}>
          {item.estado.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Renderizar personal
  const renderizarPersonal = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.listItem,
        { 
          backgroundColor: colores.fondoCard,
          borderColor: colores.borde
        },
        personalPreseleccionado?.idpersonal === item.idpersonal && {
          backgroundColor: colores.preseleccionado,
          borderLeftWidth: 6,
          borderLeftColor: colores.botonPrimario
        },
        personalSeleccionado?.idpersonal === item.idpersonal && {
          backgroundColor: colores.seleccionado,
          borderLeftWidth: 6,
          borderLeftColor: colores.botonPrimario
        },
        item.estado === 'inactivo' && styles.itemDisabled
      ]} 
      onPress={() => {
        if (item.estado === 'activo') {
          setPersonalPreseleccionado(item);
        }
      }}
      onLongPress={() => {
        if (item.estado === 'activo') {
          manejarPersonalSeleccionado(item);
        }
      }}
      disabled={item.estado === 'inactivo'}
      activeOpacity={0.8}
    >
      <View>
        <Text style={[
          styles.listItemText,
          { color: colores.texto },
          (personalPreseleccionado?.idpersonal === item.idpersonal || 
           personalSeleccionado?.idpersonal === item.idpersonal) && { color: 'white' }
        ]}>
          {item.nombre_completo}
        </Text>
        <Text style={[
          styles.listItemSubText, 
          { color: colores.textoSecundario },
          (personalPreseleccionado?.idpersonal === item.idpersonal ||
           personalSeleccionado?.idpersonal === item.idpersonal) && { color: 'rgba(255,255,255,0.8)' }
        ]}>{item.tipo_persona}</Text>
      </View>
      <View style={[
        styles.personIconContainer,
        { backgroundColor: colores.borde },
        (personalPreseleccionado?.idpersonal === item.idpersonal ||
         personalSeleccionado?.idpersonal === item.idpersonal) && {
          backgroundColor: colores.botonPrimario
        }
      ]}>
        <MaterialIcons 
          name="person" 
          size={20} 
          color={
            item.estado === 'inactivo' ? colores.botonDesactivado :
            (personalPreseleccionado?.idpersonal === item.idpersonal ||
             personalSeleccionado?.idpersonal === item.idpersonal) ? 'white' : colores.textoSecundario
          } 
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colores.fondo }]}>
      <StatusBar barStyle={temaOscuro ? 'light-content' : 'dark-content'} backgroundColor={colores.fondoHeader} />
      
      {menuVisible && (
        <MenuUsuario navigation={navigation} onClose={() => setMenuVisible(false)} temaOscuro={temaOscuro} />
      )}

      <Animated.View style={[styles.container, { transform: [{ scale: scaleValue }], backgroundColor: colores.fondo }]}>
        {/* Encabezado */}
        <View style={[styles.header, { backgroundColor: colores.fondoHeader, borderBottomColor: colores.borde }]}>
          <TouchableOpacity 
            onPress={() => setMenuVisible(true)} 
            style={[styles.menuButton, { backgroundColor: `${colores.borde}50` }]}
            activeOpacity={0.8}
          >
            <MaterialIcons name="menu" size={28} color={colores.icono} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: colores.texto }]}>Préstamos Directos</Text>
          
          <View style={styles.headerRight}>
            <TouchableOpacity 
              onPress={alternarTema}
              style={[styles.themeButton, { backgroundColor: `${colores.borde}50` }]}
              activeOpacity={0.8}
            >
              <MaterialIcons 
                name={temaOscuro ? 'wb-sunny' : 'brightness-2'} 
                size={24} 
                color={colores.icono} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Listado de categorías */}
        <ScrollView 
          contentContainerStyle={[styles.listContainer, { paddingBottom: 100 }]}
        >
          {loading && categorias.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colores.botonPrimario} />
              <Text style={[styles.loadingText, { color: colores.textoSecundario }]}>Cargando categorías...</Text>
            </View>
          ) : categorias.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={48} color={colores.textoSecundario} />
              <Text style={[styles.emptyText, { color: colores.textoSecundario }]}>No hay categorías disponibles</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: colores.textoSecundario }]}>Seleccione una categoría:</Text>
              <FlatList
                data={categorias}
                renderItem={renderizarCategoria}
                keyExtractor={(item) => item.idcategoria.toString()}
                scrollEnabled={false}
              />
            </>
          )}
        </ScrollView>

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
          activeOpacity={0.8}
        >
          <MaterialIcons 
            name="qr-code-scanner" 
            size={28} 
            color="white" 
          />
          <Text style={styles.scanFabText}>Escanear QR</Text>
        </TouchableOpacity>

        {/* Modal para selección de equipos */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalEquiposVisible}
          onRequestClose={() => setModalEquiposVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ContenedorModal>
              <View style={[styles.modalHeader, { 
                backgroundColor: colores.fondoCard, 
                borderBottomColor: colores.borde 
              }]}>
                <Text style={[styles.modalTitle, { color: colores.texto }]}>Seleccionar equipo</Text>
                <Text style={[styles.modalSubtitle, { color: colores.textoSecundario }]}>
                  {categoriaSeleccionada?.nombrecategoria || 'Categoría no especificada'}
                </Text>
              </View>
              
              <ScrollView 
                style={styles.modalScrollContent}
                contentContainerStyle={{ paddingBottom: 15 }}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colores.botonPrimario} />
                    <Text style={[styles.loadingText, { color: colores.textoSecundario }]}>
                      Buscando equipos...
                    </Text>
                  </View>
                ) : equiposDisponibles.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="error-outline" size={50} color={colores.textoSecundario} />
                    <Text style={[styles.emptyText, { color: colores.textoSecundario }]}>
                      No hay equipos disponibles en esta categoría
                    </Text>
                  </View>
                ) : (
                  equiposDisponibles.map((equipo) => (
                    <View key={equipo.idequipo.toString()}>
                      {renderizarEquipo({ item: equipo })}
                    </View>
                  ))
                )}
              </ScrollView>
              
              <View style={[styles.confirmationContainer, { 
                backgroundColor: colores.fondoCard, 
                borderTopColor: colores.borde 
              }]}>
                <TouchableOpacity 
                  style={[
                    styles.confirmButton,
                    { backgroundColor: colores.botonPrimario },
                    !equipoPreseleccionado && { backgroundColor: colores.botonDesactivado }
                  ]}
                  onPress={() => equipoPreseleccionado && manejarEquipoSeleccionado(equipoPreseleccionado)}
                  disabled={!equipoPreseleccionado}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmButtonText}>
                    {equipoPreseleccionado ? `Confirmar ${equipoPreseleccionado.nombreequipo}` : 'Seleccione un equipo'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.cancelButton, { 
                  backgroundColor: colores.fondoCard, 
                  borderColor: colores.textoSecundario 
                }]}
                onPress={() => setModalEquiposVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelButtonText, { color: colores.texto }]}>
                  Volver a categorías
                </Text>
              </TouchableOpacity>
            </ContenedorModal>
          </View>
        </Modal>

        {/* Modal para selección de personal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalPersonalVisible}
          onRequestClose={() => setModalPersonalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ContenedorModal>
              <View style={[styles.modalHeader, { 
                backgroundColor: colores.fondoCard, 
                borderBottomColor: colores.borde 
              }]}>
                <Text style={[styles.modalTitle, { color: colores.texto }]}>Asignar a persona</Text>
                <Text style={[styles.modalSubtitle, { color: colores.textoSecundario }]}>Seleccione el beneficiario</Text>
                {equipoSeleccionado && (
                  <Text style={[styles.modalSubtitle, { color: colores.textoSecundario }]}>Equipo: {equipoSeleccionado.nombreequipo}</Text>
                )}
              </View>
              
              <TextInput
                style={[
                  styles.searchInput,
                  { 
                    backgroundColor: colores.inputFondo,
                    color: colores.inputTexto,
                    borderColor: colores.borde,
                    placeholderTextColor: colores.inputPlaceholder
                  }
                ]}
                placeholder="Buscar personal..."
                placeholderTextColor={colores.inputPlaceholder}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              
              <ScrollView 
                style={styles.modalScrollContent}
                contentContainerStyle={{ paddingBottom: 15 }}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colores.botonPrimario} />
                    <Text style={[styles.loadingText, { color: colores.textoSecundario }]}>Cargando personal...</Text>
                  </View>
                ) : personalFiltrado.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={50} color={colores.textoSecundario} />
                    <Text style={[styles.emptyText, { color: colores.textoSecundario }]}>
                      {searchTerm ? 'No se encontraron coincidencias' : 'No hay personal disponible'}
                    </Text>
                  </View>
                ) : (
                  personalFiltrado.map((persona) => (
                    <View key={persona.idpersonal.toString()}>
                      {renderizarPersonal({ item: persona })}
                    </View>
                  ))
                )}
              </ScrollView>
              
              <View style={[styles.confirmationContainer, { 
                backgroundColor: colores.fondoCard, 
                borderTopColor: colores.borde 
              }]}>
                <TouchableOpacity 
                  style={[
                    styles.confirmButton,
                    { backgroundColor: colores.botonPrimario },
                    !personalPreseleccionado && { backgroundColor: colores.botonDesactivado }
                  ]}
                  onPress={() => personalPreseleccionado && manejarPersonalSeleccionado(personalPreseleccionado)}
                  disabled={!personalPreseleccionado}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmButtonText}>
                    {personalPreseleccionado ? `Confirmar ${personalPreseleccionado.nombre_completo}` : 'Seleccione una persona'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.cancelButton, { 
                  backgroundColor: colores.fondoCard, 
                  borderColor: colores.textoSecundario 
                }]}
                onPress={() => setModalPersonalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelButtonText, { color: colores.texto }]}>Cancelar préstamo</Text>
              </TouchableOpacity>
            </ContenedorModal>
          </View>
        </Modal>

        {/* Modal para escanear QR */}
        <QRScannerModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScan={manejarEscaneoQR}
          theme={temaOscuro ? "dark" : "light"}
        />

        {/* Overlay de carga */}
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
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  arrowContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  itemDisabled: {
    opacity: 0.6,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  listItemSubText: {
    fontSize: 14,
    marginTop: 4,
  },
  listItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  label: {
    fontWeight: 'normal',
  },
  equipoInfo: {
    flex: 1,
    marginRight: 12,
  },
  personIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContent: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  modalScrollContent: {
    flex: 1,
    paddingBottom: 80
  },
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    margin: 16,
    fontSize: 16,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmationContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  confirmButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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

export default SolicitarPrestamoUsuario;