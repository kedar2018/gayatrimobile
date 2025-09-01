// screens/LoginScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api'; // ✅ new

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef(null);

  const handleLogin = async () => {
    Keyboard.dismiss(); // one tap to hide keyboard and submit

    if (!email || !password) {
      Alert.alert('Please enter both email and password');
      return;
    }

    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post('https://134.199.178.17/gayatri/api/login', { email, password });
      const { user_id, name, location, api_token } = res.data;

      await AsyncStorage.multiSet([
        ['user_id', String(user_id)],
        ['user_name', name || ''],
        ['DEFAULT_FROM_LOCATION', location || ''],
        ['api_token', api_token || ''],
      ]);

      if (api_token) {
        api.defaults.headers.Authorization = `Token token=${api_token}`;
      }

      navigation.replace('MainTabs');
    } catch (err) {
      console.log('Login Error:', err);
      if (err.response) {
        console.log('Status:', err.response.status);
        console.log('Data:', err.response.data);
        console.log('Headers:', err.response.headers);
      } else if (err.request) {
        console.log('Request:', err.request);
      } else {
        console.log('Error Message:', err.message);
      }
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
      {/* ✅ EXACTLY ONE CHILD for TouchableWithoutFeedback */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.inner}>
              <Text style={styles.title}>Engineer Login</Text>

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#888"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor="#004080"
                underlineColorAndroid="transparent"
                returnKeyType="next"
                blurOnSubmit={false}
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() => passwordRef.current?.focus?.()}
              />

              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#888"
                secureTextEntry
                returnKeyType="go"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleLogin}
              />

              <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginTop: 16, alignItems: 'center' }}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={{ color: '#004080', fontWeight: '600' }}>
                  New here? Create an account
                </Text>
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
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#004080',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderColor: '#ccc',
    borderWidth: 1,
    color: '#000',
  },
  button: {
    backgroundColor: '#004080',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
