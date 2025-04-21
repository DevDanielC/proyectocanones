import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isWeb = Platform.OS === 'web';
const MAX_CONTENT_WIDTH = 1200;

const CategoriasScreen = () => {
  const navigation = useNavigation();
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [formData, setFormData] = useState({
    nombrecategoria: '',
    descripcion: ''
  });
  const [formMode, setFormMode] = useState('create');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      setRefreshing(true);
      setLoading(true);
      
      let query = supabase
        .from('categoriasequipos')
        .select('*');

      if (searchQuery) {
        query = query.ilike('nombrecategoria', `%${searchQuery}%`);
      }

      query = query.order('nombrecategoria', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      setCategorias(data || []);
      
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      showError('No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorMessage(true);
    setTimeout(() => setShowErrorMessage(false), 3000);
    
    if (isWeb) {
      console.error(message);
    }
  };

  const handleSearch = () => {
    fetchCategorias();
  };

  const openEditModal = (categoria) => {
    setSelectedCategoria(categoria);
    setFormData({
      nombrecategoria: categoria.nombrecategoria,
      descripcion: categoria.descripcion || ''
    });
    setFormMode('edit');
    setShowFormModal(true);
    setShowActionModal(false);
  };

  const openCreateModal = () => {
    setSelectedCategoria(null);
    setFormData({
      nombrecategoria: '',
      descripcion: ''
    });
    setFormMode('create');
    setShowFormModal(true);
  };

  const handleFormChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async () => {
    if (!formData.nombrecategoria.trim()) {
      showError('El nombre de la categoría es requerido');
      return;
    }

    try {
      setLoading(true);

      const categoriaData = {
        nombrecategoria: formData.nombrecategoria.trim(),
        descripcion: formData.descripcion.trim(),
        estado: 'activo'
      };

      if (formMode === 'edit' && selectedCategoria?.idcategoria) {
        const { data, error } = await supabase
          .from('categoriasequipos')
          .update(categoriaData)
          .eq('idcategoria', selectedCategoria.idcategoria)
          .select();

        if (error) throw error;
        console.log('Categoría actualizada:', data);
      } else {
        const { data, error } = await supabase
          .from('categoriasequipos')
          .insert(categoriaData)
          .select();

        if (error) throw error;
        console.log('Categoría creada:', data);
      }

      showSuccess(`Categoría ${formMode === 'edit' ? 'actualizada' : 'creada'} correctamente`);
      setShowFormModal(false);
      fetchCategorias();
      
    } catch (error) {
      console.error('Error al guardar:', error);
      showError(error.message || 'Error en la operación');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { count, error: countError } = await supabase
        .from('equipos')
        .select('*', { count: 'exact' })
        .eq('idcategoria', selectedCategoria.idcategoria);

      if (countError) throw countError;

      if (count > 0) {
        showError('No se puede eliminar la categoría porque tiene equipos asociados');
        setShowDeleteModal(false);
        setShowActionModal(false);
        return;
      }

      const { error } = await supabase
        .from('categoriasequipos')
        .delete()
        .eq('idcategoria', selectedCategoria.idcategoria);

      if (error) throw error;

      setShowDeleteModal(false);
      setShowActionModal(false);
      fetchCategorias();
      showSuccess('Categoría eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      showError('No se pudo eliminar la categoría');
    }
  };

  const getStatusColor = (estado) => {
    switch(estado) {
      case 'activo': return '#2ecc71';
      case 'inactivo': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const handleCategoriaPress = (categoria) => {
    setSelectedCategoria(categoria);
    setShowActionModal(true);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleCategoriaPress(item)}>
      <View style={styles.itemContainer}>
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.nombrecategoria}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado || 'activo') }]}>
              <Text style={styles.statusText}>{(item.estado || 'activo').toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.itemDetails}>
            {item.descripcion && (
              <Text style={styles.detailText} numberOfLines={2}>
                <Icon name="description" size={16} color="#7f8c8d" /> {item.descripcion}
              </Text>
            )}
            <Text style={styles.detailText}>
              <Icon name="calendar-today" size={16} color="#7f8c8d" /> {new Date(item.fechacreacion || new Date()).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>Cargando categorías...</Text>
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
          >
            <Icon name="menu" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestión de Categorías</Text>
          <TouchableOpacity 
            onPress={fetchCategorias}
            style={styles.refreshButton}
          >
            <Icon name="refresh" size={24} color="#2c3e50" />
          </TouchableOpacity>
        </View>

        {/* Mensajes flotantes (web) */}
        {isWeb && showSuccessMessage && (
          <View style={styles.webSuccessMessage}>
            <Icon name="check-circle" size={20} color="#10B981" />
            <Text style={styles.webSuccessText}>{successMessage}</Text>
          </View>
        )}

        {isWeb && showErrorMessage && (
          <View style={styles.webErrorMessage}>
            <Icon name="error" size={20} color="#EF4444" />
            <Text style={styles.webErrorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Search and Add */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar categorías..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor="#999"
          />
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={handleSearch}
          >
            <Icon name="search" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={openCreateModal}
          >
            <Icon name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {categorias.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="shape-outline" size={48} color="#95a5a6" />
            <Text style={styles.emptyText}>No se encontraron categorías</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery 
                ? 'Prueba con otros términos de búsqueda' 
                : 'No hay categorías registradas en el sistema'}
            </Text>
            <TouchableOpacity 
              style={styles.refreshButtonLarge}
              onPress={fetchCategorias}
            >
              <Text style={styles.refreshButtonText}>Recargar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={categorias}
            renderItem={renderItem}
            keyExtractor={item => item.idcategoria.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={fetchCategorias}
                colors={['#4a6da7']}
                tintColor="#4a6da7"
              />
            }
          />
        )}

        {/* Action Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showActionModal}
          onRequestClose={() => setShowActionModal(false)}
        >
          <View style={styles.actionModalOverlay}>
            <View style={styles.actionModalContent}>
              <Text style={styles.actionModalTitle}>{selectedCategoria?.nombrecategoria}</Text>
              
              <TouchableOpacity 
                style={[styles.actionModalButton, styles.editButton]}
                onPress={() => openEditModal(selectedCategoria)}
              >
                <Icon name="edit" size={20} color="white" />
                <Text style={styles.actionModalButtonText}>Editar Categoría</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionModalButton, styles.deleteButton]}
                onPress={() => {
                  setShowActionModal(false);
                  setShowDeleteModal(true);
                }}
              >
                <Icon name="delete" size={20} color="white" />
                <Text style={styles.actionModalButtonText}>Eliminar Categoría</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionModalButton, styles.cancelButton]}
                onPress={() => setShowActionModal(false)}
              >
                <Text style={styles.actionModalButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showDeleteModal}
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#e74c3c" />
              <Text style={styles.modalTitle}>¿Eliminar categoría?</Text>
              <Text style={styles.modalText}>
                Estás a punto de eliminar la categoría "{selectedCategoria?.nombrecategoria}". 
                Esta acción no se puede deshacer.
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleDelete}
                >
                  <Text style={styles.modalButtonText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Form Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showFormModal}
          onRequestClose={() => setShowFormModal(false)}
        >
          <View style={styles.formModalOverlay}>
            <ScrollView style={styles.formModalContent}>
              <Text style={styles.formModalTitle}>
                {formMode === 'edit' ? 'Editar Categoría' : 'Crear Nueva Categoría'}
              </Text>

              <Text style={styles.label}>Nombre de la categoría *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Laptops, Monitores, etc."
                value={formData.nombrecategoria}
                onChangeText={(text) => handleFormChange('nombrecategoria', text)}
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descripción opcional"
                value={formData.descripcion}
                onChangeText={(text) => handleFormChange('descripcion', text)}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />

              <View style={styles.formModalButtons}>
                <TouchableOpacity 
                  style={[styles.formModalButton, styles.cancelButton]}
                  onPress={() => setShowFormModal(false)}
                >
                  <Text style={styles.formModalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.formModalButton, styles.submitButton]}
                  onPress={handleFormSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.formModalButtonText}>
                      {formMode === 'edit' ? 'Guardar Cambios' : 'Crear Categoría'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Alertas para móvil */}
        {!isWeb && showSuccessMessage && (
          <View style={styles.mobileSuccessMessage}>
            <Icon name="check-circle" size={20} color="#10B981" />
            <Text style={styles.mobileMessageText}>{successMessage}</Text>
          </View>
        )}

        {!isWeb && showErrorMessage && (
          <View style={styles.mobileErrorMessage}>
            <Icon name="error" size={20} color="#EF4444" />
            <Text style={styles.mobileMessageText}>{errorMessage}</Text>
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
  searchContainer: {
    flexDirection: 'row',
    padding: isMobile ? 16 : 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  addButton: {
    backgroundColor: '#2ecc71',
    width: 40,
    height: 40,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
  refreshButtonLarge: {
    marginTop: 16,
    backgroundColor: '#4a6da7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  listContent: {
    padding: isMobile ? 8 : 16,
    paddingBottom: 24,
  },
  itemContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: isMobile ? 8 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  itemContent: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  itemDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  actionModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: isMobile ? '90%' : '60%',
    maxWidth: 400,
  },
  actionModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionModalButtonText: {
    color: 'white',
    marginLeft: 10,
    fontWeight: '500',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: isMobile ? '90%' : '80%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  confirmButton: {
    backgroundColor: '#e74c3c',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
    textAlign: 'center',
  },
  formModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  formModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: isMobile ? '90%' : '60%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  formModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  formModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButton: {
    backgroundColor: '#4a6da7',
  },
  formModalButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: '#f39c12',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  // Estilos para mensajes web
  webSuccessMessage: {
    position: 'fixed',
    top: 20,
    left: '50%',
    transform: [{ translateX: -180 }],
    width: 360,
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  webSuccessText: {
    color: '#065F46',
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  webErrorMessage: {
    position: 'fixed',
    top: 20,
    left: '50%',
    transform: [{ translateX: -180 }],
    width: 360,
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  webErrorText: {
    color: '#B91C1C',
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  // Estilos para mensajes móviles
  mobileSuccessMessage: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  mobileErrorMessage: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  mobileMessageText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CategoriasScreen;