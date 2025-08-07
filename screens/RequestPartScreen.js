import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RequestPartScreen({ route, navigation }) {
  const { callReportId } = route.params;
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    axios.get('http://192.34.58.213/gayatri/api/parts')
      .then((res) => setParts(res.data))
      .catch((err) => console.error(err));
  }, []);

  const handleSubmit = async () => {
    if (!selectedPart || !quantity) {
      Alert.alert('Please select part and enter quantity');
      return;
    }

    const userId = await AsyncStorage.getItem('user_id');
    axios.post('http://192.34.58.213/gayatri/api/part_requests', {
      part_request: {
        user_id: userId,
        call_report_id: callReportId,
        part_id: selectedPart,
        quantity_requested: quantity,
        remarks: remarks
      }
    })
    .then(() => {
      Alert.alert('Part request submitted successfully');
      setQuantity('');
      setRemarks('');
      navigation.goBack();
      //navigation.navigate('CallReportsDropdown', { refresh: true });

    })
    .catch((err) => {
      console.error(err);
      Alert.alert('Failed to submit request');
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Part</Text>
      <Picker
        selectedValue={selectedPart}
        onValueChange={(itemValue) => setSelectedPart(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="-- Select Part --" value={null} />
        {parts.map((part) => (
          <Picker.Item key={part.id} label={`${part.name} (${part.quantity_in_stock})`} value={part.id} />
        ))}
      </Picker>

      <TextInput
        style={styles.input}
        placeholder="Quantity"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        placeholder="Remarks (optional)"
        value={remarks}
        onChangeText={setRemarks}
      />

      <Button title="Submit Request" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { marginBottom: 5 },
  picker: { height: 50, marginBottom: 15 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5
  }
});
