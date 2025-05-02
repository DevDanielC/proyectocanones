import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  ScrollView,
  BackHandler,
  I18nManager,
  useWindowDimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MenuUsuario = ({ navigation, onClose, temaOscuro, alternarTema }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const MENU_WIDTH = Math.min(width * 0.75, 275);
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const [activeRoute, setActiveRoute] = useState('');

  // Colores según el tema
  const colores = {
    fondo: temaOscuro ? '#1a202c' : '#ffffff',
    texto: temaOscuro ? '#e2e8f0' : '#1a202c',
    textoSecundario: temaOscuro ? '#a0aec0' : '#4a5568',
    borde: temaOscuro ? '#4a5568' : '#e2e8f0',
    primario: temaOscuro ? '#667eea' : '#4f46e5',
    overlay: temaOscuro ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)'
  };

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

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

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.title}
      style={[
        styles.menuItem,
        { backgroundColor: colores.fondo },
        activeRoute === item.route && { backgroundColor: `${colores.primario}20` }
      ]}
      onPress={() => handleNavigation(item.route)}
      activeOpacity={0.7}
    >
      <Icon 
        name={item.icon} 
        size={22} 
        color={activeRoute === item.route ? colores.primario : colores.texto} 
        style={styles.icon} 
      />
      <Text style={[
        styles.menuItemText,
        { color: colores.texto },
        activeRoute === item.route && { color: colores.primario, fontWeight: '600' }
      ]}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: colores.overlay }]}
        activeOpacity={0.5}
        onPress={handleClose}
      />
      
      <Animated.View
        style={[
          styles.container,
          {
            width: MENU_WIDTH,
            backgroundColor: colores.fondo,
            transform: [{ translateX: slideAnim }],
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 10,
          }
        ]}
      >
        <View style={[styles.profileContainer, { borderBottomColor: colores.borde }]}>
          <View style={[styles.avatar, { backgroundColor: colores.primario }]}>
            <Icon name="person" size={24} color="#fff" />
          </View>
          <View style={styles.profileText}>
            <Text style={[styles.name, { color: colores.texto }]} numberOfLines={1}>Usuario Actual</Text>
            <Text style={[styles.role, { color: colores.textoSecundario }]}>Rol: Usuario</Text>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.menuContent}
          showsVerticalScrollIndicator={false}
        >
          {menuItems.map(renderMenuItem)}

         
        </ScrollView>

        <TouchableOpacity 
          style={[styles.logoutButton, { borderTopColor: colores.borde }]}
          onPress={() => BackHandler.exitApp()}
        >
          <Icon name="exit-to-app" size={20} color="#e53935" />
          <Text style={styles.logoutText}>Cerrar aplicación</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  container: {
    flex: 1,
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
    marginBottom: 10,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
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
    marginBottom: 3,
    maxWidth: '85%',
  },
  role: {
    fontSize: 12,
  },
  menuContent: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  icon: {
    width: 28,
    marginRight: 15,
  },
  menuItemText: {
    fontSize: 15,
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderTopWidth: 1,
  },
  logoutText: {
    color: '#e53935',
    fontSize: 15,
    marginLeft: 12,
    fontWeight: '500',
  },
});

export default MenuUsuario;