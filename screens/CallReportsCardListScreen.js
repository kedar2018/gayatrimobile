// screens/CallReportsCardListScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';

const PAGE_SIZE = 20;

export default function CallReportsCardListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const hasMoreRef = useRef(true);

  const paddingBottom = useMemo(
    () => Math.max(16, (insets?.bottom || 0) + 12),
    [insets?.bottom]
  );

  const fetchCallReports = async (pageNum = 1, replace = false) => {
    try {
      if (pageNum === 1) {
        hasMoreRef.current = true;
        setInitialLoading(true);
      }
      setError('');

      // Optional/backward-compat: pass engineer_id; server should derive from token
      const engineer_id = await AsyncStorage.getItem('user_id');

      const res = await api.get('/call_reports', {
        params: { page: pageNum, per: PAGE_SIZE, engineer_id },
      });

      // Support both raw-array and {items: []} shapes
      const data = Array.isArray(res.data)
        ? res.data
        : (res.data?.items || []);

      if (replace) {
        setItems(data);
      } else {
        setItems((prev) => [...prev, ...data]);
      }

      // Basic hasMore check
      if (data.length < PAGE_SIZE) {
        hasMoreRef.current = false;
      }

      setPage(pageNum);
    } catch (e) {
      console.log('CallReports fetch error:', e?.response?.data || e.message);
      setError('Failed to load call reports.');
      // If first page failed, stop further pagination attempts for now
      hasMoreRef.current = false;
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchCallReports(1, true);
  }, []);

  const onRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    fetchCallReports(1, true);
  };

  const onEndReached = () => {
    if (loadingMore || initialLoading || refreshing) return;
    if (!hasMoreRef.current) return;
    setLoadingMore(true);
    fetchCallReports(page + 1, false);
  };

  const ListEmpty = () => {
    if (initialLoading) return null;
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyTitle}>No Call Reports</Text>
        <Text style={styles.emptySub}>Pull down to refresh.</Text>
      </View>
    );
  };

  const ListFooter = () => {
    if (!loadingMore) return <View style={{ height: 8 }} />;
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator />
        <Text style={styles.footerText}>Loading more…</Text>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    // Try to gracefully handle varied field names that might exist in your API
    const caseId = item.case_id ?? item.ccr_no ?? item.request_id ?? item.id;
    const serial = item.serial_number ?? item.serial ?? '-';
    const cust = item.customer_name ?? item.customer ?? item.customer_detail ?? '-';
    const mobile = item.mobile_number ?? item.phone ?? '-';
    const addr = item.address ?? item.customer_address ?? '-';
    const status = item.status ?? item.current_status ?? '-';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => {
          // Navigate to a details screen if you have one
          // navigation.navigate('CallReportDetails', { id: item.id })
          console.log('Tapped CallReport:', item.id);
        }}
      >
        <Text style={styles.cardHeader}>
          🧾 Case: <Text style={styles.bold}>{String(caseId || '-')}</Text>
        </Text>

        <Text style={styles.cardLine}>
          🔧 Serial: <Text style={styles.mono}>{String(serial)}</Text>
        </Text>

        <Text style={styles.cardLine}>
          👤 {String(cust)}
        </Text>

        <Text style={styles.cardLine}>
          📞 {String(mobile)}
        </Text>

        <Text style={styles.cardLine} numberOfLines={2}>
          📍 {String(addr)}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={[styles.badge, statusBadgeStyle(status)]}>
            {String(status).toUpperCase()}
          </Text>
        </View>
     {/* Actions */}
     <View style={styles.cardActions}>
       <TouchableOpacity
         onPress={() => navigation.navigate('CcrPdfForm', { report: item })}
         activeOpacity={0.7}
         hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
       >
         <Text style={styles.linkText}>Generate PDF</Text>
       </TouchableOpacity>
     </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.h1}>Call Reports</Text>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {initialLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: paddingBottom }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2563eb"
              colors={['#2563eb']}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={onEndReached}
          ListEmptyComponent={ListEmpty}
          ListFooterComponent={ListFooter}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

function statusBadgeStyle(status) {
  const s = (status || '').toString().toLowerCase();
  if (['open', 'new', 'pending'].some((k) => s.includes(k))) {
    return { backgroundColor: '#1e40af' }; // blue
  }
  if (['in progress', 'working', 'assigned'].some((k) => s.includes(k))) {
    return { backgroundColor: '#92400e' }; // amber-ish
  }
  if (['closed', 'done', 'completed', 'resolved'].some((k) => s.includes(k))) {
    return { backgroundColor: '#065f46' }; // green
  }
  if (['hold', 'paused', 'on hold'].some((k) => s.includes(k))) {
    return { backgroundColor: '#6b7280' }; // gray
  }
  return { backgroundColor: '#334155' }; // slate
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  h1: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  errorText: {
    marginTop: 6,
    color: '#fecaca',
    backgroundColor: '#3b0d0d',
    borderColor: '#7f1d1d',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardHeader: {
    color: '#e5e7eb',
    fontWeight: '700',
    marginBottom: 6,
    fontSize: 16,
  },
  bold: { fontWeight: '800' },
  mono: { fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }), color: '#cbd5e1' },
  cardLine: {
    color: '#cbd5e1',
    marginTop: 2,
    fontSize: 14,
  },
  cardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  badge: {
    color: '#f8fafc',
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { color: '#e5e7eb', fontSize: 16, fontWeight: '700' },
  emptySub: { color: '#9ca3af', marginTop: 4 },
  footerLoading: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 6,
  },
 cardActions: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end' },
 linkText: { color: '#2563eb', fontWeight: '700', textDecorationLine: 'underline' },
});
