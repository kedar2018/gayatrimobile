// screens/LocalConveyanceListScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://134.199.178.17/gayatri';

export default function LocalConveyanceListScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

/*
  const loadUserId = useCallback(async () => {
    const id = await AsyncStorage.getItem('user_id');
    if (id) setUserId(id);
  }, []);
*/
  /*const fetchEntries = useCallback(async (newPage = 1, isRefresh = false) => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API_URL}/api/tour_conveyances`, {
        params: { 
 	engineer_id: userId,
          page: newPage,
          per_page: 10,
	},
      });
   
      const newData = res.data;

    if (isRefresh) {
        setEntries(newData);
      } else {
        setEntries(prev => [...prev, ...newData]);
      }

      setHasMore(newData.length === 10); // if less than 10, no more pages


    } catch (e) {
      console.log('Fetch entries error:', e?.response?.data || e.message);
    }
  }, [userId]);
*/

/*const fetchEntries = async (currentPage = 1) => {
  if (loading) return;
  setLoading(true);
  try {
    const res = await axios.get(`${API_URL}/api/tour_conveyances`, {
      params: { engineer_id: userId, page: currentPage, per_page: 10 },
    });
    setEntries(prev => currentPage === 1 ? res.data : [...prev, ...res.data]);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};
*/
  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      setIsLoadingMore(true);
      fetchEntries(nextPage).finally(() => setIsLoadingMore(false));
    }
  };

/*
useFocusEffect(
  React.useCallback(() => {
    if (userId) fetchEntries();   // your existing fetchEntries useCallback
  }, [userId, fetchEntries])
);
*/
/*
  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [])
  );
*/
/*useFocusEffect(
  useCallback(() => {
    handleRefresh();

    return () => {
      // Cleanup if needed
    };
  }, [])
);
*/
useFocusEffect(
  useCallback(() => {
    fetchEntries();
  }, [userId, fetchEntries])
);

/*const fetchEntries = useCallback(async (currentPage = 1) => {
  if (loading) return;
  setLoading(true);
  try {
    const res = await axios.get(`${API_URL}/api/tour_conveyances`, {
      params: { engineer_id: userId, page: currentPage, per_page: 10 },
    });
    setEntries(prev => currentPage === 1 ? res.data : [...prev, ...res.data]);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
}, [userId, loading]);

*/


useEffect(() => {
  const loadUserId = async () => {
    const id = await AsyncStorage.getItem('user_id');
    setUserId(id);
  };

  loadUserId();
}, []);

const fetchEntries = async (pageToLoad = 1, refreshing = false) => {
console.log('Fetching with cccuserId:', userId);
console.log(loading);
console.log(refreshing)
console.log(hasMore)
  if (loading || (!refreshing && !hasMore)) return;
console.log('Fetching with userId:', userId);

  setLoading(true);

  try {
    const res = await axios.get(`${API_URL}/api/tour_conveyances`, {
      params: { engineer_id: userId, page: pageToLoad, per_page: 10 },
    });

    const newData = res.data;
    if (refreshing) {
      setEntries(newData);
    } else {
      setEntries((prev) => [...prev, ...newData]);
    }

    setHasMore(newData.length === 10); // If less than 10, no more pages
    setPage(pageToLoad + 1);
  } catch (err) {
    console.log('Pagination Fetch Error:', err);
  }

  setLoading(false);
};

/*

  useEffect(() => {
    loadUserId();
  }, [loadUserId]);
*/
/*  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);
*/
/*
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  }, [fetchEntries]);
*/
/*
  const handleRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchEntries(1, true).finally(() => setIsRefreshing(false));
  };
*/
/*const handleRefresh = useCallback(() => {
  setIsRefreshing(true);
  setPage(1);
  fetchEntries(1, true).finally(() => setIsRefreshing(false));
}, []);
*/

const handleRefresh = () => {
  setPage(1);
  fetchEntries(1);
};

/*
const handleLoadMore = () => {
  if (loading) return;
  const nextPage = page + 1;
  setPage(nextPage);
  fetchEntries(nextPage);
};
*/
const handleLoadMore = () => {
  if (!loading && hasMore) {
    fetchEntries(page);
  }
};


  const renderFooter = () =>
    isLoadingMore ? (
      <Text style={{ textAlign: 'center', padding: 10 }}>Loading more...</Text>
    ) : null;




  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => console.log('Tapped:', item.request_id)}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {/* Header */}
      <View style={styles.cardHeaderRow}>
        <View style={[styles.chip, styles.chipPrimary]}>
          <Text style={styles.chipText}>📅 {item.date || '—'}</Text>
        </View>
        <View style={styles.spacer} />
        <View style={[styles.chip, styles.chipNeutral]}>
          <Text style={styles.chipText}>🆔 {item.request_id || '—'}</Text>
        </View>
      </View>

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

      <View style={styles.cardFooter}>
        <View style={[styles.badge, styles.badgeMeasure]}>
          <Text style={styles.badgeText}>📏 {item.distance_km ?? '—'} km</Text>
        </View>
        <View style={[styles.badge, styles.badgeMoney]}>
          <Text style={styles.badgeText}>💰 ₹{item.expense_rs ?? '—'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>


<FlatList
  data={entries}
  keyExtractor={(item, index) => index.toString()}
  renderItem={renderItem}
  onEndReached={handleLoadMore}
  onEndReachedThreshold={0.5}
  onRefresh={handleRefresh}
  refreshing={loading}
/>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate('LocalConveyanceForm')}
      >
        <Text style={styles.btnText}>+ Add Entry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, backgroundColor: '#f7f7f7' },
  title: { fontSize: 20, fontWeight: '700', marginVertical: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipPrimary: { backgroundColor: '#e8f0fe' },
  chipNeutral: { backgroundColor: '#eee' },
  chipText: { fontSize: 12 },
  spacer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  infoRow: { flexDirection: 'row', marginBottom: 8 },
  infoLabel: { width: 70, color: '#666' },
  infoValue: { flex: 1, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 6 },
  cardFooter: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeMeasure: { backgroundColor: '#f0f9ff' },
  badgeMoney: { backgroundColor: '#fff7ed' },
  badgeText: { fontSize: 12, fontWeight: '600' },

  addBtn: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    elevation: 4,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
