import React, { useReducer, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { updateExpense } from '../database/db';
import AsyncStorage from '@react-native-async-storage/async-storage';

const predefinedTags = [
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Health',
  'Education',
  'Other',
];

const initialState = {
  amount: '',
  note: '',
  selectedTag: '',
  amountError: '',
  tagError: '',
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_AMOUNT':
      return { ...state, amount: action.payload, amountError: '' };
    case 'SET_NOTE':
      return { ...state, note: action.payload };
    case 'SET_TAG':
      return { ...state, selectedTag: action.payload, tagError: '' };
    case 'SET_AMOUNT_ERROR':
      return { ...state, amountError: action.payload };
    case 'SET_TAG_ERROR':
      return { ...state, tagError: action.payload };
    default:
      return state;
  }
}

export default function EditExpenseScreen({ route, navigation }) {
  const expense = route?.params?.expense;
  const [customTags, setCustomTags] = useState([]);

  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    amount: expense?.amount?.toString() || '',
    note: expense?.note || '',
    selectedTag: expense?.tag || '',
  });

  const { amount, note, selectedTag, amountError, tagError } = state;
  const allTags = [...predefinedTags, ...customTags];

  useEffect(() => {
    const loadCustomTags = async () => {
      try {
        const stored = await AsyncStorage.getItem('customTags');
        if (stored) {
          setCustomTags(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load custom tags:', e);
      }
    };
    loadCustomTags();
  }, []);

  const handleSaveChanges = async () => {
    let valid = true;

    if (!amount || parseFloat(amount) <= 0) {
      dispatch({
        type: 'SET_AMOUNT_ERROR',
        payload: 'Amount must be a positive number.',
      });
      valid = false;
    }

    if (!selectedTag) {
      dispatch({ type: 'SET_TAG_ERROR', payload: 'Please select a tag.' });
      valid = false;
    }

    if (!valid) {
      Alert.alert('Validation Error', 'Please correct the errors and try again.');
      return;
    }

    try {
      const date = new Date().toISOString();
      await updateExpense(
        expense.id,
        parseFloat(amount),
        note.trim(),
        selectedTag,
        date
      );

      Alert.alert('Success', 'Expense updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Update failed:', error);
      Alert.alert('Error', 'Failed to update expense.');
    }
  };

  if (!expense) {
    return (
      <View style={styles.container}>
        <Text style={{ fontSize: 18, color: 'red' }}>No expense provided.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: 'blue', marginTop: 10 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit Expense</Text>

      <TextInput
        style={[styles.input, amountError ? styles.inputError : null]}
        placeholder="Amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={(text) => dispatch({ type: 'SET_AMOUNT', payload: text })}
      />
      {amountError ? <Text style={styles.errorText}>{amountError}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Note"
        value={note}
        onChangeText={(text) => dispatch({ type: 'SET_NOTE', payload: text })}
      />

      <Text style={styles.sectionTitle}>Select Tag</Text>
      <View style={styles.tagsContainer}>
        {allTags.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[styles.tag, selectedTag === tag && styles.selectedTag]}
            onPress={() => dispatch({ type: 'SET_TAG', payload: tag })}
          >
            <Text style={[styles.tagText, selectedTag === tag && styles.selectedTagText]}>
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {tagError ? <Text style={styles.errorText}>{tagError}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSaveChanges}>
        <Text style={styles.buttonText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 40,
    backgroundColor: '#f0f2f5',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '85%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
    fontSize: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  inputError: {
    borderColor: 'red',
    borderWidth: 2,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
    alignSelf: 'flex-start',
    marginLeft: '7.5%',
    width: '85%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
    alignSelf: 'flex-start',
    marginLeft: '7.5%',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '85%',
    marginBottom: 20,
  },
  tag: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  selectedTag: {
    backgroundColor: '#6200EE',
    borderColor: '#6200EE',
  },
  tagText: {
    color: '#555',
    fontSize: 16,
  },
  selectedTagText: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#6200EE',
    width: '85%',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
