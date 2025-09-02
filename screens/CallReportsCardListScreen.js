// screens/CallReportsCardListScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';
import S from '../styles/AppStyles';

const PAGE_SIZE = 20;

// Normalize API shapes: array OR {data, meta} OR {items, meta}
const normalizeCallReportsResponse = (res, fallbackPage = 1, fallbackPer = PAGE_SIZE) => {
  const payload = res?.data ?? {};
  let items = [];
  let meta = {};

  if (Array.isArray(payload)) {
    items = payload;
  } else if (Array.isArray(payload.data)) {
    items = payload.data;
    meta = payload.meta || payload.pagination || {};
  } else if (Array.isArray(payload.items)) {
    items = payload.items;
    meta = payload.meta || payload.pagination || {};
  }

  const page       = Number(meta.page ?? fallbackPage);
  const per        = Number(meta.per ?? fallbackPer);
  const totalPages = meta.total_pages != null ? Number(meta.total_pages) : undefined;
  const totalCount = meta.total_count != null ? Number(meta.total_count) : undefined;

  let hasMore;
  if (Number.isFinite(totalPages)) {
    hasMore = page < totalPages;
  } else if (Number.isFinite(totalCount)) {
    hasMore = page * per < totalCount;
  } else {
    hasMore = items.length >= per; // heuristic
  }

  return { items, meta: { page, per, totalPages, totalCount }, hasMore };
};

export default function CallReportsCardListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const hasMoreRef = useRef(true);
  const reqSeq = useRef(0);

  const paddingBottom = useMemo(
    () => Math.max(16, (insets?.bottom || 0) + 12),
    [insets?.bottom]
  );

  const fetchCallReports = async (pageNum = 1, replace = false) => {
    const mySeq = ++reqSeq.current;
    try {
      if (pageNum === 1) {
        hasMoreRef.current = true;
        setInitialLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError('');

      // Optional/backward-compat: pass engineer_id; server should derive from token
      const engineer_id = await AsyncStorage.getItem('user_id');

      const res = await api.get('/call_reports', {
        params: { page: pageNum, per: PAGE_SIZE, engineer_id },
        headers: { Accept: 'application/json' },
      });

     console.log(res.data);
      if (mySeq !== reqSeq.current) return; // ignore stale responses

      const { items: list, meta, hasMore } = normalizeCallReportsResponse(res, pageNum, PAGE_SIZE);

      setItems(prev => {
        if (replace || pageNum === 1) return list;
        // de-dup by id across pages
        const map = new Map(prev.map(it => [String(it.id), it]));
        for (const it of list) map.set(String(it.id), it);
        return Array.from(map.values());
      });

      hasMoreRef.current = hasMore;
      setPage(meta.page);
    } catch (e) {
      console.log('CallReports fetch error:', e?.response?.data || e.message);
      setError('Failed to load call reports.');
      hasMoreRef.current = false;
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchCallReports(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    fetchCallReports(1, true);
  };

  const onEndReached = () => {
    if (loadingMore || initialLoading || refreshing) return;
    if (!hasMoreRef.current) return;
    fetchCallReports((page || 1) + 1, false);
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
    const dash = (v) => (typeof v === 'string' ? v.trim() : v) || '—';

    const caseId = item.case_id || item.ccr_no || item.request_id || String(item.id);
    const serial = dash(item.serial_number);
    const cust   = dash(item.customer_name);
    const mobile = dash(item.mobile_number);
    const addr   = dash(item.address);
    const status = dash(item.status);

    return (
      <TouchableOpacity
        style={S.card}
        activeOpacity={0.85}
        onPress={() => {
          // navigation.navigate('CallReportDetails', { id: item.id })
          console.log('Tapped CallReport:', item.id);
        }}
      >
        <Text style={S.cardTitle}>
          🧾 Case: <Text style={S.bold}>{String(caseId || '-')}</Text>
        </Text>

        <Text style={S.cardLine}>
          🔧 Serial: <Text style={S.mono}>{String(serial)}</Text>
        </Text>

        <Text style={S.cardLine}>👤 {String(cust)}</Text>
        <Text style={S.cardLine}>📞 {String(mobile)}</Text>

        <Text style={S.cardLine} numberOfLines={2}>
          📍 {String(addr)}
        </Text>

        <View style={[S.badgeRow, { justifyContent: 'flex-start', marginTop: 6 }]}>
          <Text style={[S.badge, statusBadgeStyle(status)]}>
            {String(status).toUpperCase()}
          </Text>
        </View>

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
    <View style={[S.screen, S.screenPadTop]}>
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
          keyExtractor={(item, idx) => String(item?.id ?? idx)}
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

