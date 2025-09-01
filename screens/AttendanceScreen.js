// screens/AttendanceScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, Alert, Platform
} from 'react-native';
import { api } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AttendanceScreen() {
  const [items, setItems] = useState([]);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // form
  const [task, setTask] = useState('');
  const [startAt, setStartAt] = useState(new Date());
  const [endAt, setEndAt] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const pad = (n) => (n < 10 ? `0${n}` : n);
  const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const fetchAttendance = async () => {
    try {
      setError('');
      setLoading(true);
      const engineer_id = await AsyncStorage.getItem('user_id'); // optional
      const res = await api.get('/attendance_logs', { params: { date: fmtDate(date), engineer_id } });
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setItems(data);
    } catch (e) {
      console.log('Attendance fetch error:', e?.response?.data || e.message);
      setError('Failed to load attendance.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const onRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    fetchAttendance();
  };

  const submitAttendance = async () => {
    try {
      if (!task) {
        Alert.alert('Missing info', 'Please enter the task description.');
        return;
      }
      const payload = {
        date: fmtDate(date),
        start_time: fmtTime(startAt),
        end_time: fmtTime(endAt),
        task_description: (task || '').trim(),
      };
      await api.post('/attendance_logs', payload);
      setTask('');
      setStartAt(new Date());
      setEndAt(new Date());
      fetchAttendance();
      Alert.alert('Success', 'Attendance saved.');
    } catch (e) {
      console.log('Attendance create error:', e?.response?.data || e.message);
      Alert.alert('Error', String(e?.response?.data?.error || 'Failed to save attendance'));
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {item.date} • {item.start_time} → {item.end_time}
      </Text>
      {!!item.task_description && <Text style={styles.cardLine}>🧰 {item.task_description}</Text>}
      {!!item.hours && <Text style={styles.cardLine}>⏱ {item.hours} hrs</Text>}
    </View>
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.h1}>Attendance</Text>
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {/* Filters / Date */}
      <View style={styles.form}>
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
          <Text style={styles.dateBtnText}>{fmtDate(date)}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => {
              setShowDatePicker(false);
              if (d) setDate(d);
            }}
          />
        )}
      </View>

      {/* Add entry */}
      <View style={styles.form}>
        <Text style={styles.label}>Task</Text>
        <TextInput
          style={styles.input}
          value={task}
          onChangeText={setTask}
          placeholder="What did you work on?"
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>Start Time</Text>
        <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateBtn}>
          <Text style={styles.dateBtnText}>{fmtTime(startAt)}</Text>
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={startAt}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => {
              setShowStartPicker(false);
              if (d) setStartAt(d);
            }}
          />
        )}

        <Text style={styles.label}>End Time</Text>
        <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.dateBtn}>
          <Text style={styles.dateBtnText}>{fmtTime(endAt)}</Text>
        </TouchableOpacity>
        {showEndPicker && (
          <DateTimePicker
            value={endAt}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => {
              setShowEndPicker(false);
              if (d) setEndAt(d);
            }}
          />
        )}

        <TouchableOpacity style={styles.button} onPress={submitAttendance}>
          <Text style={styles.buttonText}>Save Entry</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it, idx) => String(it.id ?? idx)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" colors={['#2563eb']} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: '#555' }}>No attendance logs found for {fmtDate(date)}.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f4f7', paddingHorizontal: 16, paddingTop: 12 },
  h1: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 8 },
  errorText: {
    color: '#7f1d1d', backgroundColor: '#fecaca', borderColor: '#ef4444', borderWidth: 1, padding: 8, borderRadius: 8, marginBottom: 8,
  },
  form: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, borderColor: '#e5e7eb', borderWidth: 1 },
  label: { color: '#333', fontSize: 13, marginBottom: 6, marginTop: 4 },
  dateBtn: { height: 44, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#fff' },
  dateBtnText: { color: '#111', fontSize: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, color: '#111' },
  button: { backgroundColor: '#004080', marginTop: 12, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  center: { alignItems: 'center', marginTop: 20 },
  loadingText: { marginTop: 8, color: '#444' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderColor: '#e5e7eb', borderWidth: 1 },
  cardTitle: { color: '#111', fontWeight: '700', marginBottom: 4 },
  cardLine: { color: '#333' },
});
