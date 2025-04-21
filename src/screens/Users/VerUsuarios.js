import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const MAX_CONTENT_WIDTH = 1200;

const VerPersonalScreen = () => {
  const navigation = useNavigation();
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchPersonal = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from('personal')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPersonal(data || []);
    } catch (error) {
      console.error('Error fetching personal:', error);
      Alert.alert('Error', 'No se pudo cargar el personal');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPersonal();
  }, []);

  const getTipoPersonaColor = (tipo) => {
    switch(tipo.toLowerCase()) {
      case 'maestro': return '#3498db';
      case 'directivo': return '#9b59b6';
      case 'invitado': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  const getEstadoColor = (estado) => {
    return estado.toLowerCase() === 'activo' ? '#2ecc71' : '#e74c3c';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.personCard}
      onPress={() => {
        setSelectedPerson(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.personAvatar}>
        <Icon 
          name={item.tipo_persona === 'maestro' ? 'school' : 
                item.tipo_persona === 'directivo' ? 'supervisor-account' : 'person'} 
          size={24} 
          color="#4a6da7" 
        />
      </View>
      <View style={styles.personInfo}>
        <Text style={styles.personName}>{item.nombre_completo}</Text>
        <View style={styles.badgeContainer}>
          <View style={[styles.typeBadge, { backgroundColor: getTipoPersonaColor(item.tipo_persona) }]}>
            <Text style={styles.badgeText}>{item.tipo_persona.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
            <Text style={styles.badgeText}>{item.estado.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      <Icon name="chevron-right" size={24} color="#64748B" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>Cargando personal...</Text>
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
            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
          >
            <Icon name="menu" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lista de Personal</Text>
        </View>
        
        {/* Contenido principal */}
        <View style={styles.content}>
          {/* Estadísticas */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, {backgroundColor: '#e3f2fd'}]}>
                <Icon name="people" size={24} color="#1976d2" />
              </View>
              <Text style={styles.statTitle}>Total de Personal  </Text>
              <Text style={styles.statValue}>{personal.length}</Text>
            </View>
          </View>
          
          {/* Lista de personal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Registrado</Text>
            
            <FlatList
              data={personal}
              renderItem={renderItem}
              keyExtractor={(item) => item.idpersonal.toString()}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={fetchPersonal}
                  colors={['#4a6da7']}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="people-outline" size={48} color="#95a5a6" />
                  <Text style={styles.emptyText}>No hay personal registrado</Text>
                </View>
              }
              contentContainerStyle={personal.length === 0 ? styles.emptyListContent : styles.listContent}
            />
          </View>
        </View>

        {/* Modal de detalles */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {selectedPerson && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Detalles del Personal</Text>
                    <TouchableOpacity 
                      onPress={() => setModalVisible(false)}
                      style={styles.closeButton}
                    >
                      <Icon name="close" size={24} color="#6c757d" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalContent}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Nombre Completo:</Text>
                      <Text style={styles.detailValue}>{selectedPerson.nombre_completo}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tipo de Persona:</Text>
                      <View style={[styles.typeBadge, { backgroundColor: getTipoPersonaColor(selectedPerson.tipo_persona) }]}>
                        <Text style={styles.badgeText}>{selectedPerson.tipo_persona.toUpperCase()}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Estado:</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getEstadoColor(selectedPerson.estado) }]}>
                        <Text style={styles.badgeText}>{selectedPerson.estado.toUpperCase()}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Fecha de Registro:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedPerson.created_at)}</Text>
                    </View>
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.closeModalButton]}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={[styles.modalButtonText, {color: '#2c3e50'}]}>Cerrar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
  content: {
    flex: 1,
    padding: isMobile ? 16 : 24,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statTitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2c3e50',
  },
  section: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: isMobile ? 16 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: isMobile ? 16 : 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  personAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: isMobile ? '90%' : '60%',
    maxWidth: 600,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 100,
    alignItems: 'center',
  },
  closeModalButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VerPersonalScreen;