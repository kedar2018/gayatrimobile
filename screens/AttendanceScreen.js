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

          <Text style={styles.label}>Hour</Text>
          <View style={styles.pickerWrapper}>

  <Picker
    selectedValue={hour}
    onValueChange={(val) => setHour(val)}
    mode="dropdown"                         // Android: dropdown instead of dialog
    style={styles.picker}                   // main control style
    itemStyle={styles.pickerItem}           // iOS item font
    dropdownIconColor="#475569"             // Android icon
    dropdownIconRippleColor="#e5e7eb"       // Android ripple
    prompt="Select hour"                    // Android dialog title (fallback)
  >
    <Picker.Item label="Select hour" value="" enabled={false} />
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
            placeholderTextColor="#9aa3af"
          />

          <TouchableOpacity
            onPress={submitAttendance}
            disabled={submitting}
            style={[styles.button, submitting && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>{submitting ? 'Submitting…' : 'Submit'}</Text>
          </TouchableOpacity>

          <Text style={styles.subTitle}>Your Attendance Logs</Text>
          {logs.length === 0 && (
            <Text style={styles.noLogs}>No attendance yet.</Text>
          )}
        </>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardLine}>📅 {item.log_date}</Text>
          <Text style={styles.cardLine}>⏱ {item.hour}:00</Text>
          <Text style={styles.cardLine}>📝 {item.task}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f2f4f7',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#004080',
    marginBottom: 12,
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 14,
    color: '#4b5563',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  pickerWrapper: {
color: '#hgfswd', // text color
    backgroundColor: '#swdsss',
    borderRadius: 10,
    borderColor: '#cbd5e1',
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  button: {
    backgroundColor: '#004080',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 22,
    color: '#004080',
  },
  noLogs: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 10,
  },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLine: {
    fontSize: 15,
    color: '#111827',
    marginBottom: 2,
  },
  // Inline banner styles (same pattern as Leave screen)
  banner: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  successBanner: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  bannerText: {
    color: '#111827',
    flex: 1,
    fontSize: 14,
  },
  bannerClose: {
    color: '#111827',
    fontSize: 16,
    paddingHorizontal: 6,
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 14,
    color: '#4b5563',
  },

  // Outer wrapper to simulate padding & rounded corners (Android Picker ignores some paddings)
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 14,
    // iOS shadow (subtle)
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    // Android elevation
    elevation: 1,
  },

  // Control height + left/right breathing room (Platform-specific for best behavior)
  picker: {
    height: 52,
    ...Platform.select({
      ios: { paddingHorizontal: 12 },       // iOS respects padding
      android: { paddingHorizontal: 6 },    // Android ignores mostly, wrapper helps
    }),
    color: '#111827',
    fontSize: 16,
  },

  // iOS only: font and row height for the wheel/dropdown rows
  pickerItem: Platform.select({
    ios: {
      fontSize: 16,
      height: 52,
    },
    android: {}, // No effect on Android
  }),
});
