import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  SafeAreaView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { v4 as uuidv4 } from 'uuid';

const PerfilUsuario = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState({
    nombreusuario: '',
    email: '',
    rol: '',
    contrasena: '',
    fotoperfil: null,
    fotohorario: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigation.navigate('Login');
        return;
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('nombreusuario, email, rol, fotoperfil, fotohorario')
        .eq('idusuario', session.user.id)
        .single();

      if (error) throw error;

      setUserData({
        nombreusuario: data?.nombreusuario || '',
        email: data?.email || '',
        rol: data?.rol || '',
        contrasena: '',
        fotoperfil: data?.fotoperfil || null,
        fotohorario: data?.fotohorario || null
      });
      
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los datos del perfil');
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name, value) => {
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const selectImage = async (type) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos necesarios', 'Necesitamos acceso a tus fotos para cambiar las imágenes');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        handleChange(type, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const uploadImage = async (uri, pathPrefix) => {
    try {
      const BUCKET_NAME = 'imagenes-usuarios';
      
      const uniqueId = uuidv4();
      const fileExt = uri.split('.').pop().toLowerCase();
      const fileName = `${pathPrefix}_${uniqueId}.${fileExt}`;
      
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const { data, error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(fileName, decode(base64), {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: false,
          cacheControl: '3600'
        });
        
      if (error) throw error;
      
      const { data: { publicUrl } } = await supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('No se pudo subir la imagen. Verifica tu conexión y permisos.');
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      Alert.alert('Éxito', 'Contraseña actualizada correctamente');
      setPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      Alert.alert('Error', 'No se pudo cambiar la contraseña. Asegúrate que la contraseña actual es correcta y que la nueva contraseña tiene al menos 6 caracteres.');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigation.navigate('Login');
        return;
      }

      let fotoPerfilUrl = userData.fotoperfil;
      if (userData.fotoperfil && userData.fotoperfil.startsWith('file:')) {
        fotoPerfilUrl = await uploadImage(userData.fotoperfil, 'profile');
      }

      let fotoHorarioUrl = userData.fotohorario;
      if (userData.fotohorario && userData.fotohorario.startsWith('file:')) {
        fotoHorarioUrl = await uploadImage(userData.fotohorario, 'schedule');
      }

      const { error } = await supabase
        .from('usuarios')
        .update({
          nombreusuario: userData.nombreusuario,
          rol: userData.rol,
          fotoperfil: fotoPerfilUrl,
          fotohorario: fotoHorarioUrl
        })
        .eq('idusuario', session.user.id);

      if (error) throw error;

      Alert.alert('Éxito', 'Perfil actualizado correctamente');
      setEditMode(false);
      
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      Alert.alert(
        'Error', 
        error.message || 'Ocurrió un error al actualizar el perfil. Por favor intente nuevamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
          >
            <Icon name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          {editMode ? (
            <TouchableOpacity 
              onPress={saveProfile}
              style={styles.saveButton}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPress={() => setEditMode(true)}
              style={styles.editButton}
            >
              <Icon name="edit" size={20} color="#4a6da7" />
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.profileSection}>
              <TouchableOpacity 
                onPress={editMode ? () => selectImage('fotoperfil') : null}
                disabled={!editMode}
                activeOpacity={0.7}
              >
                <View style={styles.avatarContainer}>
                  {userData.fotoperfil ? (
                    <Image 
                      source={{ uri: userData.fotoperfil }} 
                      style={styles.avatar} 
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Icon name="person" size={40} color="#fff" />
                    </View>
                  )}
                  {editMode && (
                    <View style={styles.cameraIcon}>
                      <Icon name="photo-camera" size={20} color="#fff" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.card}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nombre</Text>
                  {editMode ? (
                    <TextInput
                      style={styles.input}
                      value={userData.nombreusuario}
                      onChangeText={(text) => handleChange('nombreusuario', text)}
                      placeholder="Ingresa tu nombre"
                    />
                  ) : (
                    <Text style={styles.textValue}>{userData.nombreusuario}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.textValue}>{userData.email}</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Rol</Text>
                  {editMode ? (
                    <View style={styles.roleContainer}>
                      {['admin', 'maestro', 'directivo', 'invitado'].map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleButton,
                            userData.rol === role && styles.selectedRoleButton
                          ]}
                          onPress={() => handleChange('rol', role)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.roleButtonText,
                            userData.rol === role && styles.selectedRoleButtonText
                          ]}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.textValue}>
                      {userData.rol.charAt(0).toUpperCase() + userData.rol.slice(1)}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Foto de Horario</Text>
                  {editMode ? (
                    <TouchableOpacity 
                      style={styles.imagePickerButton}
                      onPress={() => selectImage('fotohorario')}
                      activeOpacity={0.7}
                    >
                      {userData.fotohorario ? (
                        <Image 
                          source={{ uri: userData.fotohorario }} 
                          style={styles.scheduleImage} 
                        />
                      ) : (
                        <View style={styles.imagePickerPlaceholder}>
                          <Icon name="add-a-photo" size={24} color="#4a6da7" />
                          <Text style={styles.imagePickerText}>Seleccionar imagen</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : userData.fotohorario ? (
                    <Image 
                      source={{ uri: userData.fotohorario }} 
                      style={styles.scheduleImage} 
                    />
                  ) : (
                    <Text style={styles.textValue}>No hay imagen de horario</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.changePasswordButton}
                onPress={() => setPasswordModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.changePasswordText}>Cambiar contraseña</Text>
                <Icon name="keyboard-arrow-right" size={20} color="#4a6da7" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <Modal
          visible={passwordModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setPasswordModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Cambiar contraseña</Text>
              
              <Text style={styles.modalLabel}>Contraseña actual</Text>
              <TextInput
                style={styles.modalInput}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Ingresa tu contraseña actual"
                placeholderTextColor="#95a5a6"
              />
              
              <Text style={styles.modalLabel}>Nueva contraseña</Text>
              <TextInput
                style={styles.modalInput}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Ingresa nueva contraseña"
                placeholderTextColor="#95a5a6"
              />
              
              <Text style={styles.modalLabel}>Confirmar contraseña</Text>
              <TextInput
                style={styles.modalInput}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirma nueva contraseña"
                placeholderTextColor="#95a5a6"
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setPasswordModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={changePassword}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={[styles.modalButtonText, styles.confirmButtonText]}>Cambiar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

// Los estilos permanecen exactamente iguales que en la versión anterior
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
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  editButton: {
    padding: 4,
  },
  saveButton: {
    backgroundColor: '#4a6da7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  content: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  profileSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: '#95a5a6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4a6da7',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  textValue: {
    fontSize: 16,
    color: '#2c3e50',
    paddingVertical: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedRoleButton: {
    backgroundColor: '#4a6da7',
    borderColor: '#4a6da7',
  },
  roleButtonText: {
    color: '#2c3e50',
    fontSize: 14,
  },
  selectedRoleButtonText: {
    color: '#fff',
  },
  imagePickerButton: {
    marginTop: 8,
  },
  scheduleImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  imagePickerPlaceholder: {
    height: 100,
    borderWidth: 1,
    borderColor: '#4a6da7',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  imagePickerText: {
    marginTop: 8,
    color: '#4a6da7',
    fontSize: 14,
  },
  changePasswordButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  changePasswordText: {
    color: '#4a6da7',
    fontWeight: '500',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalInput: {
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: '#4a6da7',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#fff',
  },
});

export default PerfilUsuario;