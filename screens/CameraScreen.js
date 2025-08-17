import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList, Alert, Linking, AppState } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { insertExpense } from '../database/db';

const predefinedTags = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Education', 'Other'];

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [lastScanTime, setLastScanTime] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [customTags, setCustomTags] = useState([]);

  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false); // waiting for UPI return
  const appState = useRef(AppState.currentState);

  const allTags = [...predefinedTags, ...customTags];

  useEffect(() => {
    const loadCustomTags = async () => {
      try {
        const stored = await AsyncStorage.getItem('customTags');
        if (stored) setCustomTags(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load custom tags:', e);
      }
    };
    loadCustomTags();
  }, []);

  // Detect when app comes back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        if (waitingForConfirmation) {
          setWaitingForConfirmation(false);
          askForConfirmation();
        }
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [waitingForConfirmation, amount, note, selectedTag, qrData]);

  const handleBarCodeScanned = ({ data }) => {
    const now = Date.now();
    if (now - lastScanTime < 20) return;
    setLastScanTime(now);

    setScanned(true);
    setQrData(data);
    setModalVisible(true);
  };

  const handleProceed = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }
    if (!selectedTag) {
      Alert.alert('Validation Error', 'Please select a tag.');
      return;
    }

    try {
      const upiUrl = `${qrData}&am=${amount}&tn=${encodeURIComponent(note || '')}`;
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) {
        setWaitingForConfirmation(true);
        await Linking.openURL(upiUrl);
        // We do NOT save here. We wait for app to come back.
      } else {
        Alert.alert('Error', 'No UPI apps found to handle this payment.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to process payment.');
    }
  };

  const askForConfirmation = () => {
    Alert.alert(
      'Confirm Payment',
      'Did the payment succeed?',
      [
        { text: 'No', style: 'cancel', onPress: () => setModalVisible(false) },
        {
          text: 'Yes',
          onPress: async () => {
            const date = new Date().toISOString();
            await insertExpense(parseFloat(amount), note.trim(), selectedTag, date);
            Alert.alert('Success', 'Transaction recorded!');
            setModalVisible(false);
            navigation.goBack();
          }
        }
      ]
    );
  };

  if (!permission) {
    return <View style={styles.center}><Text>Requesting camera permission...</Text></View>;
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>We need your permission to use the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned ? (
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          {/* Overlay */}
          <View style={styles.overlay}>
            <View style={styles.cutout} />
          </View>
        </CameraView>
      ) : (
        <View style={styles.scannedContainer}>
          <Text style={styles.scannedText}>QR Scanned!</Text>
          <TouchableOpacity style={styles.rescanButton} onPress={() => setScanned(false)}>
            <Text style={styles.rescanText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal for details */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Payment Details</Text>

            <TextInput
              style={styles.input}
              placeholder="Amount (₹)"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Note (optional)"
              value={note}
              onChangeText={setNote}
            />

            <Text style={styles.sectionTitle}>Select Tag</Text>
            <FlatList
              data={allTags}
              horizontal
              keyExtractor={(item, idx) => idx.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.tag, selectedTag === item && styles.selectedTag]}
                  onPress={() => setSelectedTag(item)}
                >
                  <Text style={[styles.tagText, selectedTag === item && styles.selectedTagText]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity style={styles.proceedButton} onPress={handleProceed}>
              <Text style={styles.proceedText}>Proceed to Pay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scannedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scannedText: { fontSize: 20, marginBottom: 20 },
  rescanButton: { backgroundColor: '#6200EE', padding: 10, borderRadius: 8 },
  rescanText: { color: '#fff', fontWeight: 'bold' },
  message: { textAlign: 'center', paddingBottom: 10 },
  permissionButton: { backgroundColor: '#6200EE', padding: 10, borderRadius: 8 },
  permissionText: { color: '#fff', fontWeight: 'bold' },

  /* Overlay styles */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cutout: {
    width: 250,
    height: 250,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
  },

  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '85%', backgroundColor: '#fff', padding: 20, borderRadius: 10, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  input: { width: '100%', height: 50, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginVertical: 10 },
  tag: { padding: 10, backgroundColor: '#e0e0e0', borderRadius: 20, marginRight: 10 },
  selectedTag: { backgroundColor: '#6200EE' },
  tagText: { color: '#555' },
  selectedTagText: { color: '#fff' },
  proceedButton: { backgroundColor: '#6200EE', padding: 15, borderRadius: 8, marginTop: 15, alignItems: 'center' },
  proceedText: { color: '#fff', fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#ccc', padding: 10, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  cancelText: { color: '#000' },
});
