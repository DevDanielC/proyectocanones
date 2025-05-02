import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  Alert,
  Dimensions,
  Modal,
  FlatList
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const DetallesEquipoScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [prestamoActivo, setPrestamoActivo] = useState(null);
  const [personalDisponible, setPersonalDisponible] = useState([]);
  const [modalPersonalVisible, setModalPersonalVisible] = useState(false);
  const [personalSeleccionado, setPersonalSeleccionado] = useState(null);
  
  // Extracción segura de parámetros con valores por defecto
  const { equipoId, equipo: equipoFromParams } = route.params || {};

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        
        // Si ya tenemos los datos del equipo desde los parámetros, los usamos
        if (equipoFromParams) {
          setEquipo(equipoFromParams);
        } else {
          // Validación del equipoId
          if (!equipoId || isNaN(equipoId)) {
            throw new Error('ID de equipo no válido');
          }

          const { data, error } = await supabase
            .from('equipos')
            .select(`
              idequipo,
              nombreequipo,
              estado,
              descripcion,
              fechacreacion,
              fechabaja,
              fechaactualizacion,
              categoriasequipos: idcategoria (nombrecategoria, descripcion)
            `)
            .eq('idequipo', equipoId)
            .single();

          if (error) throw error;
          if (!data) throw new Error('Equipo no encontrado');
          
          setEquipo(data);
        }

        // Verificar si el equipo tiene un préstamo activo
        const { data: prestamoData, error: prestamoError } = await supabase
          .from('prestamos')
          .select(`
            idprestamo,
            fechaprestamo,
            fechadevolucion_prevista,
            personal: idpersonal (idpersonal, nombre_completo, tipo_persona)
          `)
          .eq('idequipo', equipoFromParams?.idequipo || equipoId)
          .eq('estado', 'Prestado')
          .single();

        if (!prestamoError && prestamoData) {
          setPrestamoActivo(prestamoData);
          setPersonalSeleccionado(prestamoData.personal);
        }

        // Cargar personal disponible
        const { data: personalData, error: personalError } = await supabase
          .from('personal')
          .select('idpersonal, nombre_completo, tipo_persona, estado')
          .eq('estado', 'activo')
          .order('nombre_completo', { ascending: true });

        if (!personalError) {
          setPersonalDisponible(personalData || []);
        }

      } catch (error) {
        console.error('Error al cargar datos:', error);
        Alert.alert(
          'Error', 
          error.message || 'No se pudo cargar la información del equipo',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [equipoId, equipoFromParams]);

  const handlePrestamoPress = () => {
    if (equipo.estado === 'disponible') {
      setModalPersonalVisible(true);
    } else if (equipo.estado === 'prestado') {
      confirmarDevolucion();
    }
  };

  const handlePersonalSeleccionado = (persona) => {
    setPersonalSeleccionado(persona);
    setModalPersonalVisible(false);
    confirmarPrestamo(persona);
  };

  const confirmarPrestamo = (persona) => {
    Alert.alert(
      'Confirmar préstamo',
      `¿Desea registrar el préstamo del equipo ${equipo.nombreequipo} a ${persona.nombre_completo}?`,
      [
        { 
          text: 'Cancelar', 
          style: 'cancel',
          onPress: () => setModalPersonalVisible(true)
        },
        { 
          text: 'Confirmar', 
          onPress: () => registrarPrestamo(persona) 
        }
      ]
    );
  };

  const registrarPrestamo = async (persona) => {
    if (!equipo || !persona) return;
    
    setProcesando(true);
    
    try {
      const { error } = await supabase
        .from('prestamos')
        .insert({
          idpersonal: persona.idpersonal,
          idequipo: equipo.idequipo,
          estado: 'Prestado',
          fechaprestamo: new Date().toISOString(),
          fechadevolucion_prevista: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (error) throw error;

      // Actualizar estado del equipo
      const { error: errorEquipo } = await supabase
        .from('equipos')
        .update({ 
          estado: 'prestado',
          fechaactualizacion: new Date().toISOString() 
        })
        .eq('idequipo', equipo.idequipo);

      if (errorEquipo) throw errorEquipo;

      Alert.alert(
        'Préstamo registrado',
        `El préstamo del equipo ${equipo.nombreequipo} a ${persona.nombre_completo} ha sido registrado correctamente.`,
        [{ text: 'Aceptar', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error al registrar préstamo:', error);
      Alert.alert(
        'Error', 
        error.message || 'No se pudo registrar el préstamo'
      );
    } finally {
      setProcesando(false);
    }
  };

  const confirmarDevolucion = () => {
    Alert.alert(
      'Confirmar devolución',
      `¿Desea registrar la devolución del equipo ${equipo.nombreequipo} por parte de ${personalSeleccionado?.nombre_completo || 'el usuario'}?`,
      [
        { 
          text: 'Cancelar', 
          style: 'cancel'
        },
        { 
          text: 'Confirmar', 
          onPress: registrarDevolucion 
        }
      ]
    );
  };

  const registrarDevolucion = async () => {
    if (!equipo || !prestamoActivo) return;
    
    setProcesando(true);
    
    try {
      const { error } = await supabase.rpc('registrar_devolucion_app', {
        p_idprestamo: prestamoActivo.idprestamo
      });

      if (error) throw error;

      // Actualizar estado del equipo
      const { error: errorEquipo } = await supabase
        .from('equipos')
        .update({ 
          estado: 'disponible',
          fechaactualizacion: new Date().toISOString() 
        })
        .eq('idequipo', equipo.idequipo);

      if (errorEquipo) throw errorEquipo;

      Alert.alert(
        'Devolución registrada',
        `El equipo ${equipo.nombreequipo} ha sido devuelto correctamente.`,
        [{ text: 'Aceptar', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error al registrar devolución:', error);
      Alert.alert(
        'Error', 
        error.message || 'No se pudo registrar la devolución'
      );
    } finally {
      setProcesando(false);
    }
  };

  const renderPersonalItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.personalItem}
      onPress={() => handlePersonalSeleccionado(item)}
    >
      <Text style={styles.personalNombre}>{item.nombre_completo}</Text>
      <Text style={styles.personalTipo}>{item.tipo_persona}</Text>
    </TouchableOpacity>
  );

  // Pantalla de carga
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>Cargando información del equipo...</Text>
      </SafeAreaView>
    );
  }

  // Pantalla de error si no hay equipo
  if (!equipo) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No se encontró información del equipo</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Pantalla principal con detalles del equipo
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Encabezado con icono, nombre y estado */}
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons 
              name="desktop-classic" 
              size={32} 
              color="#4a6da7" 
              style={styles.equipoIcon}
            />
            <Text style={styles.cardTitle}>{equipo.nombreequipo}</Text>
            <View style={[
              styles.statusBadge,
              equipo.estado === 'disponible' ? styles.statusAvailable :
              equipo.estado === 'prestado' ? styles.statusReserved :
              equipo.estado === 'mantenimiento' ? styles.statusMaintenance :
              styles.statusUnavailable
            ]}>
              <Text style={styles.statusText}>
                {equipo.estado.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Detalles del equipo */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <MaterialIcons name="category" size={20} color="#6c757d" />
              <Text style={styles.detailText}>
                Categoría: {equipo.categoriasequipos?.nombrecategoria || 'No especificada'}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <MaterialIcons name="event" size={20} color="#6c757d" />
              <Text style={styles.detailText}>
                Fecha de creación: {new Date(equipo.fechacreacion).toLocaleDateString()}
              </Text>
            </View>

            {equipo.fechaactualizacion && (
              <View style={styles.detailItem}>
                <MaterialIcons name="update" size={20} color="#6c757d" />
                <Text style={styles.detailText}>
                  Última actualización: {new Date(equipo.fechaactualizacion).toLocaleDateString()}
                </Text>
              </View>
            )}

            {prestamoActivo && (
              <>
                <View style={styles.detailItem}>
                  <MaterialIcons name="person" size={20} color="#6c757d" />
                  <Text style={styles.detailText}>
                    Prestado a: {prestamoActivo.personal?.nombre_completo || 'No especificado'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="date-range" size={20} color="#6c757d" />
                  <Text style={styles.detailText}>
                    Fecha préstamo: {new Date(prestamoActivo.fechaprestamo).toLocaleDateString()}
                  </Text>
                </View>
                {prestamoActivo.fechadevolucion_prevista && (
                  <View style={styles.detailItem}>
                    <MaterialIcons name="event-available" size={20} color="#6c757d" />
                    <Text style={styles.detailText}>
                      Devolución prevista: {new Date(prestamoActivo.fechadevolucion_prevista).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </>
            )}

            {equipo.descripcion && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.sectionTitle}>Descripción</Text>
                <Text style={styles.descriptionText}>{equipo.descripcion}</Text>
              </View>
            )}

            {equipo.categoriasequipos?.descripcion && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.sectionTitle}>Descripción de la categoría</Text>
                <Text style={styles.descriptionText}>{equipo.categoriasequipos.descripcion}</Text>
              </View>
            )}
          </View>

          {/* Botón de acción según estado */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[
                styles.button,
                procesando && styles.buttonDisabled,
                equipo.estado === 'mantenimiento' && styles.buttonDisabled
              ]}
              onPress={handlePrestamoPress}
              disabled={procesando || equipo.estado === 'mantenimiento'}
            >
              {procesando ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <MaterialIcons 
                    name={equipo.estado === 'disponible' ? "send" : "assignment-return"} 
                    size={20} 
                    color="white" 
                  />
                  <Text style={styles.buttonText}>
                    {equipo.estado === 'disponible' ? 'Solicitar Préstamo' : 'Registrar Devolución'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {equipo.estado === 'mantenimiento' && (
              <Text style={styles.notAvailableText}>
                Este equipo está en mantenimiento y no está disponible
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal para selección de personal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalPersonalVisible}
        onRequestClose={() => setModalPersonalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar personal</Text>
            <Text style={styles.modalSubtitle}>Asignar préstamo a:</Text>
            
            <FlatList
              data={personalDisponible}
              renderItem={renderPersonalItem}
              keyExtractor={(item) => item.idpersonal.toString()}
              contentContainerStyle={styles.personalList}
            />

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setModalPersonalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
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
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#4a6da7',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContainer: {
    padding: isMobile ? 16 : 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  equipoIcon: {
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2c3e50',
    marginRight: 12,
    flexShrink: 1,
  },
  detailsContainer: {
    marginTop: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusAvailable: {
    backgroundColor: '#e6f7ee',
  },
  statusReserved: {
    backgroundColor: '#fff8e1',
  },
  statusMaintenance: {
    backgroundColor: '#fff0f0',
  },
  statusUnavailable: {
    backgroundColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#495057',
    marginLeft: 8,
    flexShrink: 1,
  },
  descriptionContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 22,
  },
  actionsContainer: {
    marginTop: 24,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4a6da7',
    padding: 14,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  notAvailableText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    paddingVertical: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#6c757d',
  },
  personalList: {
    paddingBottom: 20,
  },
  personalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  personalNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  personalTipo: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  cancelButton: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DetallesEquipoScreen;