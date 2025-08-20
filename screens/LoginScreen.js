import React, { useState } from 'react';
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
  ScrollView
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Please enter both email and password');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post('https://134.199.178.17/gayatri/api/login', { email, password });
      const { user_id, name, location } = res.data;
      await AsyncStorage.setItem('user_id', user_id.toString());
      await AsyncStorage.setItem('user_name', name || '');
      await AsyncStorage.setItem('DEFAULT_FROM_LOCATION', location || '');

      navigation.replace('MainTabs');
    } catch (err) {
        console.log('Login Error:', err); // 👈 This shows error in the Expo console


  // More detailed breakdown:
  if (err.response) {
    // Server responded with a status other than 2xx
    console.log('Status:', err.response.status);
    console.log('Data:', err.response.data);
    console.log('Headers:', err.response.headers);
  } else if (err.request) {
    // Request was made but no response received
    console.log('Request:', err.request);
  } else {
    // Something happened in setting up the request
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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.inner}>
          <Text style={styles.title}>Engineer Login</Text>
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#888" keyboardType="email-address" autoCapitalize="none" onChangeText={setEmail}   selectionColor="#004080" underlineColorAndroid="transparent" />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry onChangeText={setPassword} />
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f7' },
  scrollContainer: { flexGrow: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#004080', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 15, fontSize: 16, borderColor: '#ccc', borderWidth: 1 ,  color: '#000' },
  button: { backgroundColor: '#004080', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
