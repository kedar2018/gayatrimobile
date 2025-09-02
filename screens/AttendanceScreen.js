// screens/AttendanceScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, Alert, Platform
} from 'react-native';
import { api } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
global.S = S;                         // ← optional: use global across screens

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
    <View style={S.card}>
      <Text style={S.cardTitle}>
        {item.date} • {item.start_time} → {item.end_time}
      </Text>
      {!!item.task_description && <Text style={S.cardLine}>🧰 {item.task_description}</Text>}
      {!!item.hours && <Text style={S.cardLine}>⏱ {item.hours} hrs</Text>}
    </View>
  );

  return (
    <View style={S.screen}>
      <Text style={S.h1}>Attendance</Text>
      {!!error && <Text style={S.errorText}>{error}</Text>}

      {/* Filters / Date */}
      <View style={S.form}>
        <Text style={S.label}>Date</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={S.dateBtn}>
          <Text style={S.dateBtnText}>{fmtDate(date)}</Text>
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
      <View style={S.form}>
        <Text style={S.label}>Task</Text>
        <TextInput
          style={S.input}
          value={task}
          onChangeText={setTask}
          placeholder="What did you work on?"
          placeholderTextColor="#888"
        />

        <Text style={S.label}>Start Time</Text>
        <TouchableOpacity onPress={() => setShowStartPicker(true)} style={S.dateBtn}>
          <Text style={S.dateBtnText}>{fmtTime(startAt)}</Text>
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

        <Text style={S.label}>End Time</Text>
        <TouchableOpacity onPress={() => setShowEndPicker(true)} style={S.dateBtn}>
          <Text style={S.dateBtnText}>{fmtTime(endAt)}</Text>
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

        <TouchableOpacity style={S.button} onPress={submitAttendance}>
          <Text style={S.buttonText}>Save Entry</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={S.center}>
          <ActivityIndicator />
          <Text style={S.loadingText}>Loading…</Text>
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
