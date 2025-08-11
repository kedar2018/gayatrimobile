import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Button, FlatList,
  StyleSheet, Alert,  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';


export default function AttendanceScreen() {
  const [hour, setHour] = useState('9');
  const [task, setTask] = useState('');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    const userId = await AsyncStorage.getItem('user_id');
    try {
      const res = await axios.get(`http://134.199.178.17/gayatri/api/attendance_logs?user_id=${userId}`);
      setLogs(res.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const submitAttendance = async () => {
    if (!task.trim()) {
      Alert.alert('Validation', 'Task is required.');
      return;
    }

    const userId = await AsyncStorage.getItem('user_id');
    try {
      await axios.post(`http://134.199.178.17/gayatri/api/attendance_logs`, {
        user_id: userId,
        hour: parseInt(hour),
        task: task,
      });
      Alert.alert('Success', 'Attendance logged.');
      setTask('');
      fetchAttendance();
    } catch (error) {
      console.error('Error logging attendance:', error);
      Alert.alert('Error', 'Something went wrong.');
    }
  };

return (
  <FlatList
    data={logs}
    keyExtractor={(item, index) => index.toString()}
    ListHeaderComponent={
      <>
        <Text style={styles.title}>Log Attendance</Text>

        <Text style={styles.label}>Hour</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={hour}
            onValueChange={(itemValue) => setHour(itemValue)}
            style={{ height: 50, width: '100%' }}
          >
            {[...Array(24).keys()].map((h) => (
              <Picker.Item key={h} label={`${h}:00`} value={h.toString()} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Task</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter task"
          value={task}
          onChangeText={setTask}
        />

        <Button title="Submit" color="#004080" onPress={submitAttendance} />

        <Text style={styles.subTitle}>Your Attendance Logs</Text>
        {logs.length === 0 && (
          <Text style={styles.noLogs}>No attendance yet.</Text>
        )}
      </>
    }
    renderItem={({ item }) => (
      <View style={styles.card}>
        <Text>📅 {item.log_date}</Text>
        <Text>⏱ {item.hour}:00</Text>
        <Text>📝 {item.task}</Text>
      </View>
    )}
  />
);}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f2f4f7' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#004080', marginBottom: 10 },
  label: { marginVertical: 8, fontSize: 14, color: '#555' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 12,
  },
  picker: { height: 50, width: '100%' },
  subTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, color: '#004080' },
  noLogs: { textAlign: 'center', color: '#999', marginTop: 10 },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginVertical: 6,
    elevation: 2,
  },
});
