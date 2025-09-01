// screens/CallReportsCardListScreen.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Pressable,
} from 'react-native';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// import { API_URL } from '../utils/config';
const API_URL = 'https://134.199.178.17/gayatri';

const PER_PAGE = 10;

export default function CallReportsCardListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadingRef = useRef(false); // prevent double fetch from rapid onEndReached

  const parseResponse = (resData) => {
    const list = Array.isArray(resData)
      ? resData
      : (resData.call_reports || resData.data || []);
    const meta = resData.meta || resData.pagination || {};
    // Determine if there are more pages
    let next;
    if (meta && (meta.next_page !== undefined && meta.next_page !== null)) {
      next = Boolean(meta.next_page);
    } else if (meta.current_page && meta.total_pages) {
      next = meta.current_page < meta.total_pages;
    } else {
      // Fallback heuristic: if we got a full page, assume more exists
      next = list.length === PER_PAGE;
    }
    return { list, next };
  };

  const mergeDedup = (prev, next) => {
    const map = new Map(prev.map((r) => [String(r.id), r]));
    next.forEach((r) => map.set(String(r.id), r));
    return Array.from(map.values());
  };

  const fetchPage = useCallback(
    async (targetPage, mode = 'append') => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        const userId = await AsyncStorage.getItem('user_id'); // get engineer_id

        const res = await axios.get(`${API_URL}/api/call_reports`, {
          params: { page: targetPage, per_page: PER_PAGE, engineer_id: userId  },
          headers: { Accept: 'application/json' },
          timeout: 20000,
        });
        const { list, next } = parseResponse(res.data);

        setHasMore(next);
        setPage(targetPage);

        if (mode === 'replace') {
          setItems(list);
        } else {
          setItems((prev) => mergeDedup(prev, list));
        }

        setError(null);
      } catch (e) {
        console.log('Fetch error:', e?.response?.data || e.message);
        setError('Failed to load reports.');
      } finally {
        loadingRef.current = false;
        setInitialLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchPage(1, 'replace');
  }, [fetchPage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchPage(1, 'replace');
  }, [fetchPage]);

  const onEndReached = () => {
    if (initialLoading || loadingMore || refreshing || !hasMore) return;
    setLoadingMore(true);
    fetchPage(page + 1, 'append');
  };

  const openReport = (report) => {
    navigation.navigate('CcrPdfForm', { report }); // keep your existing route name
  };

const renderItem = ({ item }) => {
  const cd = item.customer_detail || {};
  return (
    <TouchableOpacity style={styles.card} onPress={() => openReport(item)} activeOpacity={0.85}>
      <View style={styles.accentBar} />
      <View style={styles.row}>
        <Text style={styles.caseId}>#{item.case_id || item.id}</Text>
        {item.status ? <Text style={styles.status}>{item.status}</Text> : null}
      </View>

      {cd.customer_name ? (
        <Text style={styles.kv}><Text style={styles.k}>Customer: </Text>{cd.customer_name}</Text>
      ) : null}
      {(cd.mobile_number || cd.phone_number) ? (
        <Text style={styles.kv}><Text style={styles.k}>Phone: </Text>{cd.mobile_number || cd.phone_number}</Text>
      ) : null}
      {(item.address || cd.address) ? (
        <Text style={styles.kv}><Text style={styles.k}>Address: </Text>{item.address || cd.address}{cd.city ? `, ${cd.city}` : ''}</Text>
      ) : null}

      <View style={styles.cardFooter}>
        <Pressable
          onPress={() => openReport(item)}
          style={styles.linkBtn}
          android_ripple={{ color: '#e5e7eb' }}
        >
          <Text style={styles.link}>Generate PDF</Text>
        </Pressable>
      </View>
    </TouchableOpacity>
  );
};


  const ListEmpty = () => {
    if (initialLoading) return null;
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>No reports</Text>
        <Text style={styles.emptySub}>Pull down to refresh or try again later.</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPage(1, 'replace')}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const ListFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator />
          <Text style={styles.footerText}>Loading more…</Text>
        </View>
      );
    }
    if (!hasMore && items.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>No more results</Text>
        </View>
      );
    }
    return <View style={{ height: 8 }} />;
  };

// --- RETURN (replace your current return) ---
return (
  <View style={[styles.screen, { paddingTop: insets.top }]}>
    <View style={styles.header}>
      <Text style={styles.h1}>Call Reports</Text>
      <Text style={styles.sub}>Swipe down to refresh • Tap a card to open</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>

    {initialLoading ? (
      <View style={styles.loadingWrap}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </View>
    ) : (
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
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

// --- STYLES (replace your styles object) ---
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f9fc' },

  header: {
    backgroundColor: '#f7f9fc',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  h1: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 6 },
  sub: { marginTop: 4, fontSize: 12, color: '#64748b' },

  listContent: {
    padding: 16,
    paddingBottom: 28,
    gap: 12, // consistent spacing between cards
  },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6edf6',
  },

  // slim accent bar on the left side of card (use in renderItem if you want)
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    backgroundColor: '#2563eb',
  },

  // top row
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caseId: { fontWeight: '800', color: '#0f172a', fontSize: 15 },

  // pill-style status chip
  status: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '700',
    backgroundColor: '#e8f0ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },

  // key/value lines
  kv: { marginTop: 6, color: '#0f172a', lineHeight: 18 },
  k: { fontWeight: '600', color: '#334155' },

  // footer with link/button
  cardFooter: {
    marginTop: 10,
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eef2f7',
    paddingTop: 10,
  },
  linkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  link: {
    color: '#fff',
    fontWeight: '700',
    textDecorationLine: 'none',
    fontSize: 13,
  },

  footer: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  footerText: { marginTop: 6, color: '#64748b', fontSize: 12 },

  emptyWrap: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  emptySub: { marginTop: 4, color: '#64748b' },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  errorText: { marginTop: 6, color: '#dc2626' },
});

