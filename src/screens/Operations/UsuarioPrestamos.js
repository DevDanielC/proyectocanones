import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text,
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
  Platform,
  ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const MAX_CONTENT_WIDTH = 1200;

// Paleta de colores moderna
const COLORS = {
  primary: '#4361ee',         // Azul vibrante
  secondary: '#3f37c9',       // Azul oscuro
  accent: '#4895ef',          // Azul claro
  success: '#4cc9f0',         // Turquesa
  danger: '#f72585',          // Rosado
  warning: '#f8961e',         // Naranja
  light: '#f8f9fa',           // Gris muy claro
  dark: '#212529',            // Gris oscuro
  background: '#ffffff',      // Blanco
  cardBackground: '#ffffff',  // Blanco
  text: '#2b2d42',            // Azul grisáceo oscuro
  textSecondary: '#8d99ae',   // Gris azulado
  border: '#e9ecef',          // Gris claro
};

const PrestamosUsuariosScreen = () => {
  const navigation = useNavigation();
  const [equipos, setEquipos] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalPrestamoVisible, setModalPrestamoVisible] = useState(false);
  const [modalReservaVisible, setModalReservaVisible] = useState(false);
  const [modalAccionVisible, setModalAccionVisible] = useState(false);
  const [selectedEquipo, setSelectedEquipo] = useState(null);
  const [selectedPrestamo, setSelectedPrestamo] = useState(null);
  const [action, setAction] = useState('devolver');
  const [filter, setFilter] = useState('activos');
  const [fechaReserva, setFechaReserva] = useState(new Date());
  const [horaReserva, setHoraReserva] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTab, setActiveTab] = useState('equipos');

  // Cargar equipos disponibles
  const fetchEquipos = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('equipos')
        .select('*')
        .or('estado.eq.disponible,estado.eq.reservado')
        .order('nombreequipo', { ascending: true });

      if (searchQuery) {
        query = query.ilike('nombreequipo', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEquipos(data || []);
    } catch (error) {
      console.error('Error al cargar equipos:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar los equipos',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Cargar préstamos activos
  const fetchPrestamos = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('prestamos')
        .select(`
          idprestamo,
          fechaprestamo,
          fechareserva,
          horasreserva,
          estado,
          equipos: idequipo (nombreequipo, modelo, numero_serie),
          usuarios: idusuario (nombreusuario, email),
          horaprestamo
        `)
        .or('estado.eq.Prestado,estado.eq.Reservado')
        .order('fechaprestamo', { ascending: false });

      if (searchQuery) {
        query = query.or(
          `equipos.nombreequipo.ilike.%${searchQuery}%,usuarios.nombreusuario.ilike.%${searchQuery}%,equipos.numero_serie.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      const processedData = data.map(item => ({
        ...item,
        fechaCompleta: item.estado === 'Prestado' ? 
          (item.fechaprestamo ? 
            `${format(parseISO(item.fechaprestamo), 'PPP', { locale: es })} a las ${item.horaprestamo}` : 
            'No especificado') :
          (item.fechareserva ? 
            `${format(parseISO(item.fechareserva), 'PPP', { locale: es })} a las ${item.horasreserva}` : 
            'No especificado'),
        idequipo: item.equipos?.idequipo
      }));

      setPrestamos(processedData || []);
    } catch (error) {
      console.error('Error al cargar préstamos:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar los préstamos',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'equipos') {
      fetchEquipos();
    } else {
      fetchPrestamos();
    }
  }, [activeTab, searchQuery]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'equipos') {
      fetchEquipos();
    } else {
      fetchPrestamos();
    }
  };

  // Manejar préstamo de equipo
  const handlePrestamo = async () => {
    if (!selectedEquipo) return;
  
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigation.navigate('Login');
        return;
      }
  
      // First create the loan request
      const { data: solicitudData, error: solicitudError } = await supabase
        .from('solicitudes_prestamo')
        .insert([{
          idusuario: session.user.id,
          idequipo: selectedEquipo.idequipo,
          tiposolicitud: 'prestamo',
          fechasolicitud: new Date().toISOString().split('T')[0],
          estado: 'aprobado'
        }])
        .select();
  
      if (solicitudError) throw solicitudError;
  
      // Then create the actual loan
      const { error } = await supabase
        .from('prestamos')
        .insert([{
          idusuario: session.user.id,
          idequipo: selectedEquipo.idequipo,
          estado: 'Prestado',
          fechaprestamo: new Date().toISOString(),
          horaprestamo: format(horaReserva, 'HH:mm'),
          idsolicitud: solicitudData[0].idsolicitud // Link to the request
        }]);
  
      if (error) throw error;
  
      // Update equipment status
      await supabase
        .from('equipos')
        .update({ estado: 'prestado' })
        .eq('idequipo', selectedEquipo.idequipo);
  
      setModalPrestamoVisible(false);
      fetchEquipos();
      Toast.show({
        type: 'success',
        text1: 'Préstamo registrado',
        text2: `El equipo ${selectedEquipo.nombreequipo} ha sido prestado correctamente`,
      });
    } catch (error) {
      console.error('Error al registrar préstamo:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo registrar el préstamo',
      });
    }
  };

  // Manejar reserva de equipo
  const handleReserva = async () => {
    if (!selectedEquipo) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigation.navigate('Login');
        return;
      }

      const { error } = await supabase
        .from('prestamos')
        .insert([{
          idusuario: session.user.id,
          idequipo: selectedEquipo.idequipo,
          estado: 'Reservado',
          fechareserva: fechaReserva.toISOString().split('T')[0],
          horasreserva: format(horaReserva, 'HH:mm')
        }]);

      if (error) throw error;

      // Actualizar estado del equipo
      await supabase
        .from('equipos')
        .update({ estado: 'reservado' })
        .eq('idequipo', selectedEquipo.idequipo);

      setModalReservaVisible(false);
      fetchEquipos();
      Toast.show({
        type: 'success',
        text1: 'Reserva registrada',
        text2: `El equipo ${selectedEquipo.nombreequipo} ha sido reservado para el ${format(fechaReserva, 'PPP', { locale: es })} a las ${format(horaReserva, 'HH:mm')}`,
      });
    } catch (error) {
      console.error('Error al registrar reserva:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo registrar la reserva',
      });
    }
  };

  // Manejar devolución
  const handleAccionPrestamo = async () => {
    if (!selectedPrestamo) return;

    try {
      const { error } = await supabase
        .from('prestamos')
        .update({ 
          estado: 'Devuelto',
          fechadevolucion: new Date().toISOString()
        })
        .eq('idprestamo', selectedPrestamo.idprestamo);

      if (error) throw error;

      // Actualizar estado del equipo a disponible
      await supabase
        .from('equipos')
        .update({ estado: 'disponible' })
        .eq('idequipo', selectedPrestamo.idequipo);

      setModalAccionVisible(false);
      fetchPrestamos();
      Toast.show({
        type: 'success',
        text1: 'Devolución registrada',
        text2: `El equipo ha sido marcado como devuelto`,
      });
    } catch (error) {
      console.error('Error al realizar acción:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo completar la acción',
      });
    }
  };

  const formatHora = (date) => {
    return format(date, 'HH:mm');
  };

  const formatFecha = (date) => {
    return format(date, 'PPP', { locale: es });
  };

  // Renderizar cada equipo
  const renderEquipo = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <MaterialCommunityIcons 
            name="devices" 
            size={24} 
            color={item.estado === 'disponible' ? COLORS.success : COLORS.warning} 
          />
          <Text style={styles.cardTitle}>{item.nombreequipo}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.estado === 'disponible' ? styles.badgeAvailable : 
          item.estado === 'reservado' ? styles.badgeReserved : 
          styles.badgeUnavailable
        ]}>
          <Text style={styles.statusText}>
            {item.estado === 'disponible' ? 'Disponible' : 'Reservado'}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {item.modelo && (
          <View style={styles.cardRow}>
            <Icon name="info" size={20} color={COLORS.textSecondary} />
            <Text style={styles.cardText}>Modelo: {item.modelo}</Text>
          </View>
        )}
        {item.numero_serie && (
          <View style={styles.cardRow}>
            <Icon name="tag" size={20} color={COLORS.textSecondary} />
            <Text style={styles.cardText}>Serie: {item.numero_serie}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.actionButton, item.estado !== 'disponible' && styles.disabledButton]}
          onPress={() => {
            setSelectedEquipo(item);
            setHoraReserva(new Date());
            setModalPrestamoVisible(true);
          }}
          disabled={item.estado !== 'disponible'}
        >
          <Icon name="check-circle" size={20} color={COLORS.background} />
          <Text style={styles.actionButtonText}>Prestar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.reserveButton, item.estado !== 'disponible' && styles.disabledButton]}
          onPress={() => {
            setSelectedEquipo(item);
            setFechaReserva(new Date());
            setHoraReserva(new Date());
            setModalReservaVisible(true);
          }}
          disabled={item.estado !== 'disponible'}
        >
          <Icon name="event-available" size={20} color={COLORS.background} />
          <Text style={styles.actionButtonText}>Reservar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Renderizar cada préstamo
  const renderPrestamo = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <MaterialCommunityIcons 
            name={item.estado === 'Prestado' ? 'devices' : 'calendar-clock'} 
            size={24} 
            color={item.estado === 'Prestado' ? COLORS.primary : COLORS.warning} 
          />
          <Text style={styles.cardTitle}>{item.equipos?.nombreequipo || 'Equipo desconocido'}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.estado === 'Prestado' ? styles.badgeActive : styles.badgeReserved
        ]}>
          <Text style={styles.statusText}>{item.estado}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Icon name="person" size={20} color={COLORS.textSecondary} />
          <Text style={styles.cardText}>{item.usuarios?.nombreusuario || 'Usuario desconocido'}</Text>
        </View>

        <View style={styles.cardRow}>
          <Icon name="email" size={20} color={COLORS.textSecondary} />
          <Text style={styles.cardText}>{item.usuarios?.email || 'No especificado'}</Text>
        </View>

        <View style={styles.cardRow}>
          <Icon name="date-range" size={20} color={COLORS.textSecondary} />
          <Text style={styles.cardText}>
            {item.estado === 'Prestado' ? 'Préstamo: ' : 'Reserva: '}
            {item.fechaCompleta}
          </Text>
        </View>

        {item.equipos?.modelo && (
          <View style={styles.cardRow}>
            <Icon name="info" size={20} color={COLORS.textSecondary} />
            <Text style={styles.cardText}>Modelo: {item.equipos.modelo}</Text>
          </View>
        )}

        {item.equipos?.numero_serie && (
          <View style={styles.cardRow}>
            <Icon name="tag" size={20} color={COLORS.textSecondary} />
            <Text style={styles.cardText}>Serie: {item.equipos.numero_serie}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.actionButton, item.estado !== 'Prestado' && styles.disabledButton]}
          onPress={() => {
            setSelectedPrestamo(item);
            setAction('devolver');
            setModalAccionVisible(true);
          }}
          disabled={item.estado !== 'Prestado'}
        >
          <Icon name="assignment-return" size={20} color={COLORS.background} />
          <Text style={styles.actionButtonText}>Devolver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && ((activeTab === 'equipos' && equipos.length === 0) || (activeTab === 'prestamos' && prestamos.length === 0))) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header con menú */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.openDrawer()}
          style={styles.menuButton}
          hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
        >
          <Icon name="menu" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeTab === 'equipos' ? 'Gestión de Equipos' : 'Préstamos Activos'}
        </Text>
      </View>

      <View style={[styles.content, { maxWidth: MAX_CONTENT_WIDTH }]}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'equipos' && styles.activeTab]}
            onPress={() => setActiveTab('equipos')}
          >
            <MaterialCommunityIcons 
              name="devices" 
              size={20} 
              color={activeTab === 'equipos' ? COLORS.primary : COLORS.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'equipos' && styles.activeTabText]}>Equipos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'prestamos' && styles.activeTab]}
            onPress={() => setActiveTab('prestamos')}
          >
            <MaterialCommunityIcons 
              name="history" 
              size={20} 
              color={activeTab === 'prestamos' ? COLORS.primary : COLORS.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'prestamos' && styles.activeTabText]}>Préstamos</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Buscar ${activeTab === 'equipos' ? 'equipos...' : 'préstamos...'}`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        {/* Lista de Equipos */}
        {activeTab === 'equipos' ? (
          <FlatList
            data={equipos}
            renderItem={renderEquipo}
            keyExtractor={(item) => item.idequipo.toString()}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
              />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="devices" size={60} color={COLORS.border} />
                <Text style={styles.emptyText}>No se encontraron equipos</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery 
                    ? 'Prueba con otros términos de búsqueda' 
                    : 'No hay equipos disponibles en este momento'}
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={prestamos}
            renderItem={renderPrestamo}
            keyExtractor={(item) => item.idprestamo.toString()}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
              />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="history" size={60} color={COLORS.border} />
                <Text style={styles.emptyText}>No se encontraron préstamos</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery 
                    ? 'Prueba con otros términos de búsqueda' 
                    : 'No hay préstamos activos registrados'}
                </Text>
              </View>
            }
          />
        )}

        {/* Modal para Préstamo */}
        <Modal
          visible={modalPrestamoVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalPrestamoVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {selectedEquipo && (
                <>
                  <Text style={styles.modalTitle}>Registrar Préstamo</Text>
                  
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Equipo: </Text>
                    {selectedEquipo.nombreequipo}
                  </Text>
                  
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Hora del préstamo: </Text>
                    {formatHora(horaReserva)}
                  </Text>

                  <TouchableOpacity 
                    style={styles.timeInput}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Icon name="access-time" size={20} color={COLORS.textSecondary} />
                    <Text style={styles.timeInputText}>Cambiar hora: {formatHora(horaReserva)}</Text>
                  </TouchableOpacity>

                  {showTimePicker && (
                    <DateTimePicker
                      value={horaReserva}
                      mode="time"
                      is24Hour={true}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedTime) => {
                        setShowTimePicker(Platform.OS === 'ios');
                        if (selectedTime) {
                          setHoraReserva(selectedTime);
                        }
                      }}
                      style={styles.picker}
                    />
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setModalPrestamoVisible(false)}
                    >
                      <Text style={styles.modalButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.confirmButton]}
                      onPress={handlePrestamo}
                    >
                      <Text style={[styles.modalButtonText, styles.confirmButtonText]}>Confirmar Préstamo</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal para Reserva */}
        <Modal
          visible={modalReservaVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalReservaVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {selectedEquipo && (
                <>
                  <Text style={styles.modalTitle}>Registrar Reserva</Text>
                  
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Equipo: </Text>
                    {selectedEquipo.nombreequipo}
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Icon name="calendar-today" size={20} color={COLORS.textSecondary} />
                    <Text style={styles.dateInputText}>Fecha: {formatFecha(fechaReserva)}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.timeInput}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Icon name="access-time" size={20} color={COLORS.textSecondary} />
                    <Text style={styles.timeInputText}>Hora: {formatHora(horaReserva)}</Text>
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={fechaReserva}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          setFechaReserva(selectedDate);
                        }
                      }}
                      style={styles.picker}
                    />
                  )}

                  {showTimePicker && (
                    <DateTimePicker
                      value={horaReserva}
                      mode="time"
                      is24Hour={true}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedTime) => {
                        setShowTimePicker(Platform.OS === 'ios');
                        if (selectedTime) {
                          setHoraReserva(selectedTime);
                        }
                      }}
                      style={styles.picker}
                    />
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setModalReservaVisible(false)}
                    >
                      <Text style={styles.modalButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.confirmButton]}
                      onPress={handleReserva}
                    >
                      <Text style={[styles.modalButtonText, styles.confirmButtonText]}>Confirmar Reserva</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal para Devolución */}
        <Modal
          visible={modalAccionVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalAccionVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {selectedPrestamo && (
                <>
                  <Text style={styles.modalTitle}>Registrar Devolución</Text>
                  
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Equipo: </Text>
                    {selectedPrestamo.equipos?.nombreequipo || 'Desconocido'}
                  </Text>
                  
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Usuario: </Text>
                    {selectedPrestamo.usuarios?.nombreusuario || 'Usuario desconocido'}
                  </Text>
                  
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Fecha: </Text>
                    {selectedPrestamo.fechaCompleta}
                  </Text>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setModalAccionVisible(false)}
                    >
                      <Text style={styles.modalButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.confirmButton]}
                      onPress={handleAccionPrestamo}
                    >
                      <Text style={[styles.modalButtonText, styles.confirmButtonText]}>Confirmar Devolución</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 16,
    paddingHorizontal: isMobile ? 20 : 30,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 10,
  },
  menuButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.light,
  },
  headerTitle: {
    fontSize: isMobile ? 20 : 22,
    fontWeight: '700',
    color: COLORS.dark,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    padding: isMobile ? 16 : 24,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 6,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary + '15', // 15% de opacidad
  },
  tabText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 20,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
    color: COLORS.textSecondary,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 12,
  },
  cardBody: {
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardText: {
    marginLeft: 12,
    color: COLORS.textSecondary,
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flex: 1,
    marginHorizontal: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    color: COLORS.background,
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 15,
  },
  reserveButton: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
    shadowColor: COLORS.danger,
  },
  disabledButton: {
    opacity: 0.6,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  badgeAvailable: {
    backgroundColor: COLORS.success,
  },
  badgeReserved: {
    backgroundColor: COLORS.warning,
  },
  badgeUnavailable: {
    backgroundColor: COLORS.danger,
  },
  badgeActive: {
    backgroundColor: COLORS.primary,
  },
  badgeReturned: {
    backgroundColor: COLORS.textSecondary,
  },
  statusText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 20,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 15,
    marginTop: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContainer: {
    width: isMobile ? '90%' : '70%',
    maxWidth: 500,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 24,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 24,
    color: COLORS.text,
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 16,
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text,
  },
  modalLabel: {
    fontWeight: '600',
    color: COLORS.text,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: COLORS.background,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: COLORS.background,
  },
  dateInputText: {
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  timeInputText: {
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  picker: {
    width: '100%',
    backgroundColor: COLORS.background,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginLeft: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modalButtonText: {
    fontWeight: '500',
    fontSize: 16,
  },
  confirmButtonText: {
    color: COLORS.background,
  },
});

export default PrestamosUsuariosScreen;