// screens/RegisterScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, TouchableWithoutFeedback, Keyboard, Modal, Pressable, StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api'; // baseURL -> https://134.199.178.17/gayatri/api
import { MaterialIcons } from '@expo/vector-icons';

/* Simple debounce (no external deps) */
const debounce = (fn, delay = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
};

const normalize = (s) => String(s || '').trim().toLowerCase();

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Handled Cities — searchable multi-select + create
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState([]);       // [{id, name}]
  const [loadingCities, setLoadingCities] = useState(false);
  const [creatingCity, setCreatingCity] = useState(false);
  const [selectedCities, setSelectedCities] = useState([]); // [{id, name}]
  const selectedIdSet = useMemo(() => new Set(selectedCities.map(c => c.id)), [selectedCities]);

  const emailRef = useRef(null);
  const mobileRef = useRef(null);
  const locationRef = useRef(null);
  const passwordRef = useRef(null);
  const password2Ref = useRef(null);

  // Fetch cities by query (server returns [{id, name}])
  const fetchCities = async (q = '') => {
    try {
      setLoadingCities(true);
      const res = await api.get('/areas', { params: { q, limit: 20 } });
      setCityResults(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.log('Cities fetch error:', e?.response?.data || e.message);
    } finally {
      setLoadingCities(false);
    }
  };
  const debouncedFetch = useMemo(() => debounce(fetchCities, 250), []);

  // Open modal: preload with empty query suggestions
  useEffect(() => {
    if (cityModalOpen) {
      setCityQuery('');
      fetchCities('');
    }
  }, [cityModalOpen]);

  const toggleCity = (city) => {
    setSelectedCities(prev => {
      const exists = prev.find(c => c.id === city.id);
      if (exists) return prev.filter(c => c.id !== city.id);
      return [...prev, city];
    });
  };

  const removeChip = (id) => {
    setSelectedCities(prev => prev.filter(c => c.id !== id));
  };

  const canCreateCity = (() => {
    const q = normalize(cityQuery);
    if (!q) return false;
    const existsInResults = cityResults.some(r => normalize(r.name) === q);
    const existsInSelected = selectedCities.some(c => normalize(c.name) === q);
    return !existsInResults && !existsInSelected;
  })();

  const createCity = async (nameToCreate) => {
    const clean = String(nameToCreate || '').trim();
    if (!clean) return;
    if (!canCreateCity) return;

    try {
      setCreatingCity(true);
      // Assumes server accepts { area: { name: "..." } } and returns { id, name }
      const res = await api.post('/areas', { area: { name: clean } });
      const area = res?.data?.id ? res.data : null;
      if (!area) throw new Error('Invalid create area response');
      setSelectedCities(prev => [...prev, area]);
      // Clear query and refresh result list
      setCityQuery('');
      fetchCities('');
    } catch (e) {
      console.log('Create area error:', e?.response?.data || e.message);
      const msg = e?.response?.data?.errors
        ? (Array.isArray(e.response.data.errors) ? e.response.data.errors.join('\n') : String(e.response.data.errors))
        : e.message;
      Alert.alert('Could not create city', msg);
    } finally {
      setCreatingCity(false);
    }
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
          // Send names as per your registration API
          handle_location: selectedCities.map(c => c.name),
        },
      };

      const res = await api.post('/register', payload);
      const {
        user_id, name: rName, location: rLoc, mobile_no, api_token,
        handle_cities, areas, areas_by_city,
      } = res.data || {};

      await AsyncStorage.multiSet([
        ['user_id', String(user_id)],
        ['user_name', rName || name || ''],
        ['DEFAULT_FROM_LOCATION', rLoc || location || ''],
        ['api_token', api_token || ''],
        ['user_mobile', mobile_no || mobile || ''],
        ['user_email', email || ''],
        ['handle_cities', JSON.stringify(handle_cities || selectedCities.map(c => c.name) || [])],
        ['areas', JSON.stringify(areas || [])],
        ['areas_by_city', JSON.stringify(areas_by_city || {})],
      ]);

      if (api_token) api.defaults.headers.Authorization = `Token token=${api_token}`;

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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.inner}>
              <View style={styles.card}>
                <Text style={styles.title}>Create Account</Text>

                {/* Name */}
                <View style={styles.inputRow}>
                  <MaterialIcons name="person-outline" size={20} color="#64748b" />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#94a3b8"
                    value={name}
                    onChangeText={setName}
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus?.()}
                  />
                </View>

                {/* Email */}
                <View style={styles.inputRow}>
                  <MaterialIcons name="alternate-email" size={20} color="#64748b" />
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    returnKeyType="next"
                    onSubmitEditing={() => mobileRef.current?.focus?.()}
                  />
                </View>

                {/* Mobile */}
                <View style={styles.inputRow}>
                  <MaterialIcons name="phone-iphone" size={20} color="#64748b" />
                  <TextInput
                    ref={mobileRef}
                    style={styles.input}
                    placeholder="Mobile Number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={mobile}
                    onChangeText={setMobile}
                    returnKeyType="next"
                    onSubmitEditing={() => locationRef.current?.focus?.()}
                  />
                </View>

                {/* Location */}
                <View style={styles.inputRow}>
                  <MaterialIcons name="place" size={20} color="#64748b" />
                  <TextInput
                    ref={locationRef}
                    style={styles.input}
                    placeholder="Location (optional)"
                    placeholderTextColor="#94a3b8"
                    value={location}
                    onChangeText={setLocation}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus?.()}
                  />
                </View>

                {/* Handled Cities (chips + open search) */}
                <Text style={[styles.label, { marginTop: 6, marginBottom: 6 }]}>Handled Cities (optional)</Text>

                {selectedCities.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                    {selectedCities.map((c) => (
                      <View key={c.id} style={styles.chip}>
                        <Text style={styles.chipText}>{c.name}</Text>
                        <TouchableOpacity onPress={() => removeChip(c.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          <MaterialIcons name="close" size={14} color="#1e3a8a" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.inputRow, { justifyContent: 'space-between' }]}
                  onPress={() => setCityModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <MaterialIcons name="location-city" size={20} color="#64748b" />
                    <Text style={{ marginLeft: 10, color: '#94a3b8', flexShrink: 1 }}>
                      {selectedCities.length ? 'Add more cities' : 'Search & select cities'}
                    </Text>
                  </View>
                  <MaterialIcons name="search" size={20} color="#64748b" />
                </TouchableOpacity>

                {/* Modal: search + create */}
                <Modal
                  visible={cityModalOpen}
                  animationType="slide"
                  transparent
                  onRequestClose={() => setCityModalOpen(false)}
                >
                  <Pressable style={styles.modalOverlay} onPress={() => setCityModalOpen(false)}>
                    <Pressable style={styles.modalSheet}>
                      <Text style={styles.modalTitle}>Select handled cities</Text>

                      {/* Search bar */}
                      <View style={styles.searchRow}>
                        <MaterialIcons name="search" size={20} color="#64748b" />
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Type city name"
                          placeholderTextColor="#94a3b8"
                          value={cityQuery}
                          onChangeText={(t) => {
                            setCityQuery(t);
                            debouncedFetch(t);
                          }}
                          autoFocus
                        />
                        {!!cityQuery && (
                          <TouchableOpacity onPress={() => { setCityQuery(''); fetchCities(''); }}>
                            <MaterialIcons name="close" size={20} color="#64748b" />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Create-new suggestion */}
                      {canCreateCity && (
                        <TouchableOpacity
                          style={styles.createRow}
                          onPress={() => createCity(cityQuery)}
                          activeOpacity={0.9}
                          disabled={creatingCity}
                        >
                          {creatingCity ? (
                            <ActivityIndicator />
                          ) : (
                            <>
                              <MaterialIcons name="add-location-alt" size={20} color="#2563eb" />
                              <Text style={styles.createText}>Create “{cityQuery.trim()}”</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {/* Results list (ScrollView to avoid nested VL warnings) */}
                      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: '60%' }}>
                        {loadingCities ? (
                          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                            <ActivityIndicator />
                          </View>
                        ) : cityResults.length ? (
                          cityResults.map((c) => {
                            const checked = selectedIdSet.has(c.id);
                            return (
                              <Pressable key={c.id} onPress={() => toggleCity(c)} style={styles.cityRow}>
                                <View style={[
                                  styles.checkbox,
                                  { borderColor: checked ? '#2563eb' : '#94a3b8', backgroundColor: checked ? '#2563eb' : 'transparent' }
                                ]}>
                                  {checked ? <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text> : null}
                                </View>
                                <Text style={styles.cityText}>{c.name}</Text>
                              </Pressable>
                            );
                          })
                        ) : (
                          !canCreateCity && <Text style={{ padding: 12, color: '#64748b' }}>No results.</Text>
                        )}
                      </ScrollView>

                      <View style={styles.modalActions}>
                        <TouchableOpacity onPress={() => setCityModalOpen(false)} style={styles.modalBtnGhost}>
                          <Text style={{ color: '#ef4444', fontWeight: '600' }}>Close</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setCityModalOpen(false)} style={styles.modalBtnPrimary}>
                          <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </Pressable>
                  </Pressable>
                </Modal>

                {/* Password */}
                <View style={styles.inputRow}>
                  <MaterialIcons name="lock-outline" size={20} color="#64748b" />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    returnKeyType="next"
                    onSubmitEditing={() => password2Ref.current?.focus?.()}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputRow}>
                  <MaterialIcons name="lock-outline" size={20} color="#64748b" />
                  <TextInput
                    ref={password2Ref}
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword2}
                    value={password2}
                    onChangeText={setPassword2}
                    returnKeyType="go"
                    onSubmitEditing={handleRegister}
                  />
                  <TouchableOpacity onPress={() => setShowPassword2((s) => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name={showPassword2 ? 'visibility' : 'visibility-off'} size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Register Button */}
                <TouchableOpacity
                  style={[styles.button, submitting && { opacity: 0.85 }]}
                  onPress={handleRegister}
                  disabled={submitting}
                  activeOpacity={0.9}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.buttonInner}>
                      <MaterialIcons name="person-add" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Register</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Login link */}
                <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => navigation.replace('Login')}>
                  <Text style={{ color: '#004080', fontWeight: '600' }}>Already have an account? Login</Text>
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
  scroll: { flexGrow: 1 },
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
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569' },
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
  input: { flex: 1, fontSize: 16, color: '#0f172a' },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: '#eef2ff', marginRight: 8, marginBottom: 6, gap: 6,
    borderWidth: 1, borderColor: '#c7d2fe',
  },
  chipText: { color: '#1e3a8a', fontWeight: '700' },
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

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalSheet: {
    marginTop: 'auto',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 12, height: 46, marginBottom: 10, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#0f172a' },

  createRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8,
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 8,
  },
  createText: { color: '#1d4ed8', fontWeight: '700' },

  cityRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  checkbox: {
    width: 22, height: 22, marginRight: 12, borderRadius: 4,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  cityText: { fontSize: 15, color: '#0f172a' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 10 },
  modalBtnGhost: { paddingHorizontal: 14, paddingVertical: 10 },
  modalBtnPrimary: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#2563eb', borderRadius: 8 },
});

