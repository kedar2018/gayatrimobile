import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList,
  StyleSheet, Alert, TouchableOpacity, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';

export default function AttendanceScreen() {
  const [hour, setHour] = useState('9');
  const [task, setTask] = useState('');
  const [logs, setLogs] = useState([]);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    const userId = await AsyncStorage.getItem('user_id');
    try {
      const res = await axios.get(`http://134.199.178.17/gayatri/api/attendance_logs?user_id=${userId}`);
      setLogs(res.data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setErrorMsg('Unable to load attendance logs right now.');
    }
  };

  const extractApiErrors = (error) => {
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      return error.response.data.errors.join('\n');
    }
    if (typeof error?.response?.data?.message === 'string') {
      return error.response.data.message;
    }
    if (error?.message) return error.message;
    return 'Something went wrong.';
  };

  const submitAttendance = async () => {
    // reset banners
    setErrorMsg('');
    setSuccessMsg('');

    // client validations (same style we used on Leave)
    if (!task.trim()) {
      setErrorMsg('Task is required.');
      return;
    }

    setSubmitting(true);
    const userId = await AsyncStorage.getItem('user_id');

    try {
      const { data } = await axios.post(`http://134.199.178.17/gayatri/api/attendance_logs`, {
        user_id: userId,
        hour: parseInt(hour, 10),
        task: task.trim(),
      });

      // If your Rails returns {success:true,message:"..."} keep this:
      if (data?.success === false) {
        setErrorMsg((data.errors || []).join('\n') || 'Unable to log attendance.');
        setSubmitting(false);
        return;
      }

      setSuccessMsg(data?.message || 'Attendance logged.');
      setTask('');
      setHour('');
      await fetchAttendance();
    } catch (error) {
      console.error('Error logging attendance:', error);
      setErrorMsg(extractApiErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
  <FlatList
    data={logs}
    keyExtractor={(item, index) => index.toString()}
    contentContainerStyle={styles.container}
    ListHeaderComponent={
      <>
        <Text style={styles.title}>Log Attendance</Text>

        {/* Banners */}
        {!!errorMsg && (
          <View style={[styles.banner, styles.errorBanner]}>
            <Text style={styles.bannerText}>{errorMsg}</Text>
            <TouchableOpacity onPress={() => setErrorMsg('')}>
              <Text style={styles.bannerClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!successMsg && (
          <View style={[styles.banner, styles.successBanner]}>
            <Text style={styles.bannerText}>{successMsg}</Text>
            <TouchableOpacity onPress={() => setSuccessMsg('')}>
              <Text style={styles.bannerClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hour Picker */}
        <Text style={styles.label}>Hour</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={hour}
            onValueChange={(val) => setHour(val)}
            style={styles.picker}
            dropdownIconColor="#333"
            prompt="Select hour"
          >
            <Picker.Item label="Select hour" value="" enabled={false} />
            {[...Array(24).keys()].map((h) => (
              <Picker.Item key={h} label={`${h}:00`} value={h.toString()} />
            ))}
          </Picker>
        </View>

        {/* Task Input */}
        <Text style={styles.label}>Task</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter task"
          value={task}
          onChangeText={setTask}
          placeholderTextColor="#9aa3af"
        />

        {/* Submit Button */}
        <TouchableOpacity
          onPress={submitAttendance}
          disabled={submitting}
          style={[styles.button, submitting && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {submitting ? 'Submitting…' : 'Submit'}
          </Text>
        </TouchableOpacity>

        {/* Header for Logs */}
        <Text style={styles.subTitle}>Your Attendance Logs</Text>
        {logs.length === 0 && (
          <Text style={styles.noLogs}>No attendance yet.</Text>
        )}
      </>
    }
    renderItem={({ item }) => (
      <View style={styles.card}>
        <Text style={styles.cardText}>📅 {item.log_date}</Text>
        <Text style={styles.cardText}>⏱ {item.hour}:00</Text>
        <Text style={styles.cardText}>📝 {item.task}</Text>
      </View>
    )}
  />
);

}

const styles = StyleSheet.create({
  container: {
  padding: 16,
  backgroundColor: '#f8fafc',
},

title: {
  fontSize: 20,
  fontWeight: 'bold',
  marginBottom: 12,
  color: '#1e293b',
},

label: {
  marginTop: 10,
  fontSize: 14,
  fontWeight: '600',
  color: '#334155',
},

pickerContainer: {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 6,
  marginBottom: 10,
  overflow: 'hidden',
},

picker: {
  height: 55,
  width: '100%',
  backgroundColor: '#fff',
  color: '#1f2937',
},

input: {
  height: 45,
  borderWidth: 1,
  borderColor: '#cbd5e1',
  borderRadius: 6,
  paddingHorizontal: 10,
  backgroundColor: '#fff',
  marginBottom: 12,
},

button: {
  backgroundColor: '#004080',
  padding: 12,
  borderRadius: 6,
  alignItems: 'center',
  marginBottom: 16,
},

buttonDisabled: {
  backgroundColor: '#94a3b8',
},

buttonText: {
  color: '#fff',
  fontWeight: '600',
},

subTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  marginVertical: 10,
  color: '#1e293b',
},

card: {
  backgroundColor: '#fff',
  borderRadius: 6,
  padding: 12,
  marginVertical: 6,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 2,
},

cardText: {
  fontSize: 14,
  color: '#334155',
},

noLogs: {
  color: '#9ca3af',
  textAlign: 'center',
  marginTop: 10,
},

banner: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 10,
  marginVertical: 5,
  borderRadius: 5,
},

errorBanner: {
  backgroundColor: '#fee2e2',
},

successBanner: {
  backgroundColor: '#dcfce7',
},

bannerText: {
  color: '#1e293b',
  flex: 1,
},

bannerClose: {
  marginLeft: 10,
  fontSize: 16,
  fontWeight: 'bold',
  color: '#334155',
},

});

