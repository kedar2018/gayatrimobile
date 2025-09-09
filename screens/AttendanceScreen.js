// screens/AttendanceScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, Alert, Platform
} from 'react-native';
import { api } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import S from '../styles/AppStyles';   // uses S.screen, S.screenPadTop, etc.

export default function AttendanceScreen() {
  const [rows, setRows] = useState([]);
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
  const fmtDate = useCallback((d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, []);
  //const fmtTimeVal = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtTimeVal = (d) => {
  if (!d) return '--:-- AM';
  const h24 = d.getHours();
  const h12 = h24 % 12 || 12;
  const m   = String(d.getMinutes()).padStart(2, '0');
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  return `${h12}:${m} ${ampm}`;
}; 
 const fmtTimeDisplay = (d) => {
    try {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return fmtTimeVal(d); }
  };

  const combineDateAndHHMM = (dateObj, hhmm) => {
    if (!hhmm) return null;
    const [h, m] = String(hhmm).split(':').map((x) => parseInt(x, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const d = new Date(dateObj);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const parseMaybeISO = (val) => {
    if (!val) return null;
    // ISO (contains 'T') or full datetime -> Date
    if (typeof val === 'string' && val.includes('T')) {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    // else assume already Date
    if (val instanceof Date) return val;
    return null;
  };

  const normalizeRow = useCallback((raw, selectedDate) => {
    const dateStr = raw.log_date || raw.date || fmtDate(selectedDate);

    // prefer datetime fields if present
    let start = parseMaybeISO(raw.start_at);
    let end   = parseMaybeISO(raw.end_at);

    // fallback to HH:MM fields bound to the selected date
    if (!start && raw.start_time) start = combineDateAndHHMM(selectedDate, raw.start_time);
    if (!end && raw.end_time)     end   = combineDateAndHHMM(selectedDate, raw.end_time);

    // duration
    let hours = null;
    if (start && end) {
      const diff = Math.max(0, end - start);
      hours = +(diff / 3600000).toFixed(2);
    } else if (typeof raw.hour === 'number') {
      hours = +(+raw.hour).toFixed(2);
    } else if (typeof raw.duration_minutes === 'number') {
      hours = +(raw.duration_minutes / 60).toFixed(2);
    }

    const task = raw.task_description || raw.task || '';

    return {
      id: raw.id ?? `${dateStr}-${raw.start_time ?? raw.start_at ?? Math.random()}`,
      dateStr,
      start,
      end,
      startText: start ? fmtTimeDisplay(start) : (raw.start_time || '—'),
      endText:   end   ? fmtTimeDisplay(end)   : (raw.end_time   || '—'),
      hours,
      task,
    };
  }, [fmtDate]);

  const fetchAttendance = async () => {
    try {
      setError('');
      setLoading(true);
      const engineer_id = await AsyncStorage.getItem('user_id'); // optional; server can derive from token
      const res = await api.get('/attendance_logs', { params: { date: fmtDate(date), engineer_id } });
      const list = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      const normalized = list.map((it) => normalizeRow(it, date));
      setRows(normalized);
    } catch (e) {
      console.log('Attendance fetch error:', e?.response?.data || e.message);
      setError('Failed to load attendance.');
      setRows([]);
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
        start_time: fmtTimeVal(startAt),   // HH:MM; server will parse with Time.zone
        end_time:   fmtTimeVal(endAt),
        task_description: (task || '').trim(),
      };
      await api.post('/attendance_logs', payload);
      setTask('');
      setStartAt(new Date());
      setEndAt(new Date());
      await fetchAttendance();
      Alert.alert('Success', 'Attendance saved.');
    } 

 catch (e) {
  console.log('Attendance create error:', e?.response?.data || e.message);

  const data = e?.response?.data;
  let msg = 'Failed to save attendance';

  if (data?.errors) {
    // Join multiple errors into one string
    msg = Array.isArray(data.errors) ? data.errors.join('\n') : String(data.errors);
  } else if (data?.error) {
    msg = String(data.error);
  }

  Alert.alert('Error', msg);
}
  };

  const renderItem = ({ item }) => (
    <View style={S.card}>
      <View style={{ marginBottom: 6 }}>
        <Text style={S.cardTitle}>{item.dateStr}</Text>
      </View>

      <Text style={S.cardLine}>
        ⏰ {item.startText} → {item.endText}
      </Text>

      {!!item.task && (
        <Text style={S.cardLine} numberOfLines={3}>
          🧰 {item.task}
        </Text>
      )}

      <View style={S.badgeRow}>
        <Text style={[S.badge, { backgroundColor: '#1e40af' }]}>
          {item.hours != null ? `${item.hours} hrs` : '—'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[S.screen, S.screenPadTop]}>
      {/* Header */}
      <View style={S.header}>
        <Text style={S.h1}>Attendance</Text>
        {!!error && <Text style={S.errorText}>{error}</Text>}
      </View>

      {/* Filters / Date */}
      <View style={{ paddingHorizontal: 16 }}>
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
      <View style={{ paddingHorizontal: 16 }}>
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
          <Text style={S.dateBtnText}>{fmtTimeVal(startAt)}</Text>
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={startAt}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => {
              setShowStartPicker(false);
              if (d) setStartAt(d);
            }}
          />
        )}

        <Text style={S.label}>End Time</Text>
        <TouchableOpacity onPress={() => setShowEndPicker(true)} style={S.dateBtn}>
          <Text style={S.dateBtnText}>{fmtTimeVal(endAt)}</Text>
        </TouchableOpacity>
        {showEndPicker && (
          <DateTimePicker
            value={endAt}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => {
              setShowEndPicker(false);
              if (d) setEndAt(d);
            }}
          />
        )}

        <TouchableOpacity style={[S.button, { marginTop: 12 }]} onPress={submitAttendance}>
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
          data={rows}
          keyExtractor={(it, idx) => String(it.id ?? idx)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2563eb"
              colors={['#2563eb']}
            />
          }
          ListEmptyComponent={
            <View style={S.emptyWrap}>
              <Text style={S.emptyIcon}>🗓️</Text>
              <Text style={S.emptyTitle}>No attendance logs found for {fmtDate(date)}.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
