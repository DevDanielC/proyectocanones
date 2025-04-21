import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Platform,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const MAX_CONTENT_WIDTH = 1200;
const isWeb = Platform.OS === 'web';

const HistorialPrestamosScreen = () => {
  const navigation = useNavigation();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [directorNombre, setDirectorNombre] = useState('Lic. Juan Pérez');
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
  const [showDatePickerFin, setShowDatePickerFin] = useState(false);
  const [filtroAccion, setFiltroAccion] = useState('Todos');
  const [detalleModalVisible, setDetalleModalVisible] = useState(false);
  const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleWebDateChange = (dateString, setDateFunction) => {
    const dateParts = dateString.split('-');
    const newDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    setDateFunction(newDate);
    fetchHistorial();
  };

  useEffect(() => {
    const loadDirectorName = async () => {
      try {
        const savedName = await AsyncStorage.getItem('@director_name');
        if (savedName) setDirectorNombre(savedName);
      } catch (error) {
        console.error('Error al cargar nombre:', error);
      }
    };
    loadDirectorName();
    fetchHistorial();
  }, []);

  const saveDirectorName = async () => {
    if (!nuevoNombre.trim()) {
      Alert.alert('Error', 'Por favor ingrese un nombre válido');
      return;
    }

    try {
      await AsyncStorage.setItem('@director_name', nuevoNombre);
      setDirectorNombre(nuevoNombre);
      setModalVisible(false);
      Alert.alert('Éxito', 'Nombre actualizado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el nombre');
    }
  };

  const fetchHistorial = async () => {
    setLoading(true);
    setRefreshing(true);
    
    try {
      let query = supabase
        .from('historial_prestamos')
        .select(`
          idhistorial,
          idprestamo,
          accion,
          fechaaccion,
          detalles,
          usuarios:usuarios!idusuario(
            nombreusuario,
            email,
            rol
          ),
          personal:personal!idpersonal(
            nombre_completo,
            tipo_persona,
            estado
          ),
          prestamos:prestamos!idprestamo(
            idprestamo,
            estado,
            fechaprestamo,
            fechadevolucion_real,
            equipos:equipos!idequipo(
              nombreequipo,
              estado,
              descripcion
            )
          )
        `)
        .gte('fechaaccion', fechaInicio.toISOString())
        .lte('fechaaccion', fechaFin.toISOString())
        .order('fechaaccion', { ascending: false });
  
      // Aplicar filtro por acción si no es "Todos"
      if (filtroAccion !== 'Todos') {
        query = query.eq('accion', filtroAccion);
      }
  
      const { data, error } = await query;
  
      if (error) throw error;
  
      const historialFormateado = data?.map(item => ({
        idhistorial: item.idhistorial,
        idprestamo: item.idprestamo,
        accion: item.accion,
        fechaaccion: item.fechaaccion,
        detalles: item.detalles,
        nombreUsuario: item.usuarios?.nombreusuario || item.personal?.nombre_completo || 'Usuario no registrado',
        emailUsuario: item.usuarios?.email || '',
        tipoPersona: item.personal?.tipo_persona || item.usuarios?.rol || '',
        estadoPrestamo: item.prestamos?.estado || 'N/A',
        nombreEquipo: item.prestamos?.equipos?.nombreequipo || 'Equipo no encontrado',
        descripcionEquipo: item.prestamos?.equipos?.descripcion || '',
        fechaPrestamo: item.prestamos?.fechaprestamo,
        fechaDevolucion: item.prestamos?.fechadevolucion_real
      })) || [];
  
      setHistorial(historialFormateado);
      
    } catch (error) {
      console.error('Error al cargar historial:', error);
      Alert.alert('Error', 'No se pudieron cargar los registros del historial');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDateChange = (date, setDate, setShowPicker) => {
    setShowPicker(false);
    if (date) {
      setDate(date);
      fetchHistorial();
    }
  };

  const mostrarDetallesCompletos = (item) => {
    setDetalleSeleccionado(item);
    setDetalleModalVisible(true);
  };

  const generatePrintDocument = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial; padding: 20px; margin: 0; }
              .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #eee; }
              .logo { max-width: 200px; max-height: 100px; margin-bottom: 15px; }
              h1 { color: #2c3e50; margin: 5px 0; font-size: 24px; }
              .subtitle { color: #7f8c8d; font-size: 14px; }
              .date-range { margin: 10px 0; font-size: 14px; color: #34495e; }
              .filter-info { margin: 10px 0; font-size: 14px; font-style: italic; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
              th, td { padding: 12px 8px; border: 1px solid #ddd; text-align: left; }
              th { background-color: #f8f9fa; font-weight: bold; color: #34495e; }
              .accion-prestamo { color: #2980b9; }
              .accion-devolucion { color: #27ae60; }
              .accion-otro { color: #e67e22; }
              .firma-container { margin-top: 60px; text-align: center; }
              .linea-firma { width: 300px; border-top: 1px solid #000; margin: 10px auto; }
              .nombre-director { font-weight: bold; margin-top: 5px; font-size: 16px; }
              .cargo-director { font-style: italic; color: #7f8c8d; }
              .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #95a5a6; border-top: 1px solid #eee; padding-top: 15px; }
              @media print { body { padding: 0; } .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="https://utregionaldelsur.sidci.mx/img/logo.png" class="logo" alt="Logo de la escuela">
              <h1>Reporte de Historial de Préstamos</h1>
              <p class="subtitle">Generado el: ${new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p class="date-range">
                Período: ${fechaInicio.toLocaleDateString('es-ES')} - ${fechaFin.toLocaleDateString('es-ES')}
              </p>
              <p class="filter-info">
                Filtro: ${filtroAccion === 'Todos' ? 'Todas las acciones' : `Solo acciones de tipo: ${filtroAccion}`}
              </p>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Acción</th>
                  <th>Fecha/Hora</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                  <th>Detalles</th>
                </tr>
              </thead>
              <tbody>
                ${historial.map(item => `
                  <tr>
                    <td>${item.nombreEquipo}</td>
                    <td class="${item.accion === 'Préstamo' ? 'accion-prestamo' : 
                               item.accion === 'Devolución' ? 'accion-devolucion' : 'accion-otro'}">
                      ${item.accion}
                    </td>
                    <td>${new Date(item.fechaaccion).toLocaleString('es-ES')}</td>
                    <td>${item.nombreUsuario}${item.departamento ? ` (${item.departamento})` : ''}</td>
                    <td>${item.estadoPrestamo}</td>
                    <td>${item.detalles || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="firma-container">
              <div class="linea-firma"></div>
              <div class="nombre-director">${directorNombre}</div>
              <div class="cargo-director">Director de Carrera</div>
            </div>
            
            <div class="footer">
              <p>Sistema de Gestión de Préstamos - ${new Date().getFullYear()}</p>
              <p>Documento generado automáticamente - Válido sin firma manuscrita</p>
            </div>
          </body>
        </html>
      `;

      if (isWeb) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      } else {
        Alert.alert(
          'Documento Listo',
          Platform.OS === 'android' 
            ? 'Se abrirá en el navegador para imprimir' 
            : 'Para imprimir: 1. Abre en Safari 2. Usa Compartir → Imprimir',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Abrir Documento', 
              onPress: () => Linking.openURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar el documento');
      console.error('Error generating document:', error);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => mostrarDetallesCompletos(item)}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{item.nombreEquipo}</Text>
          <Text style={[
            styles.cardSubtitle,
            item.accion === 'Préstamo' && styles.subtitlePrestamo,
            item.accion === 'Devolución' && styles.subtitleDevolucion
          ]}>
            {item.accion} • {new Date(item.fechaaccion).toLocaleDateString('es-ES')}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.estadoPrestamo === 'Prestado' ? styles.statusActive : 
          item.estadoPrestamo === 'Devuelto' ? styles.statusCompleted : 
          styles.statusOther
        ]}>
          <Text style={styles.statusText}>
            {item.estadoPrestamo}
          </Text>
        </View>
      </View>
      
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="account-circle-outline" size={16} color="#4a6da7" />
        <Text style={styles.detailText}>
          {item.nombreUsuario}
          {item.tipoPersona ? ` (${item.tipoPersona})` : ''}
          </Text>
      </View>
      
      {item.detalles && (
        <View style={styles.detailRow}>
          <MaterialIcons name="notes" size={16} color="#4a6da7" />
          <Text 
            style={styles.detailText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.detalles}
          </Text>
        </View>
      )}
      
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="clock-outline" size={16} color="#4a6da7" />
        <Text style={styles.detailText}>
          {new Date(item.fechaaccion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, isWeb && { maxWidth: MAX_CONTENT_WIDTH }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.openDrawer()}
            style={styles.menuButton}
            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
          >
            <MaterialIcons name="menu" size={24} color="#2c3e50" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Historial de Préstamos y Devoluciones</Text>
          
          <View style={styles.buttonGroup}>
            <Button 
              mode="contained" 
              onPress={() => {
                setNuevoNombre(directorNombre);
                setModalVisible(true);
              }}
              style={styles.directorButton}
              labelStyle={styles.buttonLabel}
            >
              <MaterialIcons name="edit" size={18} color="#FFF" />
            </Button>
            
            <Button 
              mode="contained" 
              onPress={generatePrintDocument}
              style={styles.printButton}
              labelStyle={styles.buttonLabel}
            >
              <MaterialIcons name="print" size={18} color="#FFF" />
            </Button>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Filtrar por:</Text>
            
            <View style={styles.filterOptions}>
              <TouchableOpacity 
                style={[
                  styles.filterOption, 
                  filtroAccion === 'Todos' && styles.filterOptionActive
                ]}
                onPress={() => {
                  setFiltroAccion('Todos');
                  fetchHistorial();
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  filtroAccion === 'Todos' && styles.filterOptionTextActive
                ]}>
                  Todos
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.filterOption, 
                  filtroAccion === 'Préstamo' && styles.filterOptionActive
                ]}
                onPress={() => {
                  setFiltroAccion('Préstamo');
                  fetchHistorial();
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  filtroAccion === 'Préstamo' && styles.filterOptionTextActive
                ]}>
                  Préstamos
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.filterOption, 
                  filtroAccion === 'Devolución' && styles.filterOptionActive
                ]}
                onPress={() => {
                  setFiltroAccion('Devolución');
                  fetchHistorial();
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  filtroAccion === 'Devolución' && styles.filterOptionTextActive
                ]}>
                  Devoluciones
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.dateFilterContainer}>
            {isWeb ? (
              <>
                <View style={styles.dateInput}>
                  <MaterialIcons name="calendar-today" size={16} color="#4a6da7" />
                  <input 
                    type="date"
                    value={formatDateForInput(fechaInicio)}
                    onChange={(e) => handleWebDateChange(e.target.value, setFechaInicio)}
                    style={styles.webDateInput}
                    max={formatDateForInput(new Date())}
                  />
                </View>
                
                <Text style={styles.dateSeparator}>a</Text>
                
                <View style={styles.dateInput}>
                  <MaterialIcons name="calendar-today" size={16} color="#4a6da7" />
                  <input 
                    type="date"
                    value={formatDateForInput(fechaFin)}
                    onChange={(e) => handleWebDateChange(e.target.value, setFechaFin)}
                    style={styles.webDateInput}
                    min={formatDateForInput(fechaInicio)}
                    max={formatDateForInput(new Date())}
                  />
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => setShowDatePickerInicio(true)}
                >
                  <MaterialIcons name="calendar-today" size={16} color="#4a6da7" />
                  <Text style={styles.dateText}>
                    Inicio: {fechaInicio.toLocaleDateString('es-ES')}
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.dateSeparator}>a</Text>
                
                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => setShowDatePickerFin(true)}
                >
                  <MaterialIcons name="calendar-today" size={16} color="#4a6da7" />
                  <Text style={styles.dateText}>
                    Fin: {fechaFin.toLocaleDateString('es-ES')}
                  </Text>
                </TouchableOpacity>
                
                {showDatePickerInicio && (
                  <DateTimePicker
                    value={fechaInicio}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(event, date) => handleDateChange(date, setFechaInicio, setShowDatePickerInicio)}
                    maximumDate={new Date()}
                  />
                )}
                
                {showDatePickerFin && (
                  <DateTimePicker
                    value={fechaFin}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(event, date) => handleDateChange(date, setFechaFin, setShowDatePickerFin)}
                    minimumDate={fechaInicio}
                    maximumDate={new Date()}
                  />
                )}
              </>
            )}
          </View>
        </View>

        <Modal 
          visible={modalVisible} 
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Cambiar Nombre del Director</Text>
              
              <TextInput
                style={styles.input}
                value={nuevoNombre}
                onChangeText={setNuevoNombre}
                placeholder="Ingrese el nombre completo"
                placeholderTextColor="#95a5a6"
                autoFocus={true}
              />
              
              <View style={styles.modalButtons}>
                <Button 
                  mode="outlined" 
                  onPress={() => setModalVisible(false)}
                  style={styles.cancelButton}
                  labelStyle={styles.cancelButtonText}
                >
                  Cancelar
                </Button>
                <Button 
                  mode="contained" 
                  onPress={saveDirectorName}
                  style={styles.saveButton}
                  labelStyle={styles.saveButtonText}
                >
                  Guardar
                </Button>
              </View>
            </View>
          </View>
        </Modal>

        <Modal 
          visible={detalleModalVisible} 
          transparent={true}
          animationType="slide"
          onRequestClose={() => setDetalleModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.detalleModalContent}>
              <Text style={styles.detalleModalTitle}>
                {detalleSeleccionado?.nombreEquipo}
              </Text>
              
              <View style={styles.detalleSection}>
                <Text style={styles.detalleLabel}>Acción:</Text>
                <Text style={[
                  styles.detalleValue,
                  detalleSeleccionado?.accion === 'Préstamo' && styles.detallePrestamo,
                  detalleSeleccionado?.accion === 'Devolución' && styles.detalleDevolucion
                ]}>
                  {detalleSeleccionado?.accion}
                </Text>
              </View>
              
              <View style={styles.detalleSection}>
                <Text style={styles.detalleLabel}>Estado:</Text>
                <Text style={styles.detalleValue}>
                  {detalleSeleccionado?.estadoPrestamo}
                </Text>
              </View>
              
              <View style={styles.detalleSection}>
                <Text style={styles.detalleLabel}>Fecha y Hora:</Text>
                <Text style={styles.detalleValue}>
                  {detalleSeleccionado?.fechaaccion ? 
                    new Date(detalleSeleccionado.fechaaccion).toLocaleString('es-ES') : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.detalleSection}>
                <Text style={styles.detalleLabel}>Responsable:</Text>
                <Text style={styles.detalleValue}>
                  {detalleSeleccionado?.nombreUsuario}
                  {detalleSeleccionado?.departamento ? ` (${detalleSeleccionado.departamento})` : ''}
                </Text>
              </View>
              
              {detalleSeleccionado?.fechaPrestamo && (
                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>Fecha Préstamo:</Text>
                  <Text style={styles.detalleValue}>
                    {new Date(detalleSeleccionado.fechaPrestamo).toLocaleDateString('es-ES')}
                  </Text>
                </View>
              )}
              
              {detalleSeleccionado?.fechaDevolucion && (
                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>Fecha Devolución:</Text>
                  <Text style={styles.detalleValue}>
                    {new Date(detalleSeleccionado.fechaDevolucion).toLocaleDateString('es-ES')}
                  </Text>
                </View>
              )}
              
              {detalleSeleccionado?.descripcionEquipo && (
                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>Descripción Equipo:</Text>
                  <Text style={styles.detalleValue}>
                    {detalleSeleccionado.descripcionEquipo}
                  </Text>
                </View>
              )}
              
              {detalleSeleccionado?.detalles && (
                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>Detalles:</Text>
                  <Text style={styles.detalleValue}>
                    {detalleSeleccionado.detalles}
                  </Text>
                </View>
              )}
              
              <Button 
                mode="contained" 
                onPress={() => setDetalleModalVisible(false)}
                style={styles.closeDetalleButton}
                labelStyle={styles.closeDetalleButtonText}
              >
                Cerrar
              </Button>
            </View>
          </View>
        </Modal>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Cargando historial...</Text>
          </View>
        ) : (
          <FlatList
            data={historial}
            renderItem={renderItem}
            keyExtractor={item => item.idhistorial.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={fetchHistorial}
                colors={['#3498db']}
                tintColor="#3498db"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="book-clock" size={48} color="#ecf0f1" />
                <Text style={styles.emptyText}>
                  No se encontraron registros con los filtros seleccionados
                </Text>
              </View>
            }
          />
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
    alignSelf: 'center',
    width: '100%',
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
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  directorButton: {
    backgroundColor: '#4a6da7',
    borderRadius: 4,
    marginRight: 8,
    minWidth: 40,
  },
  printButton: {
    backgroundColor: '#27ae60',
    borderRadius: 4,
    minWidth: 40,
  },
  buttonLabel: {
    color: '#FFF',
    marginVertical: 6,
    marginHorizontal: 0,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  filterOptions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterOptionActive: {
    backgroundColor: '#4a6da7',
    borderColor: '#4a6da7',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#6c757d',
  },
  filterOptionTextActive: {
    color: '#FFF',
  },
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 12,
    flex: 1,
    marginHorizontal: 5,
  },
  dateText: {
    marginLeft: 8,
    color: '#495057',
  },
  dateSeparator: {
    marginHorizontal: 8,
    color: '#6c757d',
  },
  webDateInput: {
    marginLeft: 8,
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#495057',
    fontFamily: 'inherit',
    backgroundColor: 'transparent',
    width: '100%',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 20,
    width: isMobile ? '90%' : '40%',
  },
  detalleModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 20,
    width: isMobile ? '90%' : '60%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  detalleModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    borderColor: '#95a5a6',
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#95a5a6',
  },
  saveButton: {
    backgroundColor: '#4a6da7',
    flex: 1,
  },
  saveButtonText: {
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  listContent: {
    padding: isMobile ? 8 : 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#95a5a6',
  },
  subtitlePrestamo: {
    color: '#2980b9',
  },
  subtitleDevolucion: {
    color: '#27ae60',
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusActive: {
    backgroundColor: '#e6f7ee',
  },
  statusCompleted: {
    backgroundColor: '#e8f5e9',
  },
  statusOther: {
    backgroundColor: '#fff8e1',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 16,
    textAlign: 'center',
  },
  detalleSection: {
    marginBottom: 15,
  },
  detalleLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  detalleValue: {
    fontSize: 16,
    color: '#2c3e50',
  },
  detallePrestamo: {
    color: '#2980b9',
    fontWeight: '600',
  },
  detalleDevolucion: {
    color: '#27ae60',
    fontWeight: '600',
  },
  closeDetalleButton: {
    backgroundColor: '#4a6da7',
    marginTop: 20,
  },
  closeDetalleButtonText: {
    color: '#FFF',
  },
});

export default HistorialPrestamosScreen;