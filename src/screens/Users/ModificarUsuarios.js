import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  SafeAreaView,
  FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isWeb = Platform.OS === 'web';

const ModificarUsuariosScreen = ({ navigation }) => {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [tipoPersona, setTipoPersona] = useState('maestro');
  const [estado, setEstado] = useState('activo');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [showTipoPersonaPicker, setShowTipoPersonaPicker] = useState(false);
  const [showEstadoPicker, setShowEstadoPicker] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [personalId, setPersonalId] = useState(null);
  const [personalList, setPersonalList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonal, setSelectedPersonal] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const tiposPersona = [
    { value: 'maestro', label: 'Maestro' },
    { value: 'directivo', label: 'Directivo' },
    { value: 'invitado', label: 'Invitado' }
  ];

  const estados = [
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' }
  ];

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile, error } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('idusuario', user.id)
          .single();
        
        if (!error && profile && profile.rol === 'admin') {
          setIsAdmin(true);
          fetchPersonal();
        }
      }
    };

    checkAdminStatus();
  }, []);

  const fetchPersonal = async () => {
    setLoadingList(true);
    try {
      let query = supabase
        .from('personal')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('nombre_completo', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setPersonalList(data || []);
    } catch (error) {
      showAlert('Error', 'No se pudo cargar la lista de personal');
      console.error('Error fetching personal:', error);
    } finally {
      setLoadingList(false);
    }
  };

  const handleSelectPersonal = (personal) => {
    setSelectedPersonal(personal);
    setPersonalId(personal.idpersonal);
    setNombreCompleto(personal.nombre_completo);
    setTipoPersona(personal.tipo_persona);
    setEstado(personal.estado);
  };

  const showAlert = (title, message) => {
    if (isWeb) {
      setSuccessMessage(message);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleGuardarCambios = async () => {
    if (!nombreCompleto.trim()) {
      showAlert('Error', 'Por favor ingrese el nombre completo');
      return;
    }
  
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('personal')
        .update({ 
          nombre_completo: nombreCompleto,
          tipo_persona: tipoPersona,
          estado: estado
        })
        .eq('idpersonal', personalId)
        .select();
  
      if (error) throw error;

      setSuccessMessage('Cambios guardados correctamente');
      setShowSuccessMessage(true);
      
      setTimeout(() => {
        setShowSuccessMessage(false);
        setSelectedPersonal(null);
        fetchPersonal();
      }, 2000);
    } catch (error) {
      let errorMessage = 'Ocurrió un error al guardar los cambios';
      if (error.message.includes('permission denied')) {
        errorMessage = 'No tienes permisos para realizar esta acción';
      }
      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarPersonal = async () => {
    if (isWeb) {
      const confirm = window.confirm(
        `¿Estás seguro de que deseas eliminar a ${selectedPersonal.nombre_completo}? Esta acción no se puede deshacer.`
      );
      if (!confirm) return;
    } else {
      Alert.alert(
        'Confirmar eliminación',
        `¿Estás seguro de que deseas eliminar a ${selectedPersonal.nombre_completo}? Esta acción no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', onPress: actuallyDeletePersonal, style: 'destructive' }
        ]
      );
      return;
    }
    
    await actuallyDeletePersonal();
  };

  const actuallyDeletePersonal = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('personal')
        .delete()
        .eq('idpersonal', personalId);
  
      if (error) throw error;

      setSuccessMessage('Personal eliminado correctamente');
      setShowSuccessMessage(true);
      
      setTimeout(() => {
        setShowSuccessMessage(false);
        setSelectedPersonal(null);
        fetchPersonal();
      }, 2000);
    } catch (error) {
      showAlert('Error', 'Ocurrió un error al eliminar el personal');
    } finally {
      setLoading(false);
    }
  };

  const renderPersonalItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.personalItem,
        selectedPersonal?.idpersonal === item.idpersonal && styles.selectedPersonalItem
      ]}
      onPress={() => handleSelectPersonal(item)}
    >
      <View style={styles.personalInfo}>
        <Text style={styles.personalName}>{item.nombre_completo}</Text>
        <View style={styles.personalDetails}>
          <Text style={styles.personalType}>
            {tiposPersona.find(t => t.value === item.tipo_persona)?.label}
          </Text>
          <View style={[
            styles.statusBadge,
            item.estado === 'activo' ? styles.activeBadge : styles.inactiveBadge
          ]}>
            <Text style={styles.statusText}>
              {item.estado === 'activo' ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>
      </View>
      <Icon name="chevron-right" size={24} color="#64748B" />
    </TouchableOpacity>
  );

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.unauthorizedContainer}>
        <View style={styles.unauthorizedContent}>
          <Icon name="warning" size={48} color="#EF4444" />
          <Text style={styles.unauthorizedTitle}>Acceso no autorizado</Text>
          <Text style={styles.unauthorizedText}>Solo administradores pueden modificar personal</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver al panel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.openDrawer()}
          style={styles.menuButton}
        >
          <Icon name="menu" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Administrar Personal</Text>
      </View>

      {isWeb && showSuccessMessage && (
        <View style={styles.webSuccessMessage}>
          <Icon name="check-circle" size={20} color="#10B981" />
          <Text style={styles.webSuccessText}>{successMessage}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.container}>
        {isWeb && (
          <View style={styles.webMessage}>
            <Text style={styles.webMessageText}>
              Estás utilizando la versión web del sistema de administración
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar personal..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={fetchPersonal}
            />
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={fetchPersonal}
            >
              <Icon name="search" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {loadingList ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Cargando personal...</Text>
            </View>
          ) : personalList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="people-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No se encontró personal</Text>
            </View>
          ) : (
            <FlatList
              data={personalList}
              renderItem={renderPersonalItem}
              keyExtractor={(item) => item.idpersonal.toString()}
              style={styles.listContainer}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>

        {selectedPersonal && (
          <View style={[styles.card, styles.editForm]}>
            <Text style={styles.title}>Editar Personal</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre Completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Juan Pérez López"
                value={nombreCompleto}
                onChangeText={setNombreCompleto}
                maxLength={100}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Cargo</Text>
              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={() => setShowTipoPersonaPicker(!showTipoPersonaPicker)}
              >
                <Text style={styles.pickerButtonText}>
                  {tiposPersona.find(t => t.value === tipoPersona)?.label}
                </Text>
                <Icon 
                  name={showTipoPersonaPicker ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
                  size={24} 
                  color="#64748B" 
                />
              </TouchableOpacity>

              {showTipoPersonaPicker && (
                <View style={styles.pickerOptions}>
                  {tiposPersona.map((tipo) => (
                    <TouchableOpacity
                      key={tipo.value}
                      style={[
                        styles.pickerOption,
                        tipoPersona === tipo.value && styles.selectedPickerOption
                      ]}
                      onPress={() => {
                        setTipoPersona(tipo.value);
                        setShowTipoPersonaPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        tipoPersona === tipo.value && styles.selectedPickerOptionText
                      ]}>
                        {tipo.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Estado</Text>
              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={() => setShowEstadoPicker(!showEstadoPicker)}
              >
                <Text style={styles.pickerButtonText}>
                  {estados.find(e => e.value === estado)?.label}
                </Text>
                <Icon 
                  name={showEstadoPicker ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
                  size={24} 
                  color="#64748B" 
                />
              </TouchableOpacity>

              {showEstadoPicker && (
                <View style={styles.pickerOptions}>
                  {estados.map((est) => (
                    <TouchableOpacity
                      key={est.value}
                      style={[
                        styles.pickerOption,
                        estado === est.value && styles.selectedPickerOption
                      ]}
                      onPress={() => {
                        setEstado(est.value);
                        setShowEstadoPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        estado === est.value && styles.selectedPickerOptionText
                      ]}>
                        {est.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
                onPress={handleGuardarCambios}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Guardar Cambios</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.deleteButton]}
                onPress={handleEliminarPersonal}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Eliminar Personal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setSelectedPersonal(null)}
                disabled={loading}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  unauthorizedContent: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  unauthorizedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  unauthorizedText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  container: {
    flexGrow: 1,
    padding: isMobile ? 16 : 24,
    backgroundColor: '#f8f9fa',
  },
  webMessage: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  webMessageText: {
    color: '#1E40AF',
    fontSize: 14,
  },
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isMobile ? 16 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    marginBottom: 16,
  },
  editForm: {
    marginTop: 16,
  },
  title: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  searchButton: {
    width: 50,
    height: 50,
    backgroundColor: '#3B82F6',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#64748B',
  },
  emptyContainer: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: '#64748B',
    fontSize: 16,
  },
  listContainer: {
    width: '100%',
  },
  listContent: {
    paddingBottom: 8,
  },
  personalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedPersonalItem: {
    backgroundColor: '#F0FDF4',
  },
  personalInfo: {
    flex: 1,
  },
  personalName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  personalDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personalType: {
    fontSize: 14,
    color: '#64748B',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  pickerButton: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerOptions: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedPickerOption: {
    backgroundColor: '#EFF6FF',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedPickerOptionText: {
    color: '#1D4ED8',
    fontWeight: '500',
  },
  buttonGroup: {
    marginTop: 24,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#374151',
  },
});

export default ModificarUsuariosScreen;