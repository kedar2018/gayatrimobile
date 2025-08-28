// screens/CcrPdfFormScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ActivityIndicator, Alert,
  ScrollView, Button, Platform,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// ⬇️ Replace with your config if you have one
// import { API_URL } from '../utils/config';
const API_URL = 'https://134.199.178.17/gayatri';

export default function CcrPdfFormScreen({ route }) {
  const incomingReport = route?.params?.report || null;

  const [loading, setLoading] = useState(!incomingReport);
  const [submitting, setSubmitting] = useState(false);

  const [report, setReport] = useState(incomingReport);
  const [workDone, setWorkDone] = useState('');
  const [remarks, setRemarks] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [visitedAt, setVisitedAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // If only id was passed, you can fetch detail like this:
  useEffect(() => {
    (async () => {
      if (incomingReport) {
        preset(incomingReport);
        return;
      }
      // Example if you had route.params.reportId:
      // const res = await axios.get(`${API_URL}/api/call_reports/${reportId}`);
      // setReport(res.data); preset(res.data); setLoading(false);
    })();
  }, []);

  const preset = (r) => {
    setReport(r);
    // Pre-fill from existing fields if any
    setWorkDone(r?.work_done || '');
    setRemarks(r?.remarks || '');
    setPartsUsed(r?.parts_used || '');
  };

  const onSubmit = async () => {
    if (!report?.id) {
      Alert.alert('Missing', 'Invalid report.');
      return;
    }
    if (!workDone.trim()) {
      Alert.alert('Missing', 'Please fill Work Done.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        work_done: workDone,
        remarks,
        parts_used: partsUsed,
        visited_at: visitedAt.toISOString(),
      };

      // Adjust to your Rails route
      const url = `${API_URL}/api/call_reports/${report.id}/generate_pdf`;
      const resp = await axios.post(url, payload);

      const pdfUrl = resp?.data?.pdf_url || resp?.data?.url || resp?.data?.pdf;
      if (!pdfUrl) {
        Alert.alert('Error', 'Backend did not return a pdf_url.');
        return;
      }

      const filename = `CCR_${report.case_id || report.id}.pdf`;
      const localUri = FileSystem.documentDirectory + filename;

      const dl = await FileSystem.downloadAsync(pdfUrl, localUri);
      if (dl.status !== 200) {
        Alert.alert('Download Failed', `HTTP ${dl.status}`);
        return;
      }

      if (Platform.OS === 'android') {
        try {
          const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (perm.granted) {
            const base64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
            const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
              perm.directoryUri, filename, 'application/pdf'
            );
            await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            Alert.alert('Saved', 'PDF saved to chosen folder.');
            return;
          }
        } catch (e) {
          console.log('SAF save error:', e);
        }
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri);
      } else {
        Alert.alert('Downloaded', `Saved to app files:\n${dl.uri}`);
      }
    } catch (err) {
      console.log('Submit/gen error:', err?.response?.data || err.message);
      Alert.alert('Error', 'Failed to generate/download PDF.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  const cd = report?.customer_detail || {};
  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Generate PDF</Text>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Case Details</Text>
        <Text style={styles.kv}><Text style={styles.k}>Case ID:</Text> {report?.case_id || report?.id}</Text>
        {report?.serial_number ? (
          <Text style={styles.kv}><Text style={styles.k}>Serial #:</Text> {report.serial_number}</Text>
        ) : null}
        {cd?.customer_name ? (
          <Text style={styles.kv}><Text style={styles.k}>Customer:</Text> {cd.customer_name}</Text>
        ) : null}
        {(cd?.mobile_number || cd?.phone_number) ? (
          <Text style={styles.kv}><Text style={styles.k}>Phone:</Text> {cd.mobile_number || cd.phone_number}</Text>
        ) : null}
        {(report?.address || cd?.address) ? (
          <Text style={styles.kv}><Text style={styles.k}>Address:</Text> {report?.address || cd?.address}{cd?.city ? `, ${cd.city}` : ''}</Text>
        ) : null}
        {report?.status ? (
          <Text style={styles.kv}><Text style={styles.k}>Status:</Text> {report.status}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Fill for PDF</Text>

        <Text style={styles.label}>Work Done *</Text>
        <TextInput
          style={styles.input}
          placeholder="Describe the work done"
          value={workDone}
          onChangeText={setWorkDone}
          multiline
        />

        <Text style={styles.label}>Parts Used</Text>
        <TextInput
          style={styles.input}
          placeholder="Comma-separated parts"
          value={partsUsed}
          onChangeText={setPartsUsed}
          multiline
        />

        <Text style={styles.label}>Remarks</Text>
        <TextInput
          style={styles.input}
          placeholder="Any remarks"
          value={remarks}
          onChangeText={setRemarks}
          multiline
        />

        <Text style={styles.label}>Visited At</Text>
        <Button title={visitedAt.toLocaleString()} onPress={() => setShowDatePicker(true)} />
        {showDatePicker && (
          <DateTimePicker
            value={visitedAt}
            mode="datetime"
            is24Hour
            onChange={(e, d) => {
              setShowDatePicker(false);
              if (d) setVisitedAt(d);
            }}
          />
        )}

        <View style={{ marginTop: 16 }}>
          <Button title={submitting ? 'Submitting…' : 'Submit & Download PDF'} onPress={onSubmit} disabled={submitting} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f7f9fc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHeader: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  kv: { fontSize: 14, marginVertical: 2 },
  k: { fontWeight: '600' },
  label: { fontSize: 14, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, minHeight: 44 },
});
