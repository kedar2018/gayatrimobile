// screens/CustomerCallReportListScreen.js
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, RefreshControl, ActivityIndicator,
  TouchableOpacity, StyleSheet, Platform, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from '../utils/api';

const SAF_DIR_KEY = 'safDirUri'; // where we remember the chosen folder

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
    } catch (_) { /* fallback below */ }
    const base = (api.defaults?.baseURL || '').replace(/\/$/, '');
    return `${base}/customer_call_reports/${id}/pdf`;
  };

  /** Ask once, then remember the folder; reuse silently next time */
  const ensureDirectoryPermission = async () => {
    if (Platform.OS !== 'android' || !FileSystem.StorageAccessFramework) return { dirUri: null, granted: false };

    // 1) Use saved folder if present
    let dirUri = await AsyncStorage.getItem(SAF_DIR_KEY);
    if (dirUri) {
      return { dirUri, granted: true, fromCache: true };
    }

    // 2) Ask user to pick a folder ONCE
    const initialUri = null; // you can pass dirUri here if you want to re-ask pointing to prior folder
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri || undefined);
    if (perm.granted) {
      dirUri = perm.directoryUri;

      // Persist across reboots if supported by current Expo version
      try {
        if (FileSystem.StorageAccessFramework.persistPermissionsAsync) {
          await FileSystem.StorageAccessFramework.persistPermissionsAsync(dirUri);
        }
      } catch (e) {
        // Not fatal; the saved URI still works in most cases
        console.log('persistPermissionsAsync failed:', e?.message);
      }

      await AsyncStorage.setItem(SAF_DIR_KEY, dirUri);
      return { dirUri, granted: true, fromCache: false };
    }

    return { dirUri: null, granted: false };
  };

  /** Optional helper to let the user change the folder later */
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
    // Try base name, then add (1), (2), ...
    const tryCreate = async (name) =>
      await FileSystem.StorageAccessFramework.createFileAsync(dirUri, name, mime);

    const extIdx = baseName.toLowerCase().lastIndexOf('.pdf');
    const root = extIdx > -1 ? baseName.slice(0, extIdx) : baseName;
    const ext = '.pdf';

    try {
      return await tryCreate(baseName);
    } catch (e) {
      // Try numbered suffixes up to 20 attempts
      for (let i = 1; i <= 20; i++) {
        try {
          return await tryCreate(`${root} (${i})${ext}`);
        } catch {}
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

      // Download to app storage (silent)
      const dl = await FileSystem.downloadAsync(url, tempPath, { headers });

      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
        // Reuse saved folder (ask once)
        let { dirUri, granted } = await ensureDirectoryPermission();

        // If we somehow lost permission, allow user to re-pick once
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
          // Write the file into the chosen folder (no prompt if previously granted)
          const b64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
          const safFileUri = await createUniqueFile(dirUri, fileName, 'application/pdf');
          await FileSystem.writeAsStringAsync(safFileUri, b64, { encoding: FileSystem.EncodingType.Base64 });
          Alert.alert('Saved', 'PDF saved to your selected folder.');
          return;
        }
      }

      // iOS or if SAF not available / permission denied → Share sheet
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
          {generatingId === item.id
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnPdfText}>Generate PDF</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Optional: quick button to change saved folder */}
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
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: (insets.bottom || 0) + 32,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2563eb"
              colors={['#2563eb']}
            />
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

  btn: {
    height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 14, flex: 1,
  },
  btnSecondary: { backgroundColor: '#e5e7eb' },
  btnSecondaryText: { color: '#111827', fontWeight: '800', letterSpacing: 0.3 },
  btnPdf: { backgroundColor: '#0d9488' },
  btnPdfText: { color: '#fff', fontWeight: '800', letterSpacing: 0.3 },
});

