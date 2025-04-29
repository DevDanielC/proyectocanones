// DEBE SER LA PRIMERA LÍNEA DEL ARCHIVO
import 'react-native-gesture-handler';
import React from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import DetallesEquipoScreen from '../screens/DetallesEquipoScreen';

// Pantallas Principales
import PrincipalAdminScreen from '../screens/PrincipalAdmin';
import SolicitarPrestamoScreen from '../screens/PrincipalPrestamoUsuario';

// Componentes
import CustomDrawerContent from '../components/MenuAdmin';
import CustomDrawerContentUser from '../components/MenuUsuario';

// Pantallas de Operaciones
import PrestamosScreen from '../screens/Operations/PrestamosScreen';
import HistorialPrestamosScreen from '../screens/Reports/HistorialPrestamosScreen';
import DevolucionesScreen from '../screens/Operations/DevolucionesScreen';
import PrestamosUsuariosScreen from '../screens/Operations/UsuarioPrestamos';
import DevolucionesUsuariosScreen from '../screens/Operations/UsuarioDevoluciones';

// Pantallas de Mantenimiento
import AgregarMantenimientoScreen from '../screens/Maintenance/AgregarMantenimiento';
import DevolverMantenimientoScreen from '../screens/Maintenance/DevolverMantenimiento';
import ReporteMantenimientoScreen from '../screens/Reports/ReporteMantenimiento';

// Pantallas de Usuarios
import AgregarAdminScreen  from '../screens/Users/AgregarAdmin';
import AgregarUsuariosScreen from '../screens/Users/AgregarUsuarios';
import ModificarUsuariosScreen from '../screens/Users/ModificarUsuarios';
import VerUsuariosScreen from '../screens/Users/VerUsuarios';
import PerfilUsuario from '../screens/Users/PerfilUsuario';

// Pantallas de Equipos
import AgregarEquiposScreen from '../screens/Equipment/AgregarEquipos';
import ModificarEquiposScreen from '../screens/Equipment/ModificarEquipos';
import VerEquiposScreen from '../screens/Equipment/VerEquipos';

// Pantallas de Categorías
import AgregarCategoriasScreen from '../screens/Categories/AgregarCategorias';
import VerCategoriasScreen from '../screens/Categories/VerCategorias';

// Pantallas Extras
import SancionesScreen from '../screens/Extras/Sanciones';
import ManualScreen from '../screens/Extras/Manual';

// Importación condicional de pantallas de autenticación
let AuthScreen, LoginScreen, RegisterScreen;

if (Platform.OS === 'web') {
  AuthScreen = require('../screens/Auth/AuthScreen').default;
  LoginScreen = require('../screens/Auth/LoginScreen').default;
  RegisterScreen = require('../screens/Auth/RegisterScreen').default;
} else {
  // Componentes vacíos para móvil
  AuthScreen = () => null;
  LoginScreen = () => null;
  RegisterScreen = () => null;
}

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Configuración completa del drawer navigator para el área administrativa
const AdminDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: 280,
        },
        drawerHideStatusBarOnOpen: false,
        overlayColor: 'transparent',
        drawerStatusBarAnimation: 'fade',
      }}
    >
      <Drawer.Screen 
        name="PrincipalAdmin" 
        component={PrincipalAdminScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Inicio Administrador'
        }}
      />
      <Drawer.Screen 
        name="Prestamos" 
        component={PrestamosScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Gestión de Préstamos'
        }}
      />
      <Drawer.Screen 
        name="HistorialPrestamos" 
        component={HistorialPrestamosScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Historial de Préstamos'
        }}
      />
      <Drawer.Screen 
        name="Devoluciones" 
        component={DevolucionesScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Devoluciones'
        }}
      />
      <Drawer.Screen 
        name="AgregarMantenimiento" 
        component={AgregarMantenimientoScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Registrar Mantenimiento'
        }}
      />
      <Drawer.Screen 
        name="DevolverMantenimiento" 
        component={DevolverMantenimientoScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Devolver de Mantenimiento'
        }}
      />
      <Drawer.Screen 
        name="ReporteMantenimiento" 
        component={ReporteMantenimientoScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Reportes de Mantenimiento'
        }}
      />
      <Drawer.Screen
        name="AgregarAdmin" 
        component={AgregarAdminScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Agregar Administrador'
        }}
      />
      <Drawer.Screen 
        name="AgregarUsuarios" 
        component={AgregarUsuariosScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Agregar Usuarios'
        }}
      />
      <Drawer.Screen 
        name="ModificarUsuarios" 
        component={ModificarUsuariosScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Modificar Usuarios'
        }}
      />
      <Drawer.Screen 
        name="VerUsuarios" 
        component={VerUsuariosScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Listado de Usuarios'
        }}
      />
      <Drawer.Screen 
        name="AgregarEquipos" 
        component={AgregarEquiposScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Agregar Equipos'
        }}
      />
      <Drawer.Screen 
        name="ModificarEquipos" 
        component={ModificarEquiposScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Modificar Equipos'
        }}
      />
      <Drawer.Screen 
        name="VerEquipos" 
        component={VerEquiposScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Inventario de Equipos'
        }}
      />
      <Drawer.Screen 
        name="AgregarCategorias" 
        component={AgregarCategoriasScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Agregar Categorías'
        }}
      />
      <Drawer.Screen 
        name="VerCategorias" 
        component={VerCategoriasScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Listado de Categorías'
        }}
      />
      <Drawer.Screen 
        name="Sanciones" 
        component={SancionesScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Gestión de Sanciones'
        }}
      />
      <Drawer.Screen 
        name="Manual" 
        component={ManualScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Manual del Sistema'
        }}
      />
      <Drawer.Screen 
        name="PerfilUsuario" 
        component={PerfilUsuario} 
        options={{ 
          unmountOnBlur: true,
          title: 'Mi Perfil'
        }}
      />
    </Drawer.Navigator>
  );
};

// Configuración completa del drawer navigator para el área de usuario
const UserDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContentUser {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: 280,
        },
        drawerHideStatusBarOnOpen: false,
        overlayColor: 'transparent',
        drawerStatusBarAnimation: 'fade',
      }}
    >
      <Drawer.Screen 
        name="SolicitarPrestamo" 
        component={SolicitarPrestamoScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Solicitar Préstamo'
        }}
      />
      <Drawer.Screen 
        name="PrestamosUsuarios" 
        component={PrestamosUsuariosScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Mis Préstamos'
        }}
      />
      <Drawer.Screen 
        name="DevolucionesUsuarios" 
        component={DevolucionesUsuariosScreen} 
        options={{ 
          unmountOnBlur: true,
          title: 'Mis Devoluciones'
        }}
      />
      <Drawer.Screen 
        name="PerfilUsuario" 
        component={PerfilUsuario} 
        options={{ 
          unmountOnBlur: true,
          title: 'Mi Perfil'
        }}
      />
    </Drawer.Navigator>
  );
};

// Configuración completa de deep linking
const config = {
  screens: {
    Auth: 'auth',
    Login: 'login',
    Register: 'register',
    AdminArea: {
      path: 'admin',
      screens: {
        PrincipalAdmin: 'inicio',
        VerEquipos: {
          path: 'equipos',
          screens: {
            DetallesEquipo: ':equipoId',
          },
        },
      },
    },
    UserArea: {
      path: 'user',
      screens: {
        SolicitarPrestamo: 'prestamos/solicitar',
        PrestamosUsuarios: 'prestamos/mis-prestamos',
      },
    },
    DetallesEquipo: 'equipos/:equipoId',
  },
};

const linking = {
  prefixes: ['tuapp://', 'https://tuapp.com'],
  config,
};

export default function App() {
  // Ruta inicial condicional
  const initialRouteName = Platform.OS === 'web' ? 'Auth' : 'UserArea';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer linking={linking}>
        <Stack.Navigator 
          initialRouteName={initialRouteName}
          screenOptions={{
            animation: 'fade',
            animationDuration: 200,
          }}
        >
          {/* Pantallas de Auth (solo para web) */}
          {Platform.OS === 'web' && (
            <>
              <Stack.Screen 
                name="Auth" 
                component={AuthScreen} 
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="Login" 
                component={LoginScreen} 
                options={{ 
                  headerShown: false,
                  animation: 'slide_from_right'
                }}
              />
              <Stack.Screen 
                name="Register" 
                component={RegisterScreen} 
                options={{ 
                  headerShown: false,
                  animation: 'slide_from_right'
                }}
              />
            </>
          )}
          
          {/* Área administrativa */}
          <Stack.Screen 
            name="AdminArea" 
            component={AdminDrawerNavigator} 
            options={{ 
              headerShown: false,
              animation: 'fade'
            }}
          />
          
          {/* Área de usuario (pantalla principal para móvil) */}
          <Stack.Screen 
            name="UserArea" 
            component={UserDrawerNavigator} 
            options={{ 
              headerShown: false,
              animation: 'fade'
            }}
          />

          {/* Pantalla de detalles de equipo */}
          <Stack.Screen 
            name="DetallesEquipo" 
            component={DetallesEquipoScreen} 
            options={{ 
              headerShown: false,
              animation: 'slide_from_right'
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}