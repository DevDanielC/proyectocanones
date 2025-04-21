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
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const MAX_CONTENT_WIDTH = 1200;

const VerCategoriasScreen = () => {
  const navigation = useNavigation();
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCategorias = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from('categoriasequipos')
        .select('idcategoria, nombrecategoria, descripcion, estado, fechacreacion')
        .order('nombrecategoria', { ascending: true });

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const getStatusColor = (estado) => {
    switch(estado.toLowerCase()) {
      case 'activo': return '#2ecc71';
      case 'inactivo': return '#e74c3c';
      case 'mantenimiento': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.categoryCard}>
      <View style={styles.categoryIconContainer}>
        <MaterialCommunityIcons name="shape-outline" size={24} color="#4a6da7" />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.nombrecategoria}</Text>
        {item.descripcion && (
          <Text style={styles.categoryDescription} numberOfLines={2}>
            {item.descripcion}
          </Text>
        )}
        <View style={styles.categoryDetails}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado) }]}>
            <Text style={styles.statusText}>{item.estado.toUpperCase()}</Text>
          </View>
          <Text style={styles.categoryDate}>
            <Icon name="calendar-today" size={14} color="#7f8c8d" />{' '}
            {new Date(item.fechacreacion).toLocaleDateString('es-ES')}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>Cargando categorías...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, !isMobile && { maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' }]}>
        {/* Header con menú */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.openDrawer()}
            style={styles.menuButton}
            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
          >
            <Icon name="menu" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lista de Categorías</Text>
        </View>
        
        {/* Contenido principal */}
        <View style={styles.content}>
          {/* Estadísticas */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, {backgroundColor: '#e3f2fd'}]}>
                <MaterialCommunityIcons name="shape-outline" size={24} color="#1976d2" />
              </View>
              <Text style={styles.statTitle}>Total de Categorías  </Text>
              <Text style={styles.statValue}>{categorias.length}</Text>
            </View>
          </View>
          
          {/* Lista de categorías */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categorías Registradas</Text>
            
            <FlatList
              data={categorias}
              renderItem={renderItem}
              keyExtractor={(item) => item.idcategoria}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={fetchCategorias}
                  colors={['#4a6da7']}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="shape-outline" size={48} color="#95a5a6" />
                  <Text style={styles.emptyText}>No hay categorías registradas</Text>
                </View>
              }
              contentContainerStyle={categorias.length === 0 ? styles.emptyListContent : styles.listContent}
            />
          </View>
        </View>
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
    width: '100%',
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
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  categoryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  categoryDate: {
    fontSize: 12,
    color: '#7f8c8d',
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
});

export default VerCategoriasScreen;