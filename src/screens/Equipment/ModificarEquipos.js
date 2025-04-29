import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  FlatList,
  Alert,
  Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const MAX_CONTENT_WIDTH = 1200;

const ModificarEquiposScreen = () => {
  const navigation = useNavigation();
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  
  // Estados para edición
  const [modalVisible, setModalVisible] = useState(false);
  const [currentEquipo, setCurrentEquipo] = useState(null);
  const [formData, setFormData] = useState({
    nombreequipo: '',
    idcategoria: '',
    estado: 'disponible',
    descripcion: ''
  });
  const [categorias, setCategorias] = useState([]);

  // Estados para eliminación
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [equipoToDelete, setEquipoToDelete] = useState(null);

  // Cargar equipos y categorías
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Obtener categorías
        const { data: categoriasData, error: categoriasError } = await supabase
          .from('categoriasequipos')
          .select('idcategoria, nombrecategoria')
          .order('nombrecategoria', { ascending: true });
        
        if (categoriasError) throw categoriasError;
        setCategorias(categoriasData || []);

        // Obtener equipos (excluyendo los en mantenimiento)
        await fetchEquipos();
        
      } catch (error) {
        console.error('Error al cargar datos:', error);
        Alert.alert('Error', 'No se pudieron cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const fetchEquipos = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('equipos')
        .select(`
          idequipo,
          nombreequipo,
          idcategoria,
          estado,
          descripcion,
          fechacreacion,
          categoriasequipos: idcategoria (nombrecategoria)
        `)
        .neq('estado', 'en mantenimiento')
        .order('nombreequipo', { ascending: true });
  
      if (error) throw error;
      
      setEquipos(data || []);
      
    } catch (error) {
      console.error('Error al cargar equipos:', error);
      Alert.alert('Error', error.message || 'Error al cargar equipos');
    } finally {
      setLoading(false);
    }
  };

  // Manejar edición de equipo
  const handleEdit = (equipo) => {
    setCurrentEquipo(equipo);
    setFormData({
      nombreequipo: equipo.nombreequipo,
      idcategoria: String(equipo.idcategoria),
      estado: equipo.estado,
      descripcion: equipo.descripcion || ''
    });
    setModalVisible(true);
  };

  const handleFormChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleUpdate = async () => {
    if (!formData.nombreequipo || !formData.idcategoria) {
      Alert.alert('Error', 'Por favor complete todos los campos obligatorios');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
    .from('equipos')
    .update({
      nombreequipo: formData.nombreequipo,
      idcategoria: Number(formData.idcategoria),
      estado: formData.estado,
      descripcion: formData.descripcion
      // Elimina fechaactualizacion si no existe
    })
    .eq('idequipo', currentEquipo.idequipo);

      if (error) throw error;
      
      Alert.alert('Éxito', 'Equipo actualizado correctamente');
      setModalVisible(false);
      fetchEquipos();
      
    } catch (error) {
      console.error('Error al actualizar equipo:', error);
      Alert.alert('Error', 'No se pudo actualizar el equipo');
    } finally {
      setLoading(false);
    }
  };

  // Manejar eliminación de equipo (marcar como no disponible)
  const handleDelete = (equipo) => {
    setEquipoToDelete(equipo);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('equipos')
        .update({ 
          estado: 'no disponible',
          fechaactualizacion: new Date().toISOString()
        })
        .eq('idequipo', equipoToDelete.idequipo);

      if (error) throw error;
      
      Alert.alert('Éxito', 'Equipo marcado como no disponible');
      setDeleteModalVisible(false);
      fetchEquipos();
      
    } catch (error) {
      console.error('Error al eliminar equipo:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del equipo');
    } finally {
      setLoading(false);
    }
  };

  // Color según estado (sin la opción de mantenimiento)
  const getStatusColor = (estado) => {
    switch(estado) {
      case 'disponible': return '#2ecc71';
      case 'prestado': return '#3498db';
      case 'reservado': return '#f39c12';
      case 'no disponible': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  // Renderizar cada item de equipo
  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.nombreequipo}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado) }]}>
          <Text style={styles.statusText}>{item.estado.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.itemDetails}>
        <Text style={styles.detailText}>
          <Icon name="category" size={16} color="#7f8c8d" /> {item.categoriasequipos?.nombrecategoria || 'Sin categoría'}
        </Text>
        <Text style={styles.detailText}>
          <Icon name="calendar-today" size={16} color="#7f8c8d" /> {new Date(item.fechacreacion).toLocaleDateString()}
        </Text>
        {item.fechacreacion && (
  <Text style={styles.detailText}>
    <Icon name="update" size={16} color="#7f8c8d" /> Creado: {new Date(item.fechacreacion).toLocaleDateString()}
  </Text>
)}
      </View>
      
      {item.descripcion && (
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.descripcion}
        </Text>
      )}
      
      <View style={styles.itemActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item)}
        >
          <Icon name="edit" size={18} color="white" />
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
          disabled={item.estado === 'no disponible'}
        >
          <Icon name="delete" size={18} color="white" />
          <Text style={styles.actionButtonText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header con menú */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.openDrawer()}
            style={styles.menuButton}
          >
            <Icon name="menu" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Administrar Equipos</Text>
          <TouchableOpacity 
            onPress={fetchEquipos}
            style={styles.refreshButton}
          >
            <Icon name="refresh" size={24} color="#2c3e50" />
          </TouchableOpacity>
        </View>

        {/* Controles de búsqueda y filtro */}
        <View style={styles.controlsContainer}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar equipos..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={fetchEquipos}
            >
              <Icon name="search" size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Filtrar por estado:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterEstado}
                onValueChange={(value) => {
                  setFilterEstado(value);
                  fetchEquipos();
                }}
                style={styles.picker}
              >
                <Picker.Item label="Todos" value="todos" />
                <Picker.Item label="Disponible" value="disponible" />
                <Picker.Item label="Prestado" value="prestado" />
                <Picker.Item label="Reservado" value="reservado" />
                <Picker.Item label="No disponible" value="no disponible" />
              </Picker>
            </View>
          </View>
        </View>

        {/* Lista de equipos */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a6da7" />
            <Text style={styles.loadingText}>Cargando equipos...</Text>
          </View>
        ) : equipos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="info-outline" size={48} color="#95a5a6" />
            <Text style={styles.emptyText}>No se encontraron equipos</Text>
            <TouchableOpacity 
              style={styles.refreshButtonLarge}
              onPress={fetchEquipos}
            >
              <Text style={styles.refreshButtonText}>Recargar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={equipos}
            renderItem={renderItem}
            keyExtractor={item => item.idequipo.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={fetchEquipos}
                colors={['#4a6da7']}
              />
            }
          />
        )}

        {/* Modal de Edición */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Editar Equipo</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre*</Text>
                <TextInput
                  style={styles.input}
                  value={formData.nombreequipo}
                  onChangeText={(text) => handleFormChange('nombreequipo', text)}
                  placeholder="Nombre del equipo"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Categoría*</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.idcategoria}
                    onValueChange={(value) => handleFormChange('idcategoria', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Seleccione categoría" value="" />
                    {categorias.map(cat => (
                      <Picker.Item 
                        key={cat.idcategoria} 
                        label={cat.nombrecategoria} 
                        value={String(cat.idcategoria)} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Estado*</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.estado}
                    onValueChange={(value) => handleFormChange('estado', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Disponible" value="disponible" />
                    <Picker.Item label="Prestado" value="prestado" />
                    <Picker.Item label="Reservado" value="reservado" />
                    <Picker.Item label="No disponible" value="no disponible" />
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.descripcion}
                  onChangeText={(text) => handleFormChange('descripcion', text)}
                  placeholder="Descripción del equipo"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleUpdate}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalButtonText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de Eliminación */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={deleteModalVisible}
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirmar Eliminación</Text>
              <Text style={styles.deleteMessage}>
                ¿Está seguro que desea marcar el equipo "{equipoToDelete?.nombreequipo}" como no disponible?
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setDeleteModalVisible(false)}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={confirmDelete}
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
    maxWidth: MAX_CONTENT_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  refreshButton: {
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    textAlign: 'center',
  },
  controlsContainer: {
    padding: isMobile ? 16 : 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchButton: {
    backgroundColor: '#4a6da7',
    width: 40,
    height: 40,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginRight: 8,
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 40,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#495057',
    marginTop: 16,
  },
  refreshButtonLarge: {
    marginTop: 16,
    backgroundColor: '#4a6da7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  listContent: {
    padding: isMobile ? 8 : 16,
  },
  itemContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#2c3e50',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
    width: '48%',
  },
  itemDescription: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
    marginBottom: 12,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#4a6da7',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: isMobile ? '90%' : '70%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteMessage: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#4a6da7',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default ModificarEquiposScreen;