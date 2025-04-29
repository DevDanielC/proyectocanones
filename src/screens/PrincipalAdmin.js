import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const MAX_CONTENT_WIDTH = 1200;

const PrincipalAdminScreen = () => {
  const navigation = useNavigation();
  const [stats, setStats] = useState({
    usuarios: 0,
    equipos: 0,
    prestamos: 0,
    mantenimientos: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Contar usuarios totales
      const { count: usuarios } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact' });
      
      // Contar equipos totales
      const { count: equipos } = await supabase
        .from('equipos')
        .select('*', { count: 'exact' });
      
      // Contar préstamos/reservas activos
      const { count: prestamos } = await supabase
        .from('prestamos')
        .select('*', { count: 'exact' })
        .or('estado.eq.Prestado,estado.eq.Reservado');
      
      // Contar mantenimientos pendientes (basado en horadevolucion NULL)
      const { count: mantenimientos } = await supabase
        .from('historial_mantenimiento')
        .select('*', { count: 'exact' })
        .is('horadevolucion', null);
  
      setStats({
        usuarios: usuarios || 0,
        equipos: equipos || 0,
        prestamos: prestamos || 0,
        mantenimientos: mantenimientos || 0
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
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
          <Text style={styles.headerTitle}>Panel de Administración</Text>
        </View>
        
        {/* Contenido principal */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Estadísticas */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, {backgroundColor: '#e3f2fd'}]}>
                  <MaterialCommunityIcons name="account-group" size={24} color="#1976d2" />
                </View>
                <Text style={styles.statTitle}>Usuarios</Text>
                <Text style={styles.statValue}>{stats.usuarios}</Text>
                <Text style={styles.statSubtitle}>Registrados</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, {backgroundColor: '#e8f5e9'}]}>
                  <MaterialCommunityIcons name="desktop-classic" size={24} color="#388e3c" />
                </View>
                <Text style={styles.statTitle}>Equipos</Text>
                <Text style={styles.statValue}>{stats.equipos}</Text>
                <Text style={styles.statSubtitle}>Disponibles</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, {backgroundColor: '#fff8e1'}]}>
                  <MaterialCommunityIcons name="book-clock" size={24} color="#ffa000" />
                </View>
                <Text style={styles.statTitle}>Préstamos</Text>
                <Text style={styles.statValue}>{stats.prestamos}</Text>
                <Text style={styles.statSubtitle}>Activos</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, {backgroundColor: '#ffebee'}]}>
                  <MaterialCommunityIcons name="toolbox" size={24} color="#d32f2f" />
                </View>
                <Text style={styles.statTitle}>Mantenimientos</Text>
                <Text style={styles.statValue}>{stats.mantenimientos}</Text>
                <Text style={styles.statSubtitle}>Pendientes</Text>
              </View>
            </View>
            
            {/* Acciones rápidas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
              <View style={styles.quickActions}>
                <TouchableOpacity 
                  style={styles.quickAction}
                  onPress={() => navigation.navigate('AgregarUsuarios')}
                  activeOpacity={0.7}
                >
                  <View style={styles.quickActionIcon}>
                    <Icon name="person-add" size={20} color="#1976d2" />
                  </View>
                  <View>
                    <Text style={styles.quickActionText}>Agregar Usuario</Text>
                    <Text style={styles.quickActionSubtext}>Registrar nuevo usuario</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.quickAction}
                  onPress={() => navigation.navigate('AgregarEquipos')}
                  activeOpacity={0.7}
                >
                  <View style={styles.quickActionIcon}>
                    <Icon name="add-box" size={20} color="#1976d2" />
                  </View>
                  <View>
                    <Text style={styles.quickActionText}>Agregar Equipo</Text>
                    <Text style={styles.quickActionSubtext}>Nuevo equipo al inventario</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

// Los estilos permanecen igual que en tu código original
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  content: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: isMobile ? 16 : 24,
  },
  statsContainer: {
    flexDirection: isMobile ? 'column' : 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 32,
  },
  statCard: {
    width: isMobile ? '100%' : '23%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: isMobile ? 16 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#95a5a6',
    fontWeight: '400',
  },
  section: {
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
  quickActions: {
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: isMobile ? 14 : 16,
    marginBottom: isMobile ? 12 : 0,
    width: isMobile ? '100%' : '48%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickActionIcon: {
    marginRight: 16,
  },
  quickActionText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  quickActionSubtext: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
});

export default PrincipalAdminScreen;