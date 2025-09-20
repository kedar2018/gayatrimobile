// screens/VendorVoucherListScreen.js
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '../utils/api';

/* ---------------- Payment Mode helpers ---------------- */
const PAYMENT_MODES = [
  { key: 'cash',      label: 'Cash' },
  { key: 'cheque',    label: 'Cheque' },
  { key: 'upi',       label: 'UPI' },
  { key: 'neft_rtgs', label: 'NEFT/RTGS' },
  { key: 'card',      label: 'Card' },
  { key: 'other',     label: 'Other' },
];
const labelForMode = (key) =>
  PAYMENT_MODES.find((m) => m.key === key)?.label || key || '-';

/* ---------------- Small utils ---------------- */
const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function VendorVoucherListScreen() {
  const nav = useNavigation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/vendor_vouchers');
      setData(res.data || []);
    } catch (e) {
      console.error('Vouchers load failed', e?.response?.data || e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load(); // refresh when coming back from form
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderItem = ({ item }) => {
    // Items may arrive under different keys depending on API shape
    const itemsArray =
      item.items ||
      item.voucher_items ||
      item.items_attributes ||
      [];

    // Prefer server-provided total_rs. Otherwise compute rupees + floor(paise/100)
    const computedTotalRs =
      itemsArray.reduce((sum, it) => sum + toNumber(it.amount_rs ?? it.amount), 0) +
      Math.floor(itemsArray.reduce((sum, it) => sum + toNumber(it.amount_ps), 0) / 100);

    const totalRs = Number.isFinite(Number(item.total_rs))
      ? Number(item.total_rs)
      : computedTotalRs;

    // Vendor fallback chain
    const vendorName =
      item.vendor?.name ||
      item.vendor_name ||
      (item.vendor_id ? `#${item.vendor_id}` : '-');

    const title = `Voucher #${item.voucher_no ?? item.id}`;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => nav.navigate('VendorVoucherForm', { voucher: item })}
      >
        {/* Header row: title + chips */}
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{title}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!!item.payment_mode && (
              <View style={styles.pill}>
                <MaterialIcons name="payment" size={14} />
                <Text style={styles.pillText}>
                  {item.payment_mode_label || labelForMode(item.payment_mode)}
                </Text>
              </View>
            )}
            <View style={styles.tag}>
              <MaterialIcons name="event" size={14} />
              <Text style={styles.tagText}>{item.date || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Vendor */}
        <Text style={styles.sub}>
          Vendor: <Text style={styles.bold}>{vendorName}</Text>
        </Text>

        {/* Cheque (optional) */}
        {!!item.cheque_no && (
          <Text style={styles.sub}>Cheque: {item.cheque_no}</Text>
        )}

        {/* Total (server-preferred) */}
        <Text style={styles.total}>Total: ₹{totalRs}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#64748b' }}>
            No vouchers yet
          </Text>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => nav.navigate('VendorVoucherForm')}
        style={styles.fab}
        activeOpacity={0.9}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sub: { marginTop: 6, fontSize: 14, color: '#475569' },
  bold: { fontWeight: '700', color: '#0f172a' },
  total: { marginTop: 10, fontSize: 15, fontWeight: '800', color: '#0f172a' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
  },
  tagText: { marginLeft: 6, fontSize: 12, color: '#334155' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
  },
  pillText: { marginLeft: 6, fontSize: 12, color: '#0c4a6e', fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#004080',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});

