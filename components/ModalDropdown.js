// components/ModalDropdown.js
import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';

const toLabel = (item, labelKey) =>
  typeof item === 'string' ? item : (item?.[labelKey] ?? '');

const ModalDropdown = ({
  visible,
  options,
  labelKey = 'label',   // if you ever pass objects
  onSelect,
  onClose,
  selectedValue = null,  // current value in form
  defaultValue = null     // suggested default (from storage)
}) => {
  return (
    <Modal isVisible={visible} onBackdropPress={onClose}>
      <View style={styles.modalContent}>
        <FlatList
          data={options}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item, index }) => {
            const label = toLabel(item, labelKey);
            const isSelected = selectedValue != null && label === selectedValue;
            const isDefault = defaultValue != null && label === defaultValue;

            return (
              <TouchableOpacity
                onPress={() => { onSelect(label); onClose(); }}
                style={styles.item}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {isSelected ? <Text style={styles.check}>✓</Text> : <Text style={styles.check} />}
                  <Text style={styles.text}>{label}</Text>
                  {isDefault && !isSelected && (
                    <Text style={styles.badge}>Suggested</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
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
    maxHeight: 320,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  text: { fontSize: 16, flexShrink: 1 },
  check: { width: 18, textAlign: 'center', fontSize: 16, color: '#111' },
  badge: {
    marginLeft: 8,
    fontSize: 11,
    color: '#0C7CFF',
    backgroundColor: '#E7F1FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
});

export default ModalDropdown;
