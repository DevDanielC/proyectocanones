import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Alert,
  Animated,
  ScrollView,
  Platform,
  BackHandler,
  I18nManager
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// CONSTANTES
const { width, height } = Dimensions.get('window');
const MENU_WIDTH = Math.min(width * 0.75, 400); // 75% del ancho o máximo 400px
const COLOR_PRIMARIO = '#0062cc';
const COLOR_TEXTO = '#333333';
const COLOR_TEXTO_SECUNDARIO = '#666666';
const IS_RTL = I18nManager.isRTL;

const menuItems = [
  {
    title: 'Equipos',
    icon: 'devices-other',
    subItems: [
      { title: 'Solicitar Préstamo', icon: 'add', route: 'SolicitarPrestamo' },
      { title: 'Mis Devoluciones', icon: 'assignment-return', route: 'DevolucionesUsuarios' }
    ]
  },
];

const MenuUsuario = ({ navigation, onClose }) => {
  const insets = useSafeAreaInsets();
  const [expandedItem, setExpandedItem] = useState(null);
  const backPressCount = useRef(0);
  const menuRef = useRef(null);

  // Animaciones
  const [animationValues] = useState(() => {
    const values = {};
    menuItems.forEach(item => {
      if (item.subItems) {
        values[item.title] = new Animated.Value(0);
      }
    });
    return values;
  });

  // Manejador del botón de retroceso
  useEffect(() => {
    const backAction = () => {
      if (navigation.isFocused()) {
        if (backPressCount.current === 0) {
          backPressCount.current += 1;
          Alert.alert(
            'Salir',
            'Presiona nuevamente para salir de la aplicación',
            [
              {
                text: 'Cancelar',
                onPress: () => (backPressCount.current = 0),
                style: 'cancel',
              },
            ],
            { cancelable: true }
          );
          
          setTimeout(() => (backPressCount.current = 0), 2000);
          return true;
        }
        BackHandler.exitApp();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigation]);

  // Control de animaciones
  useEffect(() => {
    menuItems.forEach(item => {
      if (item.subItems) {
        Animated.timing(animationValues[item.title], {
          toValue: expandedItem === item.title ? 1 : 0,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    });
  }, [expandedItem]);

  const toggleItem = (title) => {
    setExpandedItem(prev => prev === title ? null : title);
  };

  const navigateTo = (route) => {
    if (!route) return;
    
    const availableRoutes = navigation.getState()?.routeNames || [];
    if (availableRoutes.includes(route)) {
      navigation.navigate(route);
      if (onClose) onClose();
    } else {
      Alert.alert('Ruta no disponible', `La pantalla "${route}" no está configurada`);
    }
  };

  const handleExitApp = () => {
    Alert.alert(
      'Salir de la aplicación',
      '¿Estás seguro que quieres salir de la aplicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', onPress: () => BackHandler.exitApp() },
      ],
      { cancelable: false }
    );
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
        level > 0 && styles.subMenuItemContainer,
        level > 0 && { marginLeft: IS_RTL ? 0 : 20, marginRight: IS_RTL ? 20 : 0 }
      ]}>
        <TouchableOpacity
          style={[
            styles.menuItem,
            level > 0 && styles.subMenuItem,
            isExpanded && !level && styles.activeMenuItem,
          ]}
          onPress={() => hasSubItems ? toggleItem(item.title) : navigateTo(item.route)}
          activeOpacity={0.7}
        >
          <Icon 
            name={item.icon} 
            size={22} 
            color={level > 0 ? COLOR_PRIMARIO : isExpanded ? COLOR_PRIMARIO : COLOR_TEXTO} 
            style={[styles.icon, IS_RTL && { transform: [{ scaleX: -1 }] }]} 
          />
          <Text style={[
            styles.menuItemText,
            level > 0 && styles.subMenuItemText,
            isExpanded && !level && styles.activeMenuItemText,
          ]}>
            {item.title}
          </Text>
          {hasSubItems && (
            <Icon 
              name={isExpanded ? 'expand-less' : 'expand-more'} 
              size={22} 
              color={isExpanded ? COLOR_PRIMARIO : COLOR_TEXTO_SECUNDARIO} 
              style={IS_RTL && { transform: [{ scaleX: -1 }] }}
            />
          )}
        </TouchableOpacity>

        {hasSubItems && (
          <Animated.View style={[styles.subItemsContainer, { height: heightAnim }]}>
            {item.subItems.map((subItem) => renderMenuItem(subItem, level + 1))}
          </Animated.View>
        )}
      </View>
    );
  };

  return (
    <>
      {/* Fondo semitransparente para cerrar el menú */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      
      {/* Menú (75% de la pantalla) */}
      <View 
        ref={menuRef}
        style={[
          styles.container, 
          { 
            width: MENU_WIDTH,
            paddingTop: insets.top, 
            paddingBottom: insets.bottom,
            [IS_RTL ? 'right' : 'left']: 0,
          }
        ]}
        onStartShouldSetResponder={() => true}
      >
        {/* Perfil del usuario */}
        <View style={styles.profileContainer}>
          <View style={styles.avatarPlaceholder}>
            <Icon name="person" size={24} color="#fff" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName} numberOfLines={1}>Usuario</Text>
            <Text style={styles.userRole}>Usuario</Text>
          </View>
        </View>

        {/* Menú principal */}
        <ScrollView 
          style={styles.menuScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.menuScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.menuItems}>
            {menuItems.map((item) => renderMenuItem(item))}
          </View>
        </ScrollView>

        {/* Botón para salir */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleExitApp}
          activeOpacity={0.8}
        >
          <Icon name="exit-to-app" size={20} color="#e53935" />
          <Text style={styles.logoutText}>Salir de la aplicación</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 99,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'absolute',
    top: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 20,
    zIndex: 100,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
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
  },
  userRole: {
    fontSize: 13,
    color: COLOR_PRIMARIO,
    fontWeight: '500',
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
    borderLeftWidth: IS_RTL ? 0 : 2,
    borderRightWidth: IS_RTL ? 2 : 0,
    borderLeftColor: IS_RTL ? 'transparent' : 'rgba(0, 98, 204, 0.2)',
    borderRightColor: IS_RTL ? 'rgba(0, 98, 204, 0.2)' : 'transparent',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.select({ ios: 14, android: 12 }),
    paddingHorizontal: 20,
  },
  subMenuItem: {
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    paddingLeft: IS_RTL ? 20 : 15,
    paddingRight: IS_RTL ? 15 : 20,
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
    textAlign: IS_RTL ? 'right' : 'left',
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#e53935',
    marginLeft: 10,
  },
});

export default MenuUsuario;