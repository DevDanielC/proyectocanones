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

const ReporteMantenimientoScreen = () => {
  const navigation = useNavigation();
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [directorNombre, setDirectorNombre] = useState('Lic. Juan Pérez');
  const [tecnicoNombre, setTecnicoNombre] = useState('Técnico Mantenimiento');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTecnicoVisible, setModalTecnicoVisible] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTecnico, setNuevoTecnico] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
  const [showDatePickerFin, setShowDatePickerFin] = useState(false);
  const [mostrarCompletados, setMostrarCompletados] = useState(true);

  // Función para formatear la fecha como YYYY-MM-DD (necesario para input type="date")
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para manejar cambios en las fechas (versión web)
  const handleWebDateChange = (dateString, setDateFunction) => {
    const dateParts = dateString.split('-');
    const newDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    setDateFunction(newDate);
    fetchReportes();
  };

  useEffect(() => {
    const loadNames = async () => {
      try {
        const savedDirector = await AsyncStorage.getItem('@director_name');
        const savedTecnico = await AsyncStorage.getItem('@tecnico_name');
        if (savedDirector) setDirectorNombre(savedDirector);
        if (savedTecnico) setTecnicoNombre(savedTecnico);
      } catch (error) {
        console.error('Error al cargar nombres:', error);
      }
    };
    loadNames();
    fetchReportes();
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
      Alert.alert('Éxito', 'Nombre del director actualizado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el nombre del director');
    }
  };

  const saveTecnicoName = async () => {
    if (!nuevoTecnico.trim()) {
      Alert.alert('Error', 'Por favor ingrese un nombre válido');
      return;
    }

    try {
      await AsyncStorage.setItem('@tecnico_name', nuevoTecnico);
      setTecnicoNombre(nuevoTecnico);
      setModalTecnicoVisible(false);
      Alert.alert('Éxito', 'Nombre del técnico actualizado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el nombre del técnico');
    }
  };

  const fetchReportes = async () => {
    setLoading(true);
    setRefreshing(true);
    
    try {
      let query = supabase
        .from('historial_mantenimiento')
        .select(`
          idhistorialmantenimiento,
          fechamantenimiento,
          horamantenimiento,
          horadevolucion,
          tipomantenimiento,
          observaciones,
          accion,
          equipos:equipos(nombreequipo),
          usuarios:usuarios(nombreusuario)
        `)
        .gte('fechamantenimiento', fechaInicio.toISOString().split('T')[0])
        .lte('fechamantenimiento', fechaFin.toISOString().split('T')[0])
        .order('fechamantenimiento', { ascending: false });

      if (mostrarCompletados) {
        query = query.not('horadevolucion', 'is', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      setReportes(data || []);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los reportes');
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDateChange = (date, setDate, setShowPicker) => {
    setShowPicker(false);
    if (date) {
      setDate(date);
      fetchReportes();
    }
  };

  const toggleMostrarCompletados = () => {
    setMostrarCompletados(!mostrarCompletados);
    fetchReportes();
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
              <h1>Reporte de Mantenimientos ${mostrarCompletados ? 'Completados' : ''}</h1>
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
                Mostrando: ${mostrarCompletados ? 'Solo mantenimientos completados' : 'Todos los mantenimientos'}
              </p>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Hora Devolución</th>
                  <th>Técnico</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${reportes.map(item => `
                  <tr>
                    <td>${item.equipos?.nombreequipo || 'N/A'}</td>
                    <td>${item.tipomantenimiento}</td>
                    <td>${new Date(item.fechamantenimiento).toLocaleDateString('es-ES')}</td>
                    <td>${item.horadevolucion || 'N/A'}</td>
                    <td>${tecnicoNombre}</td>
                    <td>${item.accion || 'N/A'}</td>
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
              <p>Sistema de Gestión de Mantenimientos - ${new Date().getFullYear()}</p>
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
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{item.equipos?.nombreequipo || 'Equipo no encontrado'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.horadevolucion ? '#2ecc71' : '#e74c3c' }]}>
          <Text style={styles.statusText}>
            {item.horadevolucion ? 'COMPLETADO' : 'PENDIENTE'}
          </Text>
        </View>
      </View>
      
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="toolbox-outline" size={16} color="#4a6da7" />
        <Text style={styles.detailText}>Tipo: {item.tipomantenimiento}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <MaterialIcons name="date-range" size={16} color="#4a6da7" />
        <Text style={styles.detailText}>
          Fecha: {new Date(item.fechamantenimiento).toLocaleDateString('es-ES')}
        </Text>
      </View>
      
      {item.horadevolucion ? (
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="clock-check-outline" size={16} color="#4a6da7" />
          <Text style={styles.detailText}>Devolución: {item.horadevolucion}</Text>
        </View>
      ) : (
        <View style={styles.detailRow}>
          <MaterialIcons name="access-time" size={16} color="#4a6da7" />
          <Text style={styles.detailText}>Hora inicio: {item.horamantenimiento}</Text>
        </View>
      )}
      
      <View style={styles.detailRow}>
        <MaterialIcons name="person-outline" size={16} color="#4a6da7" />
        <Text style={styles.detailText}>
          Técnico: {tecnicoNombre}
        </Text>
      </View>
      
      {item.accion && (
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="hammer-wrench" size={16} color="#4a6da7" />
          <Text style={styles.detailText}>Acciones: {item.accion}</Text>
        </View>
      )}
      
      {item.observaciones && (
        <View style={styles.detailRow}>
          <MaterialIcons name="notes" size={16} color="#4a6da7" />
          <Text style={styles.detailText}>Observaciones: {item.observaciones}</Text>
        </View>
      )}
    </View>
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
          
          <Text style={styles.headerTitle}>Reporte de Mantenimientos</Text>
          
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
              onPress={() => {
                setNuevoTecnico(tecnicoNombre);
                setModalTecnicoVisible(true);
              }}
              style={styles.tecnicoButton}
              labelStyle={styles.buttonLabel}
            >
              <MaterialCommunityIcons name="account-wrench" size={18} color="#FFF" />
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
            <Text style={styles.filterLabel}>Rango de fechas:</Text>
            
            <TouchableOpacity 
              style={styles.filterToggle}
              onPress={toggleMostrarCompletados}
            >
              <MaterialCommunityIcons 
                name={mostrarCompletados ? "checkbox-marked-circle-outline" : "checkbox-blank-circle-outline"} 
                size={24} 
                color={mostrarCompletados ? "#4a6da7" : "#95a5a6"} 
              />
              <Text style={[styles.filterToggleText, mostrarCompletados && styles.filterToggleActive]}>
                Solo completados
              </Text>
            </TouchableOpacity>
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
          visible={modalTecnicoVisible} 
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalTecnicoVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Cambiar Nombre del Técnico</Text>
              
              <TextInput
                style={styles.input}
                value={nuevoTecnico}
                onChangeText={setNuevoTecnico}
                placeholder="Ingrese el nombre del técnico"
                placeholderTextColor="#95a5a6"
                autoFocus={true}
              />
              
              <View style={styles.modalButtons}>
                <Button 
                  mode="outlined" 
                  onPress={() => setModalTecnicoVisible(false)}
                  style={styles.cancelButton}
                  labelStyle={styles.cancelButtonText}
                >
                  Cancelar
                </Button>
                <Button 
                  mode="contained" 
                  onPress={saveTecnicoName}
                  style={styles.saveButton}
                  labelStyle={styles.saveButtonText}
                >
                  Guardar
                </Button>
              </View>
            </View>
          </View>
        </Modal>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Cargando reportes de mantenimiento...</Text>
          </View>
        ) : (
          <FlatList
            data={reportes}
            renderItem={renderItem}
            keyExtractor={item => item.idhistorialmantenimiento.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={fetchReportes}
                colors={['#3498db']}
                tintColor="#3498db"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="tools" size={48} color="#ecf0f1" />
                <Text style={styles.emptyText}>
                  {mostrarCompletados 
                    ? 'No hay mantenimientos completados en el período seleccionado' 
                    : 'No se encontraron mantenimientos en el período seleccionado'}
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
  tecnicoButton: {
    backgroundColor: '#8e44ad',
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
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterToggleText: {
    marginLeft: 8,
    color: '#95a5a6',
  },
  filterToggleActive: {
    color: '#4a6da7',
    fontWeight: '600',
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
  modalTitle: {
    fontSize: 18,
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
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFF',
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
});

export default ReporteMantenimientoScreen;