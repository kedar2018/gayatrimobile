import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';


export default function LeaveScreen() {
  const [leaveTypes, setLeaveTypes] = useState([]); // start with empty array
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [reason, setReason] = useState('');
  const [leaves, setLeaves] = useState([]);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [selectedType, setSelectedType] = useState('');


  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    const userId = await AsyncStorage.getItem('user_id');
    try {
      const res = await axios.get(
        `http://134.199.178.17/gayatri/api/leave_applications?user_id=${userId}`
      );
      setLeaves(res.data);
    } catch (error) {
      console.error('Error fetching leave applications:', error);
    }
  };

  useEffect(() => {
    fetch('http://134.199.178.17/gayatri/api/leave_types')
      .then(res => res.json())
      .then(data => setLeaveTypes(data.leave_types))
      .catch(err => console.error(err));
  }, []);




  const submitLeave = async () => {
    if (!selectedType || !reason) {
      Alert.alert('Validation', 'Leave type and reason are required.');
      return;
    }

    const userId = await AsyncStorage.getItem('user_id');



try {
    const { data } = await axios.post(
      'http://134.199.178.17/gayatri/api/leave_applications',
      {
        user_id: userId,
        leave_type: selectedType,
        from_date: fromDate.toISOString().split('T')[0],
        to_date: toDate.toISOString().split('T')[0],
        reason: reason,
      }
    );

    // Success path
    Alert.alert('Success', data?.message || 'Leave application submitted.');
    setSelectedType('');   // reset to "Select type"
    setReason('');
    fetchLeaves();
  } catch (error) {
    // Server responded (4xx/5xx)
    if (error.response) {
      const apiErrors = error.response.data?.errors;
      const apiMessage = error.response.data?.message;

      const message =
        (Array.isArray(apiErrors) && apiErrors.length
          ? apiErrors.join('\n')
          : apiMessage) || 'Something went wrong.';

      Alert.alert('Error', message);
    }
    // No response (network, CORS, server down)
    else if (error.request) {
      Alert.alert(
        'Network Error',
        'Unable to reach the server. Please check your connection and try again.'
      );
    }
    // Something else (code bug, thrown error)
    else {
      Alert.alert('Error', error.message || 'Unexpected error occurred.');
    }

    console.error('Error submitting leave:', error);
  }




  };

return (
  <FlatList
    style={styles.container}
    data={leaves}
    keyExtractor={(item, index) => index.toString()}
    ListHeaderComponent={
      <>
        <Text style={styles.title}   >Apply for Leave</Text>

    <View style={styles.pickerContainer}>

      <Picker
        selectedValue={selectedType}
        onValueChange={(value) => setSelectedType(value)} // use the setter here
        style={styles.picker}
        dropdownIconColor="#333"
      >
        <Picker.Item label="Select type" value="" />
        {(leaveTypes || []).map((type, index) => (
          <Picker.Item key={index} label={type} value={type} />
        ))}
      </Picker>

</View>

        <Text style={styles.label}>From Date</Text>
        <Button title={fromDate.toDateString()} onPress={() => setShowFromPicker(true)} />
        {showFromPicker && (
          <DateTimePicker
            value={fromDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowFromPicker(false);
              if (date) setFromDate(date);
            }}
          />
        )}

        <Text style={styles.label}>To Date</Text>
        <Button title={toDate.toDateString()} onPress={() => setShowToPicker(true)} />
        {showToPicker && (
          <DateTimePicker
            value={toDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowToPicker(false);
              if (date) setToDate(date);
            }}
          />
        )}
        <Text style={styles.title}>Reason</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Reason"
          multiline
          value={reason}
          onChangeText={setReason}
        />

        <View style={{ marginVertical: 10 }}>
          <Button
            title="Submit Leave Application"
            color="#004080"
            onPress={submitLeave}
          />
        </View>

        <Text style={styles.subTitle}>Your Previous Leaves</Text>
        {leaves.length === 0 && (
          <Text style={{ color: '#999', textAlign: 'center', marginTop: 10 }}>
            No leave records found.
          </Text>
        )}
      </>
    }
    renderItem={({ item }) => (
      <View style={styles.card}>
        <Text style={styles.cardText}>📝 {item.leave_type}</Text>
        <Text style={styles.cardText}>📅 {item.from_date} to {item.to_date}</Text>
        <Text style={styles.cardText}>📖 {item.reason}</Text>
        <Text style={styles.cardText}>✅ Status: {item.status}</Text>
      </View>
    )}
  />
);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#004080',
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#004080',
  },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginVertical: 6,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2, // Android shadow
  },
  cardText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden', // ensures corners are rounded
    marginVertical: 10,
  },
  picker: {
    height: 50,
    fontSize: 16,
    color: '#000', // text color
    backgroundColor: '#f9f9f9',
  },
});

