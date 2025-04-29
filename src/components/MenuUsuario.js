import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  ScrollView,
  Platform,
  BackHandler,
  I18nManager,
  useWindowDimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLOR_PRIMARIO = '#0062cc';
const COLOR_TEXTO = '#333333';
const IS_RTL = I18nManager.isRTL;

const menuItems = [
  {
    title: 'Solicitar Préstamo',
    icon: 'devices-other',
    route: 'SolicitarPrestamo' 
  },
  { 
    title: 'Mis Devoluciones',
    icon: 'assignment-return',
    route: 'DevolucionesUsuarios'
  },
];

const MenuUsuario = ({ navigation, onClose }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const MENU_WIDTH = Math.min(width * 0.75, 275);
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const [activeRoute, setActiveRoute] = useState('');

  useEffect(() => {
    // Animación de entrada
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Obtener la ruta actual
    const state = navigation.getState();
    if (state && state.routes && state.routes.length > 0) {
      setActiveRoute(state.routes[state.index].name);
    }
  }, []);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: -MENU_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleNavigation = (route) => {
    if (route !== activeRoute) {
      navigation.navigate(route);
    }
    handleClose();
  };

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.title}
      style={[
        styles.menuItem,
        activeRoute === item.route && styles.activeMenuItem
      ]}
      onPress={() => handleNavigation(item.route)}
      activeOpacity={0.7}
    >
      <Icon 
        name={item.icon} 
        size={22} 
        color={activeRoute === item.route ? COLOR_PRIMARIO : COLOR_TEXTO} 
        style={styles.icon} 
      />
      <Text style={[
        styles.menuItemText,
        activeRoute === item.route && styles.activeMenuItemText
      ]}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={0.5}
        onPress={handleClose}
      />
      
      <Animated.View
        style={[
          styles.container,
          {
            width: MENU_WIDTH,
            transform: [{ translateX: slideAnim }],
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 10,
          }
        ]}
      >
        <View style={styles.profileContainer}>
          <View style={styles.avatar}>
            <Icon name="person" size={24} color="#fff" />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.name} numberOfLines={1}>Usuario Actual</Text>
            <Text style={styles.role}>Rol: Usuario</Text>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.menuContent}
          showsVerticalScrollIndicator={false}
        >
          {menuItems.map(renderMenuItem)}
        </ScrollView>

        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => BackHandler.exitApp()}
        >
          <Icon name="exit-to-app" size={20} color="#e53935" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 99,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 20,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: COLOR_PRIMARIO,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR_TEXTO,
    marginBottom: 3,
    maxWidth: '85%',
  },
  role: {
    fontSize: 12,
    color: '#666',
  },
  menuContent: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  activeMenuItem: {
    backgroundColor: 'rgba(0, 98, 204, 0.1)',
  },
  icon: {
    width: 28,
    marginRight: 15,
  },
  menuItemText: {
    fontSize: 15,
    color: COLOR_TEXTO,
    flex: 1,
  },
  activeMenuItemText: {
    color: COLOR_PRIMARIO,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 'auto',
  },
  logoutText: {
    color: '#e53935',
    fontSize: 15,
    marginLeft: 12,
    fontWeight: '500',
  },
});

export default MenuUsuario;