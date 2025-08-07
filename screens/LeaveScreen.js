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

export default function LeaveScreen() {
  const [leaveType, setLeaveType] = useState('');
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [reason, setReason] = useState('');
  const [leaves, setLeaves] = useState([]);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    const userId = await AsyncStorage.getItem('user_id');
    try {
      const res = await axios.get(
        `http://192.34.58.213/gayatri/api/leave_applications?user_id=${userId}`
      );
      setLeaves(res.data);
    } catch (error) {
      console.error('Error fetching leave applications:', error);
    }
  };

  const submitLeave = async () => {
    if (!leaveType || !reason) {
      Alert.alert('Validation', 'Leave type and reason are required.');
      return;
    }

    const userId = await AsyncStorage.getItem('user_id');
    try {
      await axios.post(`http://192.34.58.213/gayatri/api/leave_applications`, {
        user_id: userId,
        leave_type: leaveType,
        from_date: fromDate.toISOString().split('T')[0],
        to_date: toDate.toISOString().split('T')[0],
        reason: reason,
      });
      Alert.alert('Success', 'Leave application submitted.');
      setLeaveType('');
      setReason('');
      fetchLeaves();
    } catch (error) {
      console.error('Error submitting leave:', error);
      Alert.alert('Error', 'Something went wrong.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Apply for Leave</Text>

      <TextInput
        style={styles.input}
        placeholder="Leave Type (Casual, Sick...)"
        value={leaveType}
        onChangeText={setLeaveType}
      />

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

      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Reason"
        multiline
        value={reason}
        onChangeText={setReason}
      />

      <View style={{ marginVertical: 10 }}>
        <Button title="Submit Leave Application" color="#004080" onPress={submitLeave} />
      </View>

      <Text style={styles.subTitle}>Your Previous Leaves</Text>
      {leaves.length === 0 ? (
        <Text style={{ color: '#999', textAlign: 'center', marginTop: 10 }}>No leave records found.</Text>
      ) : (
        <FlatList
          data={leaves}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardText}>📝 {item.leave_type}</Text>
              <Text style={styles.cardText}>📅 {item.from_date} to {item.to_date}</Text>
              <Text style={styles.cardText}>📖 {item.reason}</Text>
              <Text style={styles.cardText}>✅ Status: {item.status}</Text>
            </View>
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f2f4f7' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#004080' },
  subTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: '#004080' },
  label: { fontSize: 14, marginVertical: 8, color: '#555' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
  },
  cardText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
});
