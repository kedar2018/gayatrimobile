// screens/LocalConveyanceListScreen.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { api } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAGE_SIZE = 10;

export default function LocalConveyanceListScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [userId, setUserId] = useState(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');

  // prevent overlapping loads & avoid state updates after unmount
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load user id once (optional; server should use token anyway)
  useEffect(() => {
    (async () => {
      try {
        const id = await AsyncStorage.getItem('user_id');
        setUserId(id);
      } catch {}
    })();
  }, []);

  const parseResponse = (resData) => {
    // Support both raw array and { items: [], next_page: true/false } shapes
    if (Array.isArray(resData)) {
      return { items: resData, nextPage: resData.length === PAGE_SIZE };
    }
    const items = Array.isArray(resData?.items) ? resData.items : [];
    const nextPage =
      typeof resData?.next_page === 'boolean'
        ? resData.next_page
        : items.length === PAGE_SIZE;
    return { items, nextPage };
  };

  const fetchEntries = useCallback(
    async (pageToLoad = 1, replace = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        if (pageToLoad === 1) {
          setInitialLoading(true);
          setHasMore(true);
        } else {
          setLoadingMore(true);
        }
        setError('');

        const params = { page: pageToLoad, per_page: PAGE_SIZE };
        // Backward-compat: server should ignore and use token
        if (userId) params.engineer_id = userId;

        const res = await api.get('/tour_conveyances', { params });
        const { items: newItems, nextPage } = parseResponse(res.data);

        setEntries((prev) => {
          const base = replace ? [] : prev;
          const merged = [...base, ...(newItems || [])];
          const seen = new Set();
          const deduped = [];
          for (const it of merged) {
            const key = it?.id ?? `${it?.request_id}-${it?.date}`;
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(it);
            }
          }
          return deduped;
        });

        setHasMore(nextPage);
        setPage(pageToLoad);
      } catch (err) {
        console.log('Conveyance fetch error:', err?.response?.data || err.message);
        setError('Failed to load conveyance entries.');
        setHasMore(false);
      } finally {
        if (!mountedRef.current) return;
        setInitialLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        loadingRef.current = false;
      }
    },
    [userId]
  );

  // Fetch on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchEntries(1, true);
    }, [fetchEntries])
  );

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    fetchEntries(1, true);
  }, [refreshing, fetchEntries]);

  const handleLoadMore = useCallback(() => {
    if (initialLoading || loadingMore || !hasMore) return;
    fetchEntries(page + 1, false);
  }, [initialLoading, loadingMore, hasMore, page, fetchEntries]);

  const renderItem = ({ item }) => {
    const isApproved  = item?.approved === true || item?.approved === 1 || item?.approved === 'true';
    const statusLabel = isApproved ? 'Approved' : 'Pending';
    const statusIcon  = isApproved ? '✅' : '⏳';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => console.log('Tapped:', item.request_id)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={styles.cardTitle} numberOfLines={1}>
          🧾 CCR {item.ccr_no || '—'} • 🏗 {item.project || '—'}
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Time</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {item.start_time || '—'} → {item.arrived_time || '—'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mode</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {item.mode || '—'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Route</Text>
          <Text style={styles.infoValue} numberOfLines={2} ellipsizeMode="tail">
            {item.from_location || '—'} → {item.to_location || '—'}
          </Text>
        </View>

        {/* FOOTER: wraps when content is wide */}
        <View style={styles.cardFooter}>
          <View style={[styles.badge, styles.badgeMeasure]}>
            <Text style={styles.badgeText} numberOfLines={1} ellipsizeMode="tail">
              📏 {item.distance_km ?? '—'} km
            </Text>
          </View>

          <View style={[styles.badge, styles.badgeMoney]}>
            <Text style={styles.badgeText} numberOfLines={1} ellipsizeMode="tail">
              💰 ₹{item.expense_rs ?? '—'}
            </Text>
          </View>

          <View style={[styles.badge, isApproved ? styles.badgeSuccess : styles.badgeWarning]}>
            <Text style={styles.badgeText} numberOfLines={1} ellipsizeMode="tail">
              {statusIcon} {statusLabel}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListEmpty = () => {
    if (initialLoading) return null;
    return (
      <View style={{ alignItems: 'center', marginTop: 40 }}>
        <Text style={{ color: '#666' }}>No conveyance entries yet.</Text>
      </View>
    );
  };

  const ListFooter = () => {
    if (!loadingMore) return <View style={{ height: 8 }} />;
    return (
      <View style={{ paddingVertical: 12, alignItems: 'center' }}>
        <ActivityIndicator />
        <Text style={{ color: '#555', marginTop: 6 }}>Loading more…</Text>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {initialLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, index) =>
            String(item?.id ?? `${item?.request_id || 'req'}-${item?.date || 'date'}-${index}`)
          }
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#2563eb"
              colors={['#2563eb']}
            />
          }
          ListEmptyComponent={ListEmpty}
          ListFooterComponent={ListFooter}
          removeClippedSubviews
        />
      )}

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate('LocalConveyanceForm')}
        activeOpacity={0.9}
      >
        <Text style={styles.btnText}>+ Add Entry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  /* screen */
  screen: { flex: 1, backgroundColor: '#f8fafc' },

  /* errors */
  errorText: {
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },

  /* card */
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden', // ensure no visual spill
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },

  /* rows */
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  infoLabel: { fontSize: 13, color: '#475569', fontWeight: '700', width: 80, flexShrink: 0 },
  infoValue: { fontSize: 15, color: '#0f172a', flex: 1 },

  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },

  /* footer badges (wrap when crowded) */
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',          // <— allows second line when content is wide
    alignItems: 'center',
    marginTop: 10,
    // Use gaps via margins on badges (cross-platform safe)
  },
  badge: {
    flexShrink: 1,             // <— let each badge shrink instead of pushing outside
    maxWidth: '100%',          // <— never exceed card width
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,           // <— space for wrapped line
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',   // <— keep height minimal when wrapping
  },
  badgeText: { fontSize: 12, color: '#0f172a', fontWeight: '700' },

  badgeMeasure: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  badgeMoney:   { backgroundColor: '#ecfeff', borderColor: '#a5f3fc' },
  badgeSuccess: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
  badgeWarning: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },

  /* FAB */
  addBtn: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#004080',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

