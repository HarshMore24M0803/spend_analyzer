import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import React, { useEffect, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { insertExpense } from '../database/db';

const predefinedTags = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Education', 'Other'];

const initialState = {
  amount: '',
  note: '',
  selectedTag: null,
  customTags: [],
  amountError: '',
  tagError: '',
  isManageTagsModalVisible: false,
  newTagName: '',
  editTagIndex: -1, // -1 means no tag is being edited
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_AMOUNT':
      return { ...state, amount: action.payload, amountError: '' };
    case 'SET_NOTE':
      return { ...state, note: action.payload };
    case 'SET_TAG':
      return { ...state, selectedTag: action.payload, tagError: '' };
    case 'SET_CUSTOM_TAGS':
      return { ...state, customTags: action.payload };
    case 'SET_AMOUNT_ERROR':
      return { ...state, amountError: action.payload };
    case 'SET_TAG_ERROR':
      return { ...state, tagError: action.payload };
    case 'RESET_INPUTS':
      return { ...state, amount: '', note: '', selectedTag: null, amountError: '', tagError: '' };
    case 'SET_MANAGE_TAGS_MODAL_VISIBLE':
      return { ...state, isManageTagsModalVisible: action.payload };
    case 'SET_NEW_TAG_NAME':
      return { ...state, newTagName: action.payload };
    case 'ADD_CUSTOM_TAG':
        const newTagTrimmed = action.payload.trim();
        if (newTagTrimmed === '') {
            Alert.alert('Error', 'Tag name cannot be empty.');
            return state;
        }
        if (predefinedTags.includes(newTagTrimmed) || state.customTags.includes(newTagTrimmed)) {
            Alert.alert('Error', 'Tag already exists!');
            return { ...state, newTagName: '' };
        }
        const updatedTagsAdd = [...state.customTags, newTagTrimmed];
        return { ...state, customTags: updatedTagsAdd, newTagName: '' };
    case 'UPDATE_CUSTOM_TAG':
        const updatedNameTrimmed = action.payload.newName.trim();
        if (updatedNameTrimmed === '') {
            Alert.alert('Error', 'Tag name cannot be empty.');
            return state;
        }
        if (
            (predefinedTags.includes(updatedNameTrimmed) || state.customTags.includes(updatedNameTrimmed)) &&
            (state.customTags[action.payload.index] !== updatedNameTrimmed)
        ) {
            Alert.alert('Error', 'Tag already exists or is a predefined tag.');
            return { ...state, newTagName: '', editTagIndex: -1 };
        }

        const tagsAfterUpdate = state.customTags.map((tag, index) =>
            index === action.payload.index ? updatedNameTrimmed : tag
        );
        return { ...state, customTags: tagsAfterUpdate, newTagName: '', editTagIndex: -1 };
    case 'DELETE_CUSTOM_TAG':
        const tagsAfterDelete = state.customTags.filter((_, index) => index !== action.payload);
        return { ...state, customTags: tagsAfterDelete, newTagName: '', editTagIndex: -1 };
    case 'SET_EDIT_TAG_INDEX':
        return { ...state, editTagIndex: action.payload.index, newTagName: action.payload.name };
    default:
      return state;
  }
}

function ManualAddScreen() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { amount, note, selectedTag, customTags, amountError, tagError, isManageTagsModalVisible, newTagName, editTagIndex } = state;

  const loadCustomTags = async () => {
    try {
      const storedTags = await AsyncStorage.getItem('customTags');
      if (storedTags !== null) {
        dispatch({ type: 'SET_CUSTOM_TAGS', payload: JSON.parse(storedTags) });
      }
    } catch (error) {
      console.error('Error loading custom tags:', error);
    }
  };

  const saveCustomTags = async (tags) => {
    try {
      await AsyncStorage.setItem('customTags', JSON.stringify(tags));
    } catch (error) {
      console.error("Error saving custom tags:", error);
    }
  };

  // Removed useEffect for saving here, as we'll save directly in add/update/delete functions
  // useEffect(() => {
  //   if (customTags) {
  //       saveCustomTags(customTags);
  //   }
  // }, [customTags]); 

  useEffect(() => {
    loadCustomTags();
  }, []);

  const handleAddExpense = async () => {
    let valid = true;

    if (!amount || parseFloat(amount) <= 0) {
      dispatch({ type: 'SET_AMOUNT_ERROR', payload: 'Amount is compulsory and must be a positive number.' });
      valid = false;
    } else {
      dispatch({ type: 'SET_AMOUNT_ERROR', payload: '' });
    }

    if (!selectedTag) {
      dispatch({ type: 'SET_TAG_ERROR', payload: 'Please select a tag.' });
      valid = false;
    } else {
      dispatch({ type: 'SET_TAG_ERROR', payload: '' });
    }

    if (!valid) {
      Alert.alert('Validation Error', 'Please fill in all compulsory fields correctly.');
      return;
    }

    try {
      const date = new Date().toISOString(); // Save current date as ISO string
      const result = await insertExpense(parseFloat(amount), note.trim(), selectedTag, date);
      console.log('Inserted Expense ID:', result.insertId);

      Alert.alert('Success!', `Expense added:\nAmount: ₹${amount}\nTag: ${selectedTag}\nNote: ${note}`);
      dispatch({ type: 'RESET_INPUTS' });
    } catch (error) {
      Alert.alert('Error', 'Failed to save expense to database.');
      console.error('DB Insert Error:', error);
    }
  };


  const handleTagSelect = (tag) => {
    dispatch({ type: 'SET_TAG', payload: tag });
  };

  const allAvailableTags = [...predefinedTags, ...customTags];

  const renderTagChip = (item, index, isManageMode = false) => (
    <TouchableOpacity
      key={item + index + (isManageMode ? '_manage' : '')}
      style={[
        styles.tag,
        selectedTag === item && styles.selectedTag,
        isManageMode && styles.manageTagChip,
      ]}
      onPress={isManageMode ? () => handleEditTag(index, item) : () => handleTagSelect(item)}
    >
      <Text style={[
        styles.tagText,
        selectedTag === item && styles.selectedTagText,
        isManageMode && styles.manageTagChipText,
      ]}>{item}</Text>
      {isManageMode && (
          <TouchableOpacity onPress={() => handleDeleteTag(index)} style={styles.manageTagChipDelete}>
              <Text style={styles.manageTagChipDeleteText}>X</Text>
          </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const openManageTagsModal = () => {
    dispatch({ type: 'SET_MANAGE_TAGS_MODAL_VISIBLE', payload: true });
  };

  const closeManageTagsModal = () => {
    dispatch({ type: 'SET_MANAGE_TAGS_MODAL_VISIBLE', payload: false });
    dispatch({ type: 'SET_NEW_TAG_NAME', payload: '' });
    dispatch({ type: 'SET_EDIT_TAG_INDEX', payload: { index: -1, name: '' } });
  };

  const handleAddOrUpdateTag = () => {
      if (newTagName.trim() === '') {
          Alert.alert('Error', 'Tag name cannot be empty.');
          return;
      }
      const newTagValue = newTagName.trim();
      let tagsToSave = [];

      if (editTagIndex !== -1) {
          // Update existing tag logic
          if (
              (predefinedTags.includes(newTagValue) || customTags.includes(newTagValue)) &&
              (customTags[editTagIndex] !== newTagValue) // Allow updating to same name
          ) {
              Alert.alert('Error', 'Tag already exists or is a predefined tag.');
              return;
          }
          dispatch({ type: 'UPDATE_CUSTOM_TAG', payload: { index: editTagIndex, newName: newTagValue } });
          tagsToSave = customTags.map((tag, index) => index === editTagIndex ? newTagValue : tag);
      } else {
          // Add new tag logic
          if (predefinedTags.includes(newTagValue) || customTags.includes(newTagValue)) {
              Alert.alert('Error', 'Tag already exists!');
              dispatch({ type: 'SET_NEW_TAG_NAME', payload: '' }); // Clear input on duplicate
              return;
          }
          dispatch({ type: 'ADD_CUSTOM_TAG', payload: newTagValue });
          tagsToSave = [...customTags, newTagValue];
      }
      // Explicitly save the computed new list of tags immediately
      saveCustomTags(tagsToSave);
  };

  const handleEditTag = (index, name) => {
      dispatch({ type: 'SET_EDIT_TAG_INDEX', payload: { index, name } });
  };

  const handleDeleteTag = (index) => {
      Alert.alert(
          "Delete Tag",
          "Are you sure you want to delete this tag? This cannot be undone.",
          [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", onPress: () => {
                  const tagsAfterDelete = customTags.filter((_, i) => i !== index);
                  dispatch({ type: 'DELETE_CUSTOM_TAG', payload: index });
                  // Explicitly save the filtered list immediately
                  saveCustomTags(tagsAfterDelete);
              }, style: "destructive" }
          ]
      );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>Manually Add Transaction</Text>

      {/* Amount Input */}
      <TextInput
        style={[styles.input, amountError ? styles.inputError : {}]}
        placeholder="Amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={(text) => dispatch({ type: 'SET_AMOUNT', payload: text })}
      />
      {amountError ? <Text style={styles.errorText}>{amountError}</Text> : null}

      {/* Note Input */}
      <TextInput
        style={styles.input}
        placeholder="Note (e.g., Groceries, Coffee)"
        value={note}
        onChangeText={(text) => dispatch({ type: 'SET_NOTE', payload: text })}
      />

      {/* Tag Selection Section */}
      <Text style={styles.sectionTitle}>Select Tag:</Text>
      <View style={styles.tagsContainer}>
        {allAvailableTags.map((item, index) => renderTagChip(item, index, false))}
      </View>
      {tagError ? <Text style={styles.errorText}>{tagError}</Text> : null}

      {/* Manage Tags Button */}
      <TouchableOpacity
        style={styles.manageTagsButton}
        onPress={openManageTagsModal}
      >
        <Text style={styles.manageTagsButtonText}>Manage Tags</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleAddExpense}>
        <Text style={styles.buttonText}>Add Expense</Text>
      </TouchableOpacity>

      {/* Tag Management Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isManageTagsModalVisible}
        onRequestClose={closeManageTagsModal}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{editTagIndex !== -1 ? 'Edit Custom Tag' : 'Add Custom Tag'}</Text>

            <TextInput
                style={styles.modalInput}
                placeholder={editTagIndex !== -1 ? 'Edit Tag Name' : 'New Tag Name'}
                value={newTagName}
                onChangeText={text => dispatch({ type: 'SET_NEW_TAG_NAME', payload: text })}
            />
            <TouchableOpacity style={styles.modalAddButton} onPress={handleAddOrUpdateTag}>
                <Text style={styles.modalButtonText}>{editTagIndex !== -1 ? 'Update Tag' : 'Add Tag'}</Text>
            </TouchableOpacity>

            <Text style={styles.modalSectionTitle}>Your Custom Tags:</Text>
            {customTags.length === 0 ? (
                <Text style={styles.noCustomTagsText}>No custom tags yet.</Text>
            ) : (
                <ScrollView style={styles.modalTagList} contentContainerStyle={styles.modalTagListContent}>
                    {customTags.map((item, index) => (
                        <View key={item + index} style={styles.manageTagItem}>
                            <Text style={styles.manageTagText}>{item}</Text>
                            <View style={styles.manageTagButtons}>
                                <TouchableOpacity onPress={() => handleEditTag(index, item)} style={styles.manageTagEditButton}>
                                    <Text style={styles.manageTagButtonText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteTag(index)} style={styles.manageTagDeleteButton}>
                                    <Text style={styles.manageTagButtonText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}


            <TouchableOpacity
              style={[styles.button, styles.buttonClose]}
              onPress={closeManageTagsModal}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
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
      marginBottom: 10,
  },
  tagListContainer: {
      paddingHorizontal: '0%',
      paddingBottom: 0,
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
    flexShrink: 0,
    flexGrow: 0,
  },
  selectedTag: {
    backgroundColor: '#6200EE',
    borderColor: '#6200EE',
  },
  tagText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedTagText: {
    color: '#fff',
  },
  manageTagsButton: {
    backgroundColor: '#4CAF50',
    width: '85%',
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  manageTagsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#6200EE',
    width: '85%',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // --- Modal Styles ---
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalInput: {
      width: '100%',
      height: 40,
      borderColor: '#ccc',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      marginBottom: 15,
      fontSize: 16,
  },
  modalAddButton: {
      backgroundColor: '#6200EE',
      width: '100%',
      height: 40,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
  },
  modalButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
  },
  modalSectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#555',
      marginBottom: 10,
      alignSelf: 'flex-start',
  },
  modalTagList: {
      width: '100%',
      maxHeight: 150,
      borderWidth: 1,
      borderColor: '#eee',
      borderRadius: 8,
      padding: 5,
  },
  modalTagListContent: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      paddingBottom: 10,
  },
  manageTagItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: '#f5f5f5',
      borderRadius: 5,
      margin: 4,
      flexGrow: 1,
  },
  manageTagChip: {
      marginRight: 0,
      marginBottom: 0,
      flexGrow: 0, flexShrink: 0,
      margin: 5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
  },
  manageTagChipText: {
    fontSize: 14,
  },
  manageTagChipDelete: {
      marginLeft: 8,
      backgroundColor: '#ff4d4d',
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
  },
  manageTagChipDeleteText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
  },
  manageTagText: {
      fontSize: 16,
      flex: 1,
  },
  manageTagButtons: {
      flexDirection: 'row',
  },
  manageTagEditButton: {
      backgroundColor: '#2196F3',
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 5,
      marginLeft: 10,
  },
  manageTagDeleteButton: {
      backgroundColor: '#f44336',
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 5,
      marginLeft: 10,
  },
  manageTagButtonText: {
      color: 'white',
      fontSize: 14,
  },
  noCustomTagsText: {
      fontSize: 16,
      color: '#888',
      marginBottom: 10,
  },
  buttonClose: {
      backgroundColor: '#f44336',
      marginTop: 20,
  },
});

export default ManualAddScreen;