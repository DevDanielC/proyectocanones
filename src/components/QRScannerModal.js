import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Linking,
  StyleSheet,
  Platform,
  SafeAreaView,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";

const QRScannerModal = ({ visible, onClose, onScan }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState("back");

  useEffect(() => {
    let isMounted = true;

    const requestCameraPermission = async () => {
      try {
        // Primero verifica si ya tenemos permisos
        const { status } = await Camera.getCameraPermissionsAsync();
        
        if (status !== 'granted') {
          // Si no tenemos permisos, los solicitamos
          const { status: newStatus } = await Camera.requestCameraPermissionsAsync();
          if (isMounted) setHasPermission(newStatus === 'granted');
        } else {
          if (isMounted) setHasPermission(true);
        }
      } catch (error) {
        console.error("Error al solicitar permisos:", error);
        if (isMounted) setHasPermission(false);
      }
    };

    if (visible) {
      requestCameraPermission();
    } else {
      setScanned(false);
    }

    return () => {
      isMounted = false;
    };
  }, [visible]);

  const handleBarCodeScanned = ({ data }) => {
    if (!cameraReady || scanned || !data) return;
  
    try {
      // Extraer solo el ID numérico de la URL (si viene en formato URL)
      let equipoId = data;
      
      // Si es una URL, extraemos el ID
      if (data.startsWith('equipos://detalles/')) {
        equipoId = data.split('/').pop(); // Obtiene el último segmento de la URL
      }
  
      // Validar que sea un número
      if (!/^\d+$/.test(equipoId)) {
        throw new Error('Formato de ID inválido');
      }
  
      setScanned(true);
      onScan(equipoId); // Enviamos solo el ID numérico
      onClose();
    } catch (error) {
      console.error("Error al procesar código QR:", error);
      Alert.alert("Error", "El código QR escaneado no es válido");
      setScanned(false); // Permite volver a escanear
    }
  };

  const handleOpenSettings = async () => {
    await Linking.openSettings();
    onClose();
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === "back" ? "front" : "back"));
  };

  if (!visible) return null;

  if (hasPermission === null) {
    return (
      <Modal transparent={true} visible={true} onRequestClose={onClose}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color="#4a6da7" />
          <Text style={styles.loadingText}>
            Solicitando permiso para la cámara...
          </Text>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal transparent={true} visible={true} onRequestClose={onClose}>
        <View style={styles.permissionContainer}>
          <MaterialIcons name="no-photography" size={50} color="#dc3545" />
          <Text style={styles.permissionText}>Acceso a la cámara denegado</Text>
          <Text style={styles.permissionHint}>
            Por favor habilita los permisos de cámara en la configuración de tu
            dispositivo
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleOpenSettings}>
            <Text style={styles.buttonText}>Abrir Configuración</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <SafeAreaView style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          onCameraReady={() => setCameraReady(true)}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.frame}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            <Text style={styles.scanText}>Escanea el código QR del equipo</Text>
          </View>
        </CameraView>

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={30} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.flipButton}
          onPress={toggleCameraFacing}
        >
          <MaterialIcons name="flip-camera-ios" size={30} color="white" />
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 20,
  },
  loadingText: {
    color: "white",
    marginTop: 20,
    fontSize: 16,
  },
  permissionText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    textAlign: "center",
  },
  permissionHint: {
    color: "white",
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  button: {
    backgroundColor: "#4a6da7",
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
    width: "80%",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    padding: 15,
    marginTop: 15,
    width: "80%",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  frame: {
    width: 250,
    height: 250,
    position: "relative",
    marginBottom: 30,
  },
  cornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 50,
    height: 50,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: "white",
  },
  cornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 50,
    height: 50,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderColor: "white",
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 50,
    height: 50,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: "white",
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 50,
    height: 50,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderColor: "white",
  },
  scanText: {
    color: "white",
    fontSize: 16,
    marginTop: 20,
  },
  closeButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 10,
  },
  flipButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 10,
  },
});

export default QRScannerModal;