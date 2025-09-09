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
} from 'react-native';
import { api } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import S from '../styles/AppStyles';   // ← created once & cached

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

  // Fetch on screen focus (and when userId becomes available)
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
      style={S.card}
      activeOpacity={0.85}
      onPress={() => console.log('Tapped:', item.request_id)}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {/* header stays the same, but remove the status chip from there */}

      <Text style={S.cardTitle} numberOfLines={1}>
        🧾 CCR {item.ccr_no || '—'} • 🏗 {item.project || '—'}
      </Text>

      {/* ... your info rows ... */}

 <View style={S.infoRow}>
        <Text style={S.infoLabel}>Time</Text>
        <Text style={S.infoValue} numberOfLines={1}>
          {item.start_time || '—'} → {item.arrived_time || '—'}
        </Text>
      </View>

      <View style={S.divider} />

      <View style={S.infoRow}>
        <Text style={S.infoLabel}>Mode</Text>
        <Text style={S.infoValue} numberOfLines={1}>
          {item.mode || '—'}
        </Text>
      </View>

      <View style={S.divider} />

      <View style={S.infoRow}>
        <Text style={S.infoLabel}>Route</Text>
        <Text style={S.infoValue} numberOfLines={2} ellipsizeMode="tail">
          {item.from_location || '—'} → {item.to_location || '—'}
        </Text>
      </View>
      {/* FOOTER: distance • expense • status */}
      <View style={S.cardFooter}>
        <View style={[S.badge, S.badgeMeasure]}>
          <Text style={S.badgeText}>📏 {item.distance_km ?? '—'} km</Text>
        </View>

        <View style={{ width: 8 }} />

        <View style={[S.badge, S.badgeMoney]}>
          <Text style={S.badgeText}>💰 ₹{item.expense_rs ?? '—'}</Text>
        </View>

        <View style={{ width: 8 }} />

        <View style={[S.badge, isApproved ? S.badgeSuccess : S.badgeWarning]}>
          <Text style={S.badgeText}>{statusIcon} {statusLabel}</Text>
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
    <View style={[S.screen, S.screenPadTop]}>
      {!!error && <Text style={S.errorText}>{error}</Text>}

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
          contentContainerStyle={{ paddingBottom: 80 }}
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
        style={S.addBtn}
        onPress={() => navigation.navigate('LocalConveyanceForm')}
      >
        <Text style={S.btnText}>+ Add Entry</Text>
      </TouchableOpacity>


    </View>
  );
}

