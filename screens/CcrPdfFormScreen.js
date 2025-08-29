// screens/CcrPdfFormScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Button,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

// TODO: replace with your real backend base URL or config import
const API_URL = 'https://134.199.178.17/gayatri';

export default function CcrPdfFormScreen({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Hide the bottom tab bar on this screen (safe even if no tabs parent)
  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent?.();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => parent?.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );

  const incomingReport = route?.params?.report || null;

  const [loading, setLoading] = useState(!incomingReport);
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState(incomingReport);

  // ---- Your requested fields ----
  const [problemReported, setProblemReported] = useState('');
  const [logInTime, setLogInTime] = useState(new Date());
  const [arrivalTime, setArrivalTime] = useState(new Date());
  const [closureTime, setClosureTime] = useState(new Date());
  const [condition, setCondition] = useState('');
  const [defectivePartDesc, setDefectivePartDesc] = useState('');
  const [defectivePartNo, setDefectivePartNo] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [replacedPartDesc, setReplacedPartDesc] = useState('');
  const [replacedPartNo, setReplacedPartNo] = useState('');
  const [customerSignature, setCustomerSignature] = useState('');

  // datetime pickers visibility
  const [showLogPicker, setShowLogPicker] = useState(false);
  const [showArrPicker, setShowArrPicker] = useState(false);
  const [showClosePicker, setShowClosePicker] = useState(false);

  useEffect(() => {
    if (incomingReport) {
      setReport(incomingReport);
      // Prefill here if backend returns any of these keys on the report:
      // setProblemReported(incomingReport.problem_reported || '');
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const onSubmit = async () => {
    if (!report?.id) {
      Alert.alert('Missing', 'Invalid report.');
      return;
    }
    if (!problemReported.trim()) {
      Alert.alert('Missing', 'Please fill Problem Reported.');
      return;
    }
    if (!customerSignature.trim()) {
      Alert.alert('Missing', 'Please fill Signature of Customer.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        problem_reported: problemReported,
        call_log_in_time: logInTime.toISOString(),
        actual_arrival_time: arrivalTime.toISOString(),
        call_closure_time: closureTime.toISOString(),
        condition_of_machine: condition,
        defective_part_description: defectivePartDesc,
        defective_part_number: defectivePartNo,
        action_taken: actionTaken,
        replaced_part_description: replacedPartDesc,
        replaced_part_number: replacedPartNo,
        customer_signature: customerSignature, // text for now
      };

      const url = `${API_URL}/api/call_reports/${report.id}/generate_pdf`;
      const resp = await axios.post(url, payload);
      const pdfUrl = resp?.data?.pdf_url || resp?.data?.url || resp?.data?.pdf;

      if (!pdfUrl) {
        Alert.alert('Error', 'Backend did not return a pdf_url.');
        return;
      }

      const ok = await Linking.openURL(pdfUrl).catch(() => false);
      if (!ok) Alert.alert('Open Failed', 'Could not open the PDF URL.');
    } catch (err) {
      console.log('Submit/gen error:', err?.response?.data || err.message);
      Alert.alert('Error', 'Failed to generate/open PDF.');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f9fc' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.container,
            // Keep content above the bottom safe area (works with/without tabs)
            { paddingBottom: 24 + insets.bottom },
          ]}
        >
          <Text style={styles.title}>Generate PDF</Text>

          {/* Case Details (read-only) */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Case Details</Text>
            <Text style={styles.kv}>
              <Text style={styles.k}>Case ID:</Text> {report?.case_id || report?.id}
            </Text>
            {report?.serial_number ? (
              <Text style={styles.kv}>
                <Text style={styles.k}>Serial #:</Text> {report.serial_number}
              </Text>
            ) : null}
            {cd?.customer_name ? (
              <Text style={styles.kv}>
                <Text style={styles.k}>Customer:</Text> {cd.customer_name}
              </Text>
            ) : null}
            {(cd?.mobile_number || cd?.phone_number) ? (
              <Text style={styles.kv}>
                <Text style={styles.k}>Phone:</Text> {cd.mobile_number || cd.phone_number}
              </Text>
            ) : null}
            {(report?.address || cd?.address) ? (
              <Text style={styles.kv}>
                <Text style={styles.k}>Address:</Text> {report?.address || cd?.address}
                {cd?.city ? `, ${cd.city}` : ''}
              </Text>
            ) : null}
            {report?.status ? (
              <Text style={styles.kv}>
                <Text style={styles.k}>Status:</Text> {report.status}
              </Text>
            ) : null}
          </View>

          {/* Editable Fields */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Fill Details</Text>

            <Text style={styles.label}>Problem Reported *</Text>
            <TextInput
              style={styles.input}
              placeholder="Describe the problem reported"
              value={problemReported}
              onChangeText={setProblemReported}
              multiline
            />

            <Text style={styles.label}>Call Log In Time</Text>
            <Button title={logInTime.toLocaleString()} onPress={() => setShowLogPicker(true)} />
            {showLogPicker && (
              <DateTimePicker
                value={logInTime}
                mode="datetime"
                is24Hour
                onChange={(e, d) => {
                  setShowLogPicker(false);
                  if (d) setLogInTime(d);
                }}
              />
            )}

            <Text style={styles.label}>Actual Arrival Time</Text>
            <Button title={arrivalTime.toLocaleString()} onPress={() => setShowArrPicker(true)} />
            {showArrPicker && (
              <DateTimePicker
                value={arrivalTime}
                mode="datetime"
                is24Hour
                onChange={(e, d) => {
                  setShowArrPicker(false);
                  if (d) setArrivalTime(d);
                }}
              />
            )}

            <Text style={styles.label}>Call Closure Time</Text>
            <Button title={closureTime.toLocaleString()} onPress={() => setShowClosePicker(true)} />
            {showClosePicker && (
              <DateTimePicker
                value={closureTime}
                mode="datetime"
                is24Hour
                onChange={(e, d) => {
                  setShowClosePicker(false);
                  if (d) setClosureTime(d);
                }}
              />
            )}

            <Text style={styles.label}>Condition of Machine</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Working / Not working / Intermittent"
              value={condition}
              onChangeText={setCondition}
            />

            <Text style={[styles.cardHeader, { marginTop: 16 }]}>Defective Part</Text>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter defective part description"
              value={defectivePartDesc}
              onChangeText={setDefectivePartDesc}
            />
            <Text style={styles.label}>Part Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter defective part number"
              value={defectivePartNo}
              onChangeText={setDefectivePartNo}
            />

            <Text style={[styles.cardHeader, { marginTop: 16 }]}>Action Taken</Text>
            <TextInput
              style={styles.input}
              placeholder="Describe the action taken"
              value={actionTaken}
              onChangeText={setActionTaken}
              multiline
            />

            <Text style={[styles.cardHeader, { marginTop: 16 }]}>Replaced Part</Text>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter replaced part description"
              value={replacedPartDesc}
              onChangeText={setReplacedPartDesc}
            />
            <Text style={styles.label}>Part Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter replaced part number"
              value={replacedPartNo}
              onChangeText={setReplacedPartNo}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Signature of Customer *</Text>
            <TextInput
              style={styles.input}
              placeholder="Type customer name as signature (can add signature pad later)"
              value={customerSignature}
              onChangeText={setCustomerSignature}
            />

            <View style={{ marginTop: 16 }}>
              <Button
                title={submitting ? 'Submitting…' : 'Submit & Open PDF'}
                onPress={onSubmit}
                disabled={submitting}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  kv: { fontSize: 14, marginVertical: 2 },
  k: { fontWeight: '600' },
  label: { fontSize: 14, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    minHeight: 44,
  },
});

