// screens/Equipment/VerEquiposScreen.js
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
  Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const MAX_CONTENT_WIDTH = 1200;

const VerEquiposScreen = () => {
  const navigation = useNavigation();
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEquipo, setSelectedEquipo] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrContent, setQrContent] = useState('');

  useEffect(() => {
    fetchEquipos();
  }, []);

  const fetchEquipos = async () => {
    try {
      setRefreshing(true);
      setLoading(true);
      
      let query = supabase
        .from('equipos')
        .select(`
          idequipo,
          nombreequipo,
          idcategoria,
          estado,
          descripcion,
          fechacreacion,
          categoriasequipos: categoriasequipos!inner(nombrecategoria)
        `);

      if (searchQuery) {
        query = query.ilike('nombreequipo', `%${searchQuery}%`);
      }

      query = query.order('nombreequipo', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      setEquipos(data || []);
      
    } catch (error) {
      console.error('Error al cargar equipos:', error);
      Alert.alert('Error', 'No se pudieron cargar los equipos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = () => {
    fetchEquipos();
  };

  const handleShowQR = (equipo) => {
    const content = `equipos://detalles/${equipo.idequipo}`;
    setQrContent(content);
    setSelectedEquipo(equipo);
    setShowQRModal(true);
  };

  const handleNavigateToDetails = () => {
    setShowQRModal(false);
    navigation.navigate('DetallesEquipo', { equipoId: selectedEquipo.idequipo });
  };

  const getStatusColor = (estado) => {
    switch(estado) {
      case 'disponible': return '#2ecc71';
      case 'prestado': return '#3498db';
      case 'reservado': return '#f39c12';
      case 'no disponible': return '#e74c3c';
      case 'en mantenimiento': return '#9b59b6';
      default: return '#95a5a6';
    }
  };

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
      </View>
      
      {item.descripcion && (
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.descripcion}
        </Text>
      )}
      
      <View style={styles.itemActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.detailsButton]}
          onPress={() => navigation.navigate('DetallesEquipo', { equipoId: item.idequipo })}
        >
          <Icon name="info" size={18} color="white" />
          <Text style={styles.actionButtonText}>Detalles</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.qrButton]}
          onPress={() => handleShowQR(item)}
        >
          <Icon name="qr-code" size={18} color="white" />
          <Text style={styles.actionButtonText}>Ver QR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header con menú de administración */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.openDrawer()}
            style={styles.menuButton}
            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
          >
            <Icon name="menu" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Listado de Equipos</Text>
          <Text style={styles.headerSubtitle}>Total: {equipos.length} equipos</Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar equipos..."
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
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a6da7" />
            <Text style={styles.loadingText}>Cargando equipos...</Text>
          </View>
        ) : equipos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="inventory" size={48} color="#95a5a6" />
            <Text style={styles.emptyText}>No se encontraron equipos</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery 
                ? 'Prueba con otros términos de búsqueda' 
                : 'No hay equipos registrados en el sistema'}
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
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
                tintColor="#4a6da7"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay equipos que coincidan con tu búsqueda</Text>
              </View>
            }
          />
        )}

        <Modal
          animationType="slide"
          transparent={true}
          visible={showQRModal}
          onRequestClose={() => setShowQRModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Código QR del Equipo</Text>
              
              <View style={styles.qrContainer}>
                <QRCode
                  value={qrContent}
                  size={isMobile ? 250 : 300}
                  color="#2c3e50"
                  backgroundColor="white"
                />
              </View>
              
              <Text style={styles.equipoName}>{selectedEquipo?.nombreequipo}</Text>
              <Text style={styles.equipoCategory}>
                {selectedEquipo?.categoriasequipos?.nombrecategoria || 'Sin categoría'}
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.detailsButton]}
                  onPress={handleNavigateToDetails}
                >
                  <Icon name="info" size={18} color="white" />
                  <Text style={styles.modalButtonText}>Ver Detalles</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.closeButton]}
                  onPress={() => setShowQRModal(false)}
                >
                  <Icon name="close" size={18} color="white" />
                  <Text style={styles.modalButtonText}>Cerrar</Text>
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
    padding: isMobile ? 16 : 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  menuButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: isMobile ? 22 : 24,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#6c757d',
    fontSize: 16,
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
  refreshButton: {
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
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
  },
  itemDescription: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 12,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsButton: {
    backgroundColor: '#4a6da7',
  },
  qrButton: {
    backgroundColor: '#2c3e50',
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 14,
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
    marginBottom: 20,
    textAlign: 'center',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  equipoName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
    textAlign: 'center',
  },
  equipoCategory: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  closeButton: {
    backgroundColor: '#6c757d',
  },
  modalButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 16,
  },
});

export default VerEquiposScreen;