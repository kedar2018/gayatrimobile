// screens/RegistrationScreen.js
import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  TouchableWithoutFeedback, Keyboard
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api'; // use shared client for /register

export default function RegistrationScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [location, setLocation]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [secure, setSecure]       = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef(null);
  const locationRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const handleRegister = async () => {
    Keyboard.dismiss();

    if (!fullName || !email || !password || !confirm) {
      Alert.alert('Missing info', 'Please fill all required fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const payload = {
        name: fullName.trim(),
        email: email.trim(),
        password,
        password_confirmation: confirm,
        location: (location || '').trim(),
      };

      const res = await api.post('/register', payload);
      const { user_id, name, location: loc, api_token } = res.data || {};

      if (!user_id || !api_token) throw new Error('Unexpected server response');

      await AsyncStorage.multiSet([
        ['user_id', String(user_id)],
        ['user_name', name || payload.name || ''],
        ['DEFAULT_FROM_LOCATION', loc || payload.location || ''],
        ['api_token', api_token],
      ]);

      // optional: set header immediately
      api.defaults.headers.Authorization = `Token token=${api_token}`;

      navigation.replace('MainTabs');
    } catch (err) {
      console.log('Registration Error:', err?.response?.data || err.message);
      Alert.alert('Registration failed', String(err?.response?.data?.error || err.message || 'Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={20}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.inner}>
              <Text style={styles.title}>Create Account</Text>

              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="First Last"
                placeholderTextColor="#888"
                value={fullName}
                onChangeText={setFullName}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => emailRef.current?.focus?.()}
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#888"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => locationRef.current?.focus?.()}
              />

              <Text style={styles.label}>Location (optional)</Text>
              <TextInput
                ref={locationRef}
                style={styles.input}
                placeholder="City / Office"
                placeholderTextColor="#888"
                value={location}
                onChangeText={setLocation}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus?.()}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#888"
                secureTextEntry={secure}
                value={password}
                onChangeText={setPassword}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => confirmRef.current?.focus?.()}
              />

              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                ref={confirmRef}
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#888"
                secureTextEntry={secure}
                value={confirm}
                onChangeText={setConfirm}
                returnKeyType="go"
                onSubmitEditing={handleRegister}
              />

              <TouchableOpacity style={styles.toggle} onPress={() => setSecure(s => !s)} activeOpacity={0.7}>
                <Text style={styles.toggleText}>{secure ? 'Show' : 'Hide'} Password</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, submitting && styles.buttonDisabled]} onPress={handleRegister} disabled={submitting} activeOpacity={0.85}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkWrap} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Already have an account? Login</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f7' },
  scrollContainer: { flexGrow: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#004080', textAlign: 'center', marginBottom: 20 },
  label: { color: '#333', fontSize: 13, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 6, fontSize: 16, borderColor: '#ccc', borderWidth: 1, color: '#000' },
  toggle: { alignSelf: 'flex-end', marginTop: 6, marginBottom: 16 },
  toggleText: { color: '#004080', fontSize: 13, fontWeight: '600' },
  button: { backgroundColor: '#004080', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  linkWrap: { alignItems: 'center', marginTop: 16 },
  linkText: { color: '#004080', fontWeight: '600' },
});
