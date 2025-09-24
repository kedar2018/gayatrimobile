// screens/CustomerCallReportListScreen.js
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, RefreshControl, ActivityIndicator,
  TouchableOpacity, StyleSheet, Platform, Alert, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from '../utils/api';

const SAF_DIR_KEY = 'safDirUri'; // remember Android folder once

export default function CustomerCallReportListScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();

  const [items, setItems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      const engineer_id = await AsyncStorage.getItem('user_id');
      const res = await api.get('/customer_call_reports', { params: { engineer_id } });
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setItems(data);
    } catch (e) {
      console.log('CCR list error:', e?.response?.data || e.message);
      Alert.alert('Error', 'Failed to load reports.');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  useFocusEffect(useCallback(() => { fetchReports(); }, [fetchReports]));

  const onRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    fetchReports();
  };

  const sanitize = (s = '') =>
    s.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');

  const getAuthHeaders = async () => {
    const hdr =
      api?.defaults?.headers?.common?.Authorization ||
      api?.defaults?.headers?.Authorization ||
      null;
    if (hdr) return { Authorization: hdr };
    const token = await AsyncStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const resolvePdfUrl = async (id) => {
    try {
      const r = await api.post(`/customer_call_reports/${id}/generate_pdf`);
      const url = r?.data?.url || r?.data?.pdf_url;
      if (url) return url;
    } catch (_) {}
    const base = (api.defaults?.baseURL || '').replace(/\/$/, '');
    return `${base}/customer_call_reports/${id}/pdf`;
  };

  const ensureDirectoryPermission = async () => {
    if (Platform.OS !== 'android' || !FileSystem.StorageAccessFramework) return { dirUri: null, granted: false };
    let dirUri = await AsyncStorage.getItem(SAF_DIR_KEY);
    if (dirUri) return { dirUri, granted: true, fromCache: true };
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (perm.granted) {
      dirUri = perm.directoryUri;
      try {
        if (FileSystem.StorageAccessFramework.persistPermissionsAsync) {
          await FileSystem.StorageAccessFramework.persistPermissionsAsync(dirUri);
        }
      } catch {}
      await AsyncStorage.setItem(SAF_DIR_KEY, dirUri);
      return { dirUri, granted: true, fromCache: false };
    }
    return { dirUri: null, granted: false };
  };

  const changePdfFolder = async () => {
    if (Platform.OS !== 'android' || !FileSystem.StorageAccessFramework) {
      Alert.alert('Not supported', 'Changing a persistent folder is only for Android.');
      return;
    }
    await AsyncStorage.removeItem(SAF_DIR_KEY);
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (perm.granted) {
      try {
        if (FileSystem.StorageAccessFramework.persistPermissionsAsync) {
          await FileSystem.StorageAccessFramework.persistPermissionsAsync(perm.directoryUri);
        }
      } catch {}
      await AsyncStorage.setItem(SAF_DIR_KEY, perm.directoryUri);
      Alert.alert('Saved', 'Default PDF folder changed.');
    }
  };

  const createUniqueFile = async (dirUri, baseName, mime = 'application/pdf') => {
    const tryCreate = async (name) =>
      await FileSystem.StorageAccessFramework.createFileAsync(dirUri, name, mime);

    const extIdx = baseName.toLowerCase().lastIndexOf('.pdf');
    const root = extIdx > -1 ? baseName.slice(0, extIdx) : baseName;
    const ext = '.pdf';

    try { return await tryCreate(baseName); } catch (e) {
      for (let i = 1; i <= 20; i++) {
        try { return await tryCreate(`${root} (${i})${ext}`); } catch {}
      }
      throw e;
    }
  };

  const generateAndSavePdf = async (item) => {
    try {
      setGeneratingId(item.id);

      const url = await resolvePdfUrl(item.id);
      const headers = await getAuthHeaders();

      const today = new Date().toISOString().slice(0, 10);
      const fileName = `CCR_${item.id}_${sanitize(item.customer_name || 'Report')}_${today}.pdf`;
      const tempPath = FileSystem.documentDirectory + fileName;

      const dl = await FileSystem.downloadAsync(url, tempPath, { headers });

      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
        let { dirUri, granted } = await ensureDirectoryPermission();
        if (!granted) {
          const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (perm.granted) {
            dirUri = perm.directoryUri;
            await AsyncStorage.setItem(SAF_DIR_KEY, dirUri);
            try {
              if (FileSystem.StorageAccessFramework.persistPermissionsAsync) {
                await FileSystem.StorageAccessFramework.persistPermissionsAsync(dirUri);
              }
            } catch {}
            granted = true;
          }
        }
        if (granted && dirUri) {
          const b64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
          const safFileUri = await createUniqueFile(dirUri, fileName, 'application/pdf');
          await FileSystem.writeAsStringAsync(safFileUri, b64, { encoding: FileSystem.EncodingType.Base64 });
          Alert.alert('Saved', 'PDF saved to your selected folder.');
          return;
        }
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri, {
          mimeType: 'application/pdf',
          dialogTitle: fileName,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Downloaded', `Saved to:\n${dl.uri}`);
      }
    } catch (e) {
      console.log('PDF save error:', e?.response?.data || e.message);
      Alert.alert('Error', 'Could not generate/save the PDF.');
    } finally {
      setGeneratingId(null);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.customer_name || '—'}
        </Text>
        {!!item.code && <Text style={styles.codePill}>{item.code}</Text>}
      </View>

      <Row label="Branch" value={item.branch_name} />
      <Row label="Call Recd" value={item.call_recd_date} />
      <Row label="Started" value={item.started_date} />
      <Row label="Arrived" value={item.arrived_date} />
<Row label="KM" value={item.km != null ? String(item.km) : null} />
<Row label="Expense" value={item.expense != null ? String(item.expense) : null} />

      {!!item.image_url && (
        <Image
          source={{ uri: item.image_url }}
          style={{ width: 100, height: 100, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb' }}
          resizeMode="cover"
        />
      )}

      {!!item.material_reported && (
        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Material Reported</Text>
          <Text style={styles.noteText}>{item.material_reported}</Text>
        </View>
      )}
      {!!item.observation_and_action_taken && (
        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Observation / Action</Text>
          <Text style={styles.noteText}>{item.observation_and_action_taken}</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <TouchableOpacity
          onPress={() => nav.navigate('CustomerCallReportForm', { editingId: item.id })}
          style={[styles.btn, styles.btnSecondary]}
          activeOpacity={0.9}
        >
          <Text style={styles.btnSecondaryText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => generateAndSavePdf(item)}
          style={[styles.btn, styles.btnPdf, generatingId === item.id && { opacity: 0.7 }]}
          disabled={generatingId === item.id}
          activeOpacity={0.9}
        >
          {generatingId === item.id ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPdfText}>Generate PDF</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {Platform.OS === 'android' && FileSystem.StorageAccessFramework && (
            <TouchableOpacity onPress={changePdfFolder} style={styles.smallBtn} activeOpacity={0.9}>
              <Text style={styles.smallBtnText}>Change PDF Folder</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => nav.navigate('CustomerCallReportForm')}
            style={styles.addBtn}
            activeOpacity={0.9}
          >
            <Text style={styles.addBtnText}>+ Add Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      {initialLoading ? (
        <View style={{ paddingTop: 24, alignItems: 'center' }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: '#6b7280' }}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it, idx) => String(it.id ?? idx)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: (insets.bottom || 0) + 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" colors={['#2563eb']} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <Text style={{ color: '#6b7280' }}>No reports yet.</Text>
            </View>
          }
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  h1: { fontSize: 20, fontWeight: '800', color: '#0f172a' },

  smallBtn: {
    height: 40, paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center',
  },
  smallBtnText: { color: '#111827', fontWeight: '700' },

  addBtn: {
    height: 40, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ android: { elevation: 2 } }),
  },
  addBtnText: { color: '#fff', fontWeight: '700' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 10,
    borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000',
    shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', flex: 1, paddingRight: 8 },
  codePill: {
    paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#0ea5e9',
    borderRadius: 999, color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 0.6,
  },

  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rowLabel: { width: 90, fontSize: 13, color: '#475569', fontWeight: '700' },
  rowValue: { fontSize: 14, color: '#0f172a', flexShrink: 1 },

  noteBox: { marginTop: 8, backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  noteTitle: { fontSize: 12, color: '#475569', fontWeight: '700', marginBottom: 4 },
  noteText: { fontSize: 14, color: '#0f172a' },

  btn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, flex: 1 },
  btnSecondary: { backgroundColor: '#e5e7eb' },
  btnSecondaryText: { color: '#111827', fontWeight: '800', letterSpacing: 0.3 },
  btnPdf: { backgroundColor: '#0d9488' },
  btnPdfText: { color: '#fff', fontWeight: '800', letterSpacing: 0.3 },
});

