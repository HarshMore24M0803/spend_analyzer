import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from './screens/HomeScreen';
import CameraScreen from './screens/CameraScreen';
import HistoryScreen from './screens/HistoryScreen';
import ReportScreen from './screens/ReportScreen';
import ManualAddScreen from './screens/ManualAddScreen';
import EditExpenseScreen from './screens/EditExpenseScreen';

import { initDb } from './database/db'; // Import initDb

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    // initDb is now async, so call it with await inside an async IIFE or separate async function
    const initializeDatabase = async () => {
      try {
        await initDb();
        console.log('Database initialized successfully (Async API)!');
      } catch (err) {
        console.error('Database initialization failed (Async API):', err);
      }
    };
    initializeDatabase();
  }, []); // Empty dependency array means this runs only once on app start

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="Camera" component={CameraScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="ManualAdd" component={ManualAddScreen} />
        <Stack.Screen name="EditExpense" component={EditExpenseScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}