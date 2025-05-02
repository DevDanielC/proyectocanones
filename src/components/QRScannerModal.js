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
  Alert,
  Dimensions
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";

const QRScannerModal = ({ visible, onClose, onScan }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState("back");
  const [isProcessing, setIsProcessing] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

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
      setIsProcessing(false); // Resetear estado al abrir
      setTorchEnabled(false); // Apagar flash al abrir
    }

    return () => {
      isMounted = false;
    };
  }, [visible]);

  const handleBarCodeScanned = async ({ data }) => {
    if (!cameraReady || isProcessing || !data) return;

    setIsProcessing(true); // Bloquear nuevos escaneos mientras procesamos

    try {
      let equipoId = data;
      
      // Extraer ID si es una URL
      if (data.startsWith('http') || data.startsWith('equipos://')) {
        const urlParts = data.split('/');
        equipoId = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
      }

      // Validación del ID
      if (!equipoId || !/^[a-zA-Z0-9-_]+$/.test(equipoId)) {
        throw new Error('Formato de ID inválido');
      }

      // Mostrar confirmación antes de procesar
      Alert.alert(
        "Código escaneado",
        `ID detectado: ${equipoId}\n\n¿Deseas procesar este código?`,
        [
          {
            text: "Cancelar",
            onPress: () => {
              setIsProcessing(false);
            },
            style: "cancel"
          },
          {
            text: "Confirmar",
            onPress: () => {
              onScan(equipoId);
              setIsProcessing(false);
            }
          }
        ],
        { cancelable: true, onDismiss: () => setIsProcessing(false) }
      );

    } catch (error) {
      console.error("Error al procesar QR:", error);
      Alert.alert(
        "Error",
        "El código QR escaneado no es válido. Por favor intenta nuevamente.",
        [{ text: "OK", onPress: () => setIsProcessing(false) }]
      );
    }
  };

  const handleOpenSettings = async () => {
    await Linking.openSettings();
    onClose();
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === "back" ? "front" : "back"));
    setTorchEnabled(false); // Apagar flash al cambiar cámara
  };

  const toggleTorch = () => {
    setTorchEnabled(current => !current);
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
            Para escanear códigos QR, necesitamos acceso a la cámara.
          </Text>
          <Text style={styles.permissionSubHint}>
            Por favor habilita los permisos en la configuración de tu dispositivo.
          </Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleOpenSettings}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Abrir Configuración</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Volver</Text>
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
          onBarcodeScanned={isProcessing ? undefined : handleBarCodeScanned}
          onCameraReady={() => setCameraReady(true)}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "pdf417", "ean13", "upc_a", "code39"],
          }}
          enableTorch={torchEnabled}
        >
          <View style={styles.overlay}>
            <View style={styles.frame}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            
            <Text style={styles.scanText}>
              {isProcessing ? "Procesando código..." : "Enfoca el código QR dentro del marco"}
            </Text>
            
            {isProcessing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.processingText}>Validando código...</Text>
              </View>
            )}
          </View>
        </CameraView>

        {/* Controles de la cámara */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={toggleTorch}
            disabled={facing === 'front'}
          >
            <MaterialIcons 
              name={torchEnabled ? "flash-on" : "flash-off"} 
              size={30} 
              color={facing === 'front' ? 'rgba(255,255,255,0.3)' : 'white'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={toggleCameraFacing}
          >
            <MaterialIcons name="flip-camera-ios" size={30} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={onClose}
          >
            <MaterialIcons name="close" size={30} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const windowWidth = Dimensions.get('window').width;
const frameSize = windowWidth * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.9)",
    padding: 30,
  },
  loadingText: {
    color: "white",
    marginTop: 20,
    fontSize: 16,
    textAlign: "center",
  },
  permissionText: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20,
    textAlign: "center",
  },
  permissionHint: {
    color: "white",
    fontSize: 16,
    marginTop: 15,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  permissionSubHint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#4a6da7",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginTop: 30,
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    padding: 15,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  frame: {
    width: frameSize,
    height: frameSize,
    position: "relative",
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  cornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 50,
    height: 50,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: "#4a6da7",
  },
  cornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 50,
    height: 50,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderColor: "#4a6da7",
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 50,
    height: 50,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: "#4a6da7",
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 50,
    height: 50,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderColor: "#4a6da7",
  },
  scanText: {
    color: "white",
    fontSize: 16,
    marginTop: 20,
    textAlign: "center",
    paddingHorizontal: 40,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    paddingVertical: 10,
  },
  processingContainer: {
    marginTop: 30,
    alignItems: "center",
  },
  processingText: {
    color: "white",
    marginTop: 10,
    fontSize: 14,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});

export default QRScannerModal;