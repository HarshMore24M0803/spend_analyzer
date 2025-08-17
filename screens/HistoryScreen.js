import React, { useEffect, useState, useCallback } from 'react'; // Added useState, useCallback
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native'; // Added FlatList, TouchableOpacity, Alert
import { fetchExpenses, deleteAllExpenses } from '../database/db'; // Import database functions

function HistoryScreen({navigation}) {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // State to show loading status

  // Function to load expenses from the database
  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedExpenses = await fetchExpenses();
      setExpenses(fetchedExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      Alert.alert('Error', 'Failed to load expenses.');
    } finally {
      setIsLoading(false);
    }
  }, []); // useCallback memoizes the function, empty dependency array means it doesn't change

  // Load expenses when the component mounts or when it comes into focus (if using navigation listeners)
  useEffect(() => {
    loadExpenses();

    // Optional: If you want to reload data when navigating back to this screen
    // This requires access to navigation prop, but we will keep it simple for now.
    // A manual refresh button is sufficient.
  }, [loadExpenses]); // Dependency array: loadExpenses is a dependency (due to useCallback)

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All Expenses',
      'Are you sure you want to delete all recorded expenses? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          onPress: async () => {
            try {
              await deleteAllExpenses();
              Alert.alert('Success', 'All expenses deleted!');
              loadExpenses(); // Reload list after deletion
            } catch (error) {
              console.error('Failed to delete all expenses:', error);
              Alert.alert('Error', 'Failed to delete expenses.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  // Render function for each expense item in the FlatList
  const renderExpenseItem = ({ item }) => (
    
    <View style={styles.expenseItem}>
      <View style={styles.expenseDetails}>
        <Text style={styles.expenseAmount}>₹{parseFloat(item.amount).toFixed(2)}</Text>
        <Text style={styles.expenseTag}>{item.tag}</Text>
      </View>
      <Text style={styles.expenseNote}>{item.note || 'No note'}</Text>
      <Text style={styles.expenseDate}>{new Date(item.date).toLocaleString()}</Text>

      {/* Edit Button */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate('EditExpense', { expense: item })}
      >
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>
    </View>
  );


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction History</Text>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={loadExpenses}>
          <Text style={styles.controlButtonText}>Refresh List</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleDeleteAll}>
          <Text style={styles.controlButtonText}>Delete All</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text>Loading expenses...</Text>
      ) : expenses.length === 0 ? (
        <Text>No expenses recorded yet.</Text>
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderExpenseItem}
          keyExtractor={(item) => item.id.toString()} // Unique key for each item
          contentContainerStyle={styles.flatListContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginBottom: 20,
  },
  controlButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  flatListContent: {
    width: '100%', // Ensure FlatList content takes full width
    paddingHorizontal: 10,
  },
  editButton: {
  marginTop: 10,
  backgroundColor: '#FFA500',
  paddingVertical: 6,
  paddingHorizontal: 15,
  borderRadius: 8,
  alignSelf: 'flex-end',
},
editButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 14,
},

  expenseItem: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
    width: '100%',              // Use full width
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },

  expenseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  expenseTag: {
    fontSize: 16,
    color: '#6200EE', // Matching primary color
    fontWeight: '600',
  },
  expenseNote: {
    fontSize: 15,
    color: '#555',
    marginBottom: 5,
  },
  expenseDate: {
  fontSize: 16,
  color: '#333',
  fontWeight: '500',
  marginTop: 10,
  alignSelf: 'flex-start',
}
});

export default HistoryScreen;