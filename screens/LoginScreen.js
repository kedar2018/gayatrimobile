// screens/LoginScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';
import { MaterialIcons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef(null);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email || !password) {
      Alert.alert('Please enter both email and password');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await axios.post('https://134.199.178.17/gayatri/api/login', { email, password });
      const { user_id, name, location, api_token, areas } = res.data || {};

      await AsyncStorage.multiSet([
        ['user_id', String(user_id || '')],
        ['user_name', name || ''],
        ['DEFAULT_FROM_LOCATION', location || ''],
        ['api_token', api_token || ''],
        ['areas', JSON.stringify(areas || [])],
      ]);

      if (api_token) api.defaults.headers.Authorization = `Token token=${api_token}`;
      navigation.replace('MainTabs');
    } catch (err) {
      Alert.alert('Login failed', 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={20}
    >
      {/* EXACTLY ONE CHILD for TouchableWithoutFeedback */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.inner}>
              <View style={styles.card}>
                <Text style={styles.title}>Engineer Login</Text>

                {/* Email */}
                <View style={styles.inputRow}>
                  <MaterialIcons name="alternate-email" size={20} color="#64748b" />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    selectionColor="#004080"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    value={email}
                    onChangeText={setEmail}
                    onSubmitEditing={() => passwordRef.current?.focus?.()}
                  />
                </View>

                {/* Password */}
                <View style={styles.inputRow}>
                  <MaterialIcons name="lock-outline" size={20} color="#64748b" />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={handleLogin}
                    returnKeyType="go"
                  />
                  <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Login button with icon */}
                <TouchableOpacity
                  style={[styles.button, submitting && { opacity: 0.85 }]}
                  onPress={handleLogin}
                  disabled={submitting}
                  activeOpacity={0.9}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.buttonInner}>
                      <MaterialIcons name="login" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Login</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Register link */}
                <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => navigation.navigate('Register')}>
                  <Text style={{ color: '#004080', fontWeight: '600' }}>New here? Create an account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContainer: { flexGrow: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#004080',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

