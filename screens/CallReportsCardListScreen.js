// screens/CallReportsCardListScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
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
      <View style={S.emptyWrap}>
        <Text style={S.emptyIcon}>📭</Text>
        <Text style={S.emptyTitle}>No Call Reports</Text>
        <Text style={S.emptySub}>Pull down to refresh.</Text>
      </View>
    );
  };

  const ListFooter = () => {
    if (!loadingMore) return <View style={{ height: 8 }} />;
    return (
      <View style={S.footerLoading}>
        <ActivityIndicator />
        <Text style={S.footerText}>Loading more…</Text>
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
        style={S.card}
        activeOpacity={0.85}
        onPress={() => {
          // Navigate to a details screen if you have one
          // navigation.navigate('CallReportDetails', { id: item.id })
          console.log('Tapped CallReport:', item.id);
        }}
      >
        <Text style={S.cardHeader}>
          🧾 Case: <Text style={S.bold}>{String(caseId || '-')}</Text>
        </Text>

        <Text style={S.cardLine}>
          🔧 Serial: <Text style={S.mono}>{String(serial)}</Text>
        </Text>

        <Text style={S.cardLine}>
          👤 {String(cust)}
        </Text>

        <Text style={S.cardLine}>
          📞 {String(mobile)}
        </Text>

        <Text style={S.cardLine} numberOfLines={2}>
          📍 {String(addr)}
        </Text>

        <View style={S.cardFooter}>
          <Text style={[S.badge, statusBadgeStyle(status)]}>
            {String(status).toUpperCase()}
          </Text>
        </View>
     {/* Actions */}
     <View style={S.cardActions}>
       <TouchableOpacity
         onPress={() => navigation.navigate('CcrPdfForm', { report: item })}
         activeOpacity={0.7}
         hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
       >
         <Text style={S.linkText}>Generate PDF</Text>
       </TouchableOpacity>
     </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[S.screen, { paddingTop: insets.top }]}>
      <View style={S.header}>
        <Text style={S.h1}>Call Reports</Text>
        {!!error && <Text style={S.errorText}>{error}</Text>}
      </View>

      {initialLoading ? (
        <View style={S.loadingWrap}>
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

