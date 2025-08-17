import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

function HomeScreen({ navigation }) { // navigation prop is passed by React Navigation
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spend Analyzer</Text>
      <Text style={styles.subtitle}>Your Financial Overview</Text>

      <View style={styles.buttonGrid}>
        {/* Button 1: Camera Scan */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Camera')} // Navigates to CameraScreen
        >
          <Text style={styles.buttonText}>Scan Payment</Text>
        </TouchableOpacity>

        {/* Button 2: Transaction History */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('History')} // Navigates to HistoryScreen
        >
          <Text style={styles.buttonText}>History (Passbook)</Text>
        </TouchableOpacity>

        {/* Button 3: Generate Report */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Report')} // Navigates to ReportScreen
        >
          <Text style={styles.buttonText}>Monthly Reports</Text>
        </TouchableOpacity>

        {/* Button 4: Manually Add Transaction */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('ManualAdd')} // Navigates to ManualAddScreen
        >
          <Text style={styles.buttonText}>Manual Transaction</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    padding: 20, // Add some padding around the content
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 50, // More space below subtitle
  },
  buttonGrid: {
    flexDirection: 'row', // Arrange buttons in rows
    flexWrap: 'wrap', // Allow buttons to wrap to next line
    justifyContent: 'space-around', // Distribute space around buttons
    width: '100%', // Take full width available
  },
  button: {
    backgroundColor: '#6200EE', // Primary purple color
    width: '45%', // Roughly 2 buttons per row with spacing
    height: 120, // Fixed height for a larger button area
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10, // Vertical space between rows
    marginHorizontal: '2.5%', // Horizontal space (total 5% for margin)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6, // Android shadow
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default HomeScreen;