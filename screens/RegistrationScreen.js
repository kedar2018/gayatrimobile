// screens/RegisterScreen.js
import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api'; // baseURL should point to https://134.199.178.17/gayatri/api
global.S = S;                         // ← optional: use global across screens

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef(null);
  const mobileRef = useRef(null);
  const locationRef = useRef(null);
  const passwordRef = useRef(null);
  const password2Ref = useRef(null);

  const validate = () => {
    if (!name || !email || !mobile || !password || !password2) {
      Alert.alert('Missing info', 'Please fill all required fields.');
      return false;
    }
    if (password !== password2) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return false;
    }
    const clean = mobile.replace(/\s+/g, '');
    if (!/^\+?\d{10,15}$/.test(clean)) {
      Alert.alert('Invalid mobile', 'Enter a valid mobile number (10–15 digits, optional +).');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        user: {
          name,
          email,
          password,
          password_confirmation: password2,
          location,
          mobile_no: mobile.replace(/\s+/g, ''),
        },
      };

      // POST /api/register
      const res = await api.post('/register', payload);
      const { user_id, name: rName, location: rLoc, mobile_no, api_token } = res.data || {};

      await AsyncStorage.multiSet([
        ['user_id', String(user_id)],
        ['user_name', rName || name || ''],
        ['DEFAULT_FROM_LOCATION', rLoc || location || ''],
        ['api_token', api_token || ''],
        ['user_mobile', mobile_no || mobile || ''],
        ['user_email', email || ''],
      ]);

      if (api_token) {
        api.defaults.headers.Authorization = `Token token=${api_token}`;
      }

      Alert.alert('Success', 'Account created.');
      navigation.replace('MainTabs');
    } catch (err) {
      console.log('Register error:', err?.response?.data || err.message);
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors) {
        Alert.alert('Registration failed', Array.isArray(serverErrors) ? serverErrors.join('\n') : String(serverErrors));
      } else {
        Alert.alert('Registration failed', 'Please check your details and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={S.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled">
            <View style={S.inner}>
              <Text style={S.title}>Create Account</Text>

              <TextInput
                style={S.input}
                placeholder="Full Name"
                placeholderTextColor="#888"
                value={name}
                onChangeText={setName}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus?.()}
              />

              <TextInput
                ref={emailRef}
                style={S.input}
                placeholder="Email"
                placeholderTextColor="#888"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
                onSubmitEditing={() => mobileRef.current?.focus?.()}
              />

              <TextInput
                ref={mobileRef}
                style={S.input}
                placeholder="Mobile Number"
                placeholderTextColor="#888"
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={setMobile}
                returnKeyType="next"
                onSubmitEditing={() => locationRef.current?.focus?.()}
              />

              <TextInput
                ref={locationRef}
                style={S.input}
                placeholder="Location (optional)"
                placeholderTextColor="#888"
                value={location}
                onChangeText={setLocation}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus?.()}
              />

              <TextInput
                ref={passwordRef}
                style={S.input}
                placeholder="Password"
                placeholderTextColor="#888"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                returnKeyType="next"
                onSubmitEditing={() => password2Ref.current?.focus?.()}
              />

              <TextInput
                ref={password2Ref}
                style={S.input}
                placeholder="Confirm Password"
                placeholderTextColor="#888"
                secureTextEntry
                value={password2}
                onChangeText={setPassword2}
                returnKeyType="go"
                onSubmitEditing={handleRegister}
              />

              <TouchableOpacity
                style={S.button}
                onPress={handleRegister}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={S.buttonText}>Register</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => navigation.replace('Login')}>
                <Text style={{ color: '#004080', fontWeight: '600' }}>Already have an account? Login</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

