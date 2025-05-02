import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  ScrollView,
  BackHandler,
  Modal,
  Image,
  Dimensions,
  Share,
  Platform,
  Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MenuUsuario = ({ navigation, onClose, temaOscuro, alternarTema }) => {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const MENU_WIDTH = Math.min(width * 0.75, 275);
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const [activeRoute, setActiveRoute] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // Colores según el tema
  const colores = {
    fondo: temaOscuro ? '#1a202c' : '#ffffff',
    texto: temaOscuro ? '#e2e8f0' : '#1a202c',
    textoSecundario: temaOscuro ? '#a0aec0' : '#4a5568',
    borde: temaOscuro ? '#4a5568' : '#e2e8f0',
    primario: temaOscuro ? '#667eea' : '#4f46e5',
    overlay: temaOscuro ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)',
    modalFondo: temaOscuro ? '#1e1e1e' : '#ffffff'
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

  const handleShareApp = async () => {
    try {
      const message = '¡Descarga nuestra aplicación!';
      const url = 'https://www.mediafire.com/file/3apn1aoubwdl7wn/AppUTR.apk/file'; // Reemplaza con tu URL real
      
      if (Platform.OS === 'android') {
        await Share.share({
          message: `${message} ${url}`,
          title: 'Compartir App'
        });
      } else {
        await Share.share({
          message: `${message} ${url}`,
          url: url,
          title: 'Compartir App'
        });
      }
    } catch (error) {
      console.error('Error al compartir:', error.message);
    }
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
    { 
      title: 'Compartir App',
      icon: 'share',
      action: () => setModalVisible(true)
    },
  ];

  const handleMenuItemPress = (item) => {
    if (item.route) {
      handleNavigation(item.route);
    } else if (item.action) {
      item.action();
    }
  };

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.title}
      style={[
        styles.menuItem,
        { backgroundColor: colores.fondo },
        activeRoute === item.route && { backgroundColor: `${colores.primario}20` }
      ]}
      onPress={() => handleMenuItemPress(item)}
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

        {/* Modal para compartir */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: colores.modalFondo }]}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Icon name="close" size={24} color={colores.texto} />
              </TouchableOpacity>
              
              <Text style={[styles.modalTitle, { color: colores.texto }]}>Compartir la App</Text>
              
              <Image
                source={require('../../assets/APPUTR-1024.png')}
                style={styles.qrImage}
                resizeMode="contain"
              />
              
              <Text style={[styles.modalText, { color: colores.textoSecundario }]}>
                Escanea este código para descargar la aplicación
              </Text>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: '#e0e0e0', marginRight: 10 }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={[styles.actionButtonText, { color: '#333' }]}>Cerrar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: colores.primario }]}
                  onPress={handleShareApp}
                >
                  <Icon name="share" size={18} color="#fff" style={styles.shareIcon} />
                  <Text style={[styles.actionButtonText, { color: '#fff' }]}>Compartir</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 350,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 5,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  qrImage: {
    width: 200,
    height: 200,
    marginVertical: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  shareIcon: {
    marginRight: 8,
  },
});

export default MenuUsuario;