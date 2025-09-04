// screens/RegisterScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, TouchableWithoutFeedback, Keyboard, Modal, Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api'; // baseURL should point to https://134.199.178.17/gayatri/api
import S from '../styles/AppStyles';   // ← created once & cached

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Cities for handle_location
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [selectedCities, setSelectedCities] = useState([]);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const selectedCitiesSet = useMemo(() => new Set(selectedCities), [selectedCities]);

  const emailRef = useRef(null);
  const mobileRef = useRef(null);
  const locationRef = useRef(null);
  const passwordRef = useRef(null);
  const password2Ref = useRef(null);

  useEffect(() => {
    const loadCities = async () => {
      try {
        setLoadingCities(true);
        const res = await api.get('/areas');
        const arr = Array.isArray(res?.data?.cities) ? res.data.cities : [];
        setCities(arr);
      } catch (e) {
        console.log('Cities fetch error:', e?.response?.data || e.message);
        Alert.alert('Network', 'Could not load city list. You can still register without selecting handled cities.');
      } finally {
        setLoadingCities(false);
      }
    };
    loadCities();
  }, []);

  const toggleCity = (city) => {
    setSelectedCities((prev) => {
      if (prev.includes(city)) return prev.filter((c) => c !== city);
      return [...prev, city];
    });
  };

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
    // handled cities are optional during registration; enforce if you want:
    // if (!selectedCities.length) { Alert.alert('Handled cities', 'Please select at least one handled city.'); return false; }
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
          handle_location: selectedCities, // array of city names
        },
      };

      const res = await api.post('/register', payload);

      const {
        user_id,
        name: rName,
        location: rLoc,
        mobile_no,
        api_token,
        handle_cities,
        areas,
        areas_by_city,
      } = res.data || {};

      await AsyncStorage.multiSet([
        ['user_id', String(user_id)],
        ['user_name', rName || name || ''],
        ['DEFAULT_FROM_LOCATION', rLoc || location || ''],
        ['api_token', api_token || ''],
        ['user_mobile', mobile_no || mobile || ''],
        ['user_email', email || ''],
        // new:
        ['handle_cities', JSON.stringify(handle_cities || selectedCities || [])],
        ['areas', JSON.stringify(areas || [])],
        ['areas_by_city', JSON.stringify(areas_by_city || {})],
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

              {/* Handled Cities multi-select */}
              <View style={{ marginTop: 8, marginBottom: 12 }}>
                <Text style={[S.label, { marginBottom: 6 }]}>Handled Cities (optional)</Text>

                <TouchableOpacity
                  style={[S.input, { justifyContent: 'center' }]}
                  onPress={() => setCityModalOpen(true)}
                  activeOpacity={0.85}
                  disabled={loadingCities}
                >
                  {loadingCities ? (
                    <Text style={{ color: '#888' }}>Loading cities…</Text>
                  ) : selectedCities.length ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {selectedCities.map((c) => (
                        <View key={c} style={{
                          paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
                          backgroundColor: '#eef2ff', marginRight: 8, marginBottom: 6,
                        }}>
                          <Text style={{ color: '#1e3a8a', fontWeight: '600' }}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ color: '#888' }}>Select handled cities</Text>
                  )}
                </TouchableOpacity>

                <Modal
                  visible={cityModalOpen}
                  animationType="slide"
                  transparent
                  onRequestClose={() => setCityModalOpen(false)}
                >
                  <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setCityModalOpen(false)}>
                    <Pressable style={{
                      marginTop: 'auto',
                      backgroundColor: '#fff',
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                      padding: 16,
                      maxHeight: '70%',
                    }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Select handled cities</Text>
                      <ScrollView>
                        {cities.map((c) => {
                          const checked = selectedCitiesSet.has(c);
                          return (
                            <Pressable
                              key={c}
                              onPress={() => toggleCity(c)}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: '#eee',
                              }}
                            >
                              <View style={{
                                width: 22, height: 22, marginRight: 12, borderRadius: 4,
                                borderWidth: 2, borderColor: checked ? '#2563eb' : '#94a3b8',
                                backgroundColor: checked ? '#2563eb' : 'transparent',
                                alignItems: 'center', justifyContent: 'center',
                              }}>
                                {checked ? <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text> : null}
                              </View>
                              <Text style={{ fontSize: 15, color: '#0f172a' }}>{c}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>

                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                        <TouchableOpacity
                          onPress={() => setCityModalOpen(false)}
                          style={{ paddingHorizontal: 14, paddingVertical: 10, marginRight: 10 }}
                        >
                          <Text style={{ color: '#ef4444', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setCityModalOpen(false)}
                          style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#2563eb', borderRadius: 8 }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </Pressable>
                  </Pressable>
                </Modal>
              </View>

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
