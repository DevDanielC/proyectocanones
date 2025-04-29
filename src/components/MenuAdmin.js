import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  ScrollView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const COLOR_PRIMARIO = '#0062cc';
const COLOR_SECUNDARIO = '#004ba0';
const COLOR_TEXTO = '#333333';
const COLOR_TEXTO_SECUNDARIO = '#666666';

const menuItems = [
  {
    title: 'Inicio',
    icon: 'home',
    route: 'PrincipalAdmin'
  },
  {
    title: 'Gestión de Equipos',
    icon: 'inventory',
    subItems: [
   //   { title: 'Préstamos', icon: 'assignment', route: 'Prestamos' },
      { title: 'Reporte de préstamos', icon: 'history', route: 'HistorialPrestamos' },
     // por si se necesita
     //  { title: 'Devoluciones', icon: 'keyboard-return', route: 'Devoluciones' }
    ]
  },
  {
    title: 'Mantenimiento',
    icon: 'build',
    subItems: [
      { title: 'Registrar mantenimiento', icon: 'add-task', route: 'AgregarMantenimiento' },
      { title: 'Devolver del mantenimiento', icon: 'refresh', route: 'DevolverMantenimiento' },
      { title: 'Reporte de mantenimiento', icon: 'description', route: 'ReporteMantenimiento' }
    ]
  },
  {
    title: 'Usuarios',
    icon: 'people',
    subItems: [
      {title: 'Agregar admin', icon: 'person-add-alt', route: 'AgregarAdmin'},
      { title: 'Agregar usuarios', icon: 'person-add', route: 'AgregarUsuarios' },
      { title: 'Modificar usuarios', icon: 'edit', route: 'ModificarUsuarios' },
      { title: 'Ver usuarios', icon: 'list', route: 'VerUsuarios' }
    ]
  },
  {
    title: 'Control de Equipos',
    icon: 'devices-other',
    subItems: [
      { title: 'Agregar Equipos', icon: 'add', route: 'AgregarEquipos' },
      { title: 'Modificar Equipos', icon: 'edit', route: 'ModificarEquipos' },
      { title: 'Ver Equipos', icon: 'search', route: 'VerEquipos' }
    ]
  },
  {
    title: 'Categorías',
    icon: 'category',
    subItems: [
      { title: 'Agregar Categorías', icon: 'settings', route: 'AgregarCategorias' },
      { title: 'Ver categorías', icon: 'visibility', route: 'VerCategorias' }
    ]
  },

];

const MenuAdmin = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [expandedItem, setExpandedItem] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animationValues] = useState(() => {
    const values = {};
    menuItems.forEach(item => {
      if (item.subItems) {
        values[item.title] = new Animated.Value(0);
      }
    });
    return values;
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
          return;
        }
        
        const { data, error } = await supabase
          .from('usuarios')
          .select('nombreusuario, email, rol, fotoperfil')
          .eq('idusuario', session.user.id)
          .single();
          
        if (error) throw error;
        
        setUserData({
          name: data?.nombreusuario || session.user.email,
          email: data?.email || session.user.email,
          role: data?.rol || 'usuario',
          avatar: data?.fotoperfil || null
        });
        
      } catch (error) {
        Alert.alert(
          'Error', 
          'No se pudieron cargar los datos del usuario. Por favor, reinicie la aplicación.'
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();

    return () => {
      console.log('Componente MenuAdmin desmontado');
    };
  }, []);

  const toggleItem = (title) => {
    setExpandedItem(prev => prev === title ? null : title);
  };

  const animateItem = (title, toValue) => {
    if (animationValues[title]) {
      Animated.timing(animationValues[title], {
        toValue,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  };

  useEffect(() => {
    menuItems.forEach(item => {
      if (item.subItems) {
        animateItem(item.title, expandedItem === item.title ? 1 : 0);
      }
    });
  }, [expandedItem]);

  const navigateTo = (route) => {
    if (!route) return;
    
    try {
      const availableRoutes = navigation.getState()?.routeNames || [];
      
      if (availableRoutes.includes(route)) {
        navigation.navigate(route);
        navigation.closeDrawer();
      } else {
        Alert.alert(
          'Ruta no disponible',
          `La pantalla "${route}" no está configurada en la aplicación.`
        );
      }
    } catch (error) {
      console.error('Error al navegar:', error);
      Alert.alert('Error', 'Ocurrió un problema al intentar navegar');
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Solución universal para navegación post-logout
      if (Platform.OS === 'web') {
        // Para web, redirigimos directamente a la página de login
        window.location.href = '/login';
      } else {
        // Para móvil, usamos la navegación de React Navigation
        let rootNavigation = navigation;
        while (rootNavigation.getParent()) {
          rootNavigation = rootNavigation.getParent();
        }
        
        rootNavigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
      
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar la sesión');
      console.error('Error al cerrar sesión:', error);
    }
  };

  const renderMenuItem = (item, level = 0) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItem === item.title;
    const heightAnim = hasSubItems 
      ? animationValues[item.title]?.interpolate({
          inputRange: [0, 1],
          outputRange: [0, item.subItems.length * (Platform.OS === 'ios' ? 48 : 46)]
        })
      : 0;

    return (
      <View key={`${item.title}-${level}`} style={[
        styles.menuItemContainer, 
        level > 0 && styles.subMenuItemContainer
      ]}>
        <TouchableOpacity
          style={[
            styles.menuItem,
            level > 0 && styles.subMenuItem,
            isExpanded && !level && styles.activeMenuItem,
            Platform.OS === 'android' && styles.androidMenuItem
          ]}
          onPress={() => {
            if (hasSubItems) {
              toggleItem(item.title);
            } else {
              navigateTo(item.route);
            }
          }}
          activeOpacity={0.7}
        >
          <Icon 
            name={item.icon} 
            size={22} 
            color={
              level > 0 ? COLOR_PRIMARIO : 
              isExpanded ? COLOR_PRIMARIO : COLOR_TEXTO
            } 
            style={styles.icon} 
          />
          <Text style={[
            styles.menuItemText,
            level > 0 && styles.subMenuItemText,
            isExpanded && !level && styles.activeMenuItemText,
            Platform.OS === 'android' && styles.androidText
          ]}>
            {item.title}
          </Text>
          {hasSubItems && (
            <Icon 
              name={isExpanded ? 'expand-less' : 'expand-more'} 
              size={22} 
              color={isExpanded ? COLOR_PRIMARIO : COLOR_TEXTO_SECUNDARIO} 
            />
          )}
        </TouchableOpacity>

        {hasSubItems && (
          <Animated.View style={[styles.subItemsContainer, { height: heightAnim }]}>
            {item.subItems.map((subItem, index) => 
              renderMenuItem(subItem, level + 1)
            )}
          </Animated.View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[
        styles.loadingContainer, 
        { paddingTop: insets.top, paddingBottom: insets.bottom }
      ]}>
        <ActivityIndicator 
          size="large" 
          color={COLOR_PRIMARIO} 
          style={Platform.OS === 'android' ? { marginTop: 10 } : null}
        />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.container, 
      { 
        paddingTop: insets.top, 
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right
      }
    ]}>
      {/* Perfil del usuario */}
      <TouchableOpacity 
        style={styles.profileContainer}
        onPress={() => navigateTo('PerfilUsuario')}
        activeOpacity={0.8}
      >
        {userData?.avatar ? (
          <Image 
            source={{ uri: userData.avatar }} 
            style={styles.avatarImage} 
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Icon name="person" size={24} color="#fff" />
          </View>
        )}
        
        <View style={styles.profileInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {userData?.name || 'Usuario'}
          </Text>
          <Text style={styles.userRole}>
            {userData?.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 'Administrador'}
          </Text>
        </View>
        
        <Icon name="edit" size={20} color={COLOR_PRIMARIO} />
      </TouchableOpacity>

      {/* Menú principal */}
      <ScrollView 
        style={styles.menuScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuScrollContent}
      >
        <View style={styles.menuItems}>
          {menuItems.map((item) => renderMenuItem(item))}
        </View>
      </ScrollView>

      {/* Cerrar sesión */}
      <TouchableOpacity 
        style={[
          styles.logoutButton,
          Platform.OS === 'android' && styles.androidLogoutButton
        ]}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Icon name="logout" size={20} color="#e53935" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  },
  loadingText: {
    marginTop: 15,
    color: COLOR_TEXTO_SECUNDARIO,
    fontSize: 16
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: '#f0f0f0'
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLOR_PRIMARIO,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR_TEXTO,
    marginBottom: 3,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  userRole: {
    fontSize: 13,
    color: COLOR_PRIMARIO,
    fontWeight: '500',
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif',
      },
    }),
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    paddingBottom: 10,
  },
  menuItems: {
    paddingVertical: 5,
  },
  menuItemContainer: {
    overflow: 'hidden',
  },
  subMenuItemContainer: {
    backgroundColor: 'rgba(0, 98, 204, 0.05)',
    marginLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0, 98, 204, 0.2)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    paddingHorizontal: 20,
  },
  androidMenuItem: {
    paddingVertical: 10,
  },
  subMenuItem: {
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingLeft: 15,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(0, 98, 204, 0.1)',
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLOR_TEXTO,
    marginLeft: 15,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  androidText: {
    fontSize: 14,
  },
  subMenuItemText: {
    fontWeight: '400',
    color: COLOR_TEXTO_SECUNDARIO,
  },
  activeMenuItemText: {
    color: COLOR_PRIMARIO,
  },
  icon: {
    width: 24,
    textAlign: 'center',
  },
  subItemsContainer: {
    overflow: 'hidden',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  androidLogoutButton: {
    paddingVertical: 15,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#e53935',
    marginLeft: 10,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
});

export default MenuAdmin;