// components/ModalDropdown.js
import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';

const ModalDropdown = ({
  visible,
  options,
  labelKey = 'label', // default key to display
  onSelect,
  onClose,
}) => {
  return (
    <Modal isVisible={visible} onBackdropPress={onClose}>
      <View style={styles.modalContent}>
        <FlatList
          data={options}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              style={styles.item}
            >
              <Text style={styles.text}>{item[labelKey]}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    maxHeight: 300,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  text: {
    fontSize: 16,
  },
});

export default ModalDropdown;
