// screens/VendorVoucherFormScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { api } from '../utils/api';

/* ---------------- Small debounce util (no external deps) ---------------- */
const debounce = (fn, delay = 300) => {
  let t;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
};

/* ---------------- Payment Mode helpers (keys + labels) ---------------- */
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

const keyForMaybeLabel = (val) => {
  if (!val) return '';
  const s = String(val).trim().toLowerCase().replace(/[\/\s]+/g, ' ');
  switch (s) {
    case 'cash': return 'cash';
    case 'cheque': return 'cheque';
    case 'upi': return 'upi';
    case 'card': return 'card';
    case 'neft':
    case 'rtgs':
    case 'neft rtgs':
      return 'neft_rtgs';
    default:
      return 'other';
  }
};

/* ---------------- Date helpers ---------------- */
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
const toISODate = (d) => {
  if (!d) return '';
  const yy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yy}-${mm}-${dd}`; // YYYY-MM-DD
};
const parseISODate = (str) => {
  if (!str) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
};

export default function VendorVoucherFormScreen({ route, navigation }) {
  const editing = !!route?.params?.voucher;
  const initial = route?.params?.voucher || {};

  /* ---------------- Vendor type-ahead ---------------- */
  const [vendor, setVendor] = useState(initial.vendor || null); // {id, name}
  const [query, setQuery] = useState(initial.vendor?.name || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [vendorDropOpen, setVendorDropOpen] = useState(false);

  const fetchVendors = async (q) => {
    if (!q?.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      setLoadingVendor(true);
      const res = await api.get('/vendors', { params: { q } });
      setSuggestions(res.data || []);
    } catch (e) {
      console.error('Vendor search failed', e?.response?.data || e.message);
    } finally {
      setLoadingVendor(false);
    }
  };
  const debouncedFetch = useRef(debounce(fetchVendors, 300)).current;

  useEffect(() => {
    debouncedFetch(query);
    return () => debouncedFetch.cancel?.();
  }, [query]);

  const onPickSuggestion = (v) => {
    setVendor(v);
    setQuery(v.name);
    setSuggestions([]);
    setVendorDropOpen(false);  // close dropdown
    Keyboard.dismiss();
  };

  const createVendor = async (name) => {
    const clean = name.trim();
    if (!clean) throw new Error('Vendor name required.');
    try {
      const res = await api.post('/vendors', { vendor: { name: clean } });
      return res.data; // { id, name }
    } catch (e) {
      throw new Error(e?.response?.data?.errors?.join('\n') || e.message);
    }
  };

  /* ---------------- Voucher fields ---------------- */
  // Date: keep both string (for backend) and Date object (for picker)
  const [dateISO, setDateISO] = useState(initial.date || toISODate(new Date()));
  const [dateObj, setDateObj] = useState(parseISODate(initial.date) || new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [chequeNo, setChequeNo] = useState(initial.cheque_no || '');
  const [paymentMode, setPaymentMode] = useState(
    keyForMaybeLabel(initial.payment_mode || (initial.cheque_no ? 'cheque' : 'cash'))
  );
  const [showModeDrop, setShowModeDrop] = useState(false);

  const [items, setItems] = useState(
    initial.items?.length ? initial.items : [{ particulars: '', amount_rs: '' }]
  );
  const total = useMemo(
    () => items.reduce((s, i) => s + (Number(i.amount_rs) || 0), 0),
    [items]
  );

  const addRow = () =>
    setItems((arr) => [...arr, { particulars: '', amount_rs: '' }]);
  const removeRow = (idx) =>
    setItems((arr) => arr.filter((_, i) => i !== idx));
  const upd = (idx, key, val) =>
    setItems((arr) => arr.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));

  /* ---------------- Date picker handlers ---------------- */
  const openDatePicker = () => {
    Keyboard.dismiss();
    setShowDatePicker(true);
  };
  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event?.type === 'dismissed' || !selectedDate) return;
    const iso = toISODate(selectedDate);
    setDateObj(selectedDate);
    setDateISO(iso);
  };

  /* ---------------- Save + safe navigation back to Vouchers tab ---------------- */
  const goToVouchersTab = () => {
    const refreshAt = Date.now();

    // If possible, just go back (e.g. when we came from Vouchers tab)
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // Otherwise, route into the nested tab properly
    navigation.navigate('MainTabs', {
      screen: 'Vouchers',
      params: { refreshAt },
    });
  };

  const hardResetToVouchers = () => {
    const refreshAt = Date.now();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          { name: 'MainTabs', params: { screen: 'Vouchers', params: { refreshAt } } },
        ],
      })
    );
  };

  const onSave = async () => {
    try {
      setVendorDropOpen(false); // ensure closed
      let vendorId = vendor?.id;
      const typed = query?.trim();

      if (!vendorId) {
        if (!typed) return Alert.alert('Vendor required', 'Please type a vendor name.');
        const v = await createVendor(typed);
        vendorId = v.id;
        setVendor(v);
      }

      const payload = {
        vendor_voucher: {
          vendor_id: vendorId,
          date: dateISO,                            // YYYY-MM-DD
          payment_mode: paymentMode || null,        // key
          cheque_no: paymentMode === 'cheque' ? chequeNo : null,
          items_attributes: items
            .filter((i) => i.particulars?.trim() || i.amount_rs)
            .map((i) => ({
              particulars: i.particulars,
              amount_rs: Number(i.amount_rs) || 0,
            })),
        },
      };

      if (editing) {
        await api.put(`/vendor_vouchers/${initial.id}`, payload);
      } else {
        await api.post('/vendor_vouchers', payload);
      }

      Alert.alert('Success', `Voucher ${editing ? 'updated' : 'created'}.`);
      // Try normal nested navigate; if something odd, hard reset.
      try {
        goToVouchersTab();
      } catch {
        hardResetToVouchers();
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const showCreateRow =
    vendorDropOpen &&
    query.trim() &&
    !suggestions.some((s) => s.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>{editing ? 'Edit Voucher' : 'New Voucher'}</Text>

      {/* Vendor type-ahead */}
      <Text style={styles.label}>Vendor</Text>
      <View style={{ position: 'relative', zIndex: 20 }}>
        <TextInput
          style={styles.input}
          value={query}
          onFocus={() => setVendorDropOpen(true)}
          onChangeText={(t) => {
            setQuery(t);
            setVendor(null);
            setVendorDropOpen(!!t.trim());
          }}
          placeholder="Search or type vendor name"
          autoCapitalize="words"
        />

        {vendorDropOpen && (!!suggestions.length || showCreateRow) && (
          <View
            style={[
              styles.dropdown,
              Platform.OS === 'android'
                ? { elevation: 6 }
                : { shadowOpacity: 0.15, shadowRadius: 8 },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.dropdownScroll}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {/* Existing suggestions */}
              {suggestions.map((item, idx) => (
                <TouchableOpacity
                  key={item.id ?? idx}
                  style={styles.option}
                  onPress={() => onPickSuggestion(item)}
                >
                  <MaterialIcons name="store" size={16} />
                  <Text style={styles.optionText}>{item.name}</Text>
                </TouchableOpacity>
              ))}

              {/* “Create” row when no exact match */}
              {showCreateRow && (
                <TouchableOpacity
                  style={styles.option}
                  onPress={async () => {
                    try {
                      const v = await createVendor(query.trim());
                      onPickSuggestion(v); // closes & fills
                    } catch (err) {
                      Alert.alert('Error', err.message);
                    }
                  }}
                >
                  <MaterialIcons name="add" size={16} />
                  <Text style={styles.optionText}>Create “{query.trim()}”</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Payment Mode */}
      <Text style={styles.label}>Payment Mode</Text>
      <View style={{ position: 'relative', zIndex: 10 }}>
        <TouchableOpacity
          style={[styles.input, styles.selectLike]}
          onPress={() => setShowModeDrop((s) => !s)}
          activeOpacity={0.85}
        >
          <Text style={{ color: paymentMode ? '#0f172a' : '#94a3b8' }}>
            {labelForMode(paymentMode) || 'Select payment mode'}
          </Text>
          <MaterialIcons
            name={showModeDrop ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
          />
        </TouchableOpacity>

        {showModeDrop && (
          <View
            style={[
              styles.dropdown,
              Platform.OS === 'android'
                ? { elevation: 6 }
                : { shadowOpacity: 0.15, shadowRadius: 8 },
            ]}
          >
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
              {PAYMENT_MODES.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={styles.option}
                  onPress={() => {
                    setPaymentMode(m.key);
                    if (m.key !== 'cheque') setChequeNo('');
                    setShowModeDrop(false);
                  }}
                >
                  <MaterialIcons name="payments" size={16} />
                  <Text style={styles.optionText}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Date (with native picker) */}
      <Text style={styles.label}>Date</Text>
      <TouchableOpacity
        onPress={openDatePicker}
        activeOpacity={0.9}
        style={[styles.input, styles.selectLike]}
      >
        <Text style={{ color: dateISO ? '#0f172a' : '#94a3b8' }}>
          {dateISO || 'Select date'}
        </Text>
        <MaterialIcons name="event" size={18} />
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          value={dateObj || new Date()}
          onChange={onChangeDate}
          // maximumDate={new Date()} // uncomment if you want to restrict to today/past
        />
      )}

      {/* Cheque No (conditional) */}
      {paymentMode === 'cheque' && (
        <>
          <Text style={styles.label}>Cheque No</Text>
          <TextInput
            style={styles.input}
            value={chequeNo}
            onChangeText={setChequeNo}
            placeholder="e.g., 5545454"
            keyboardType="number-pad"
          />
        </>
      )}

      {/* Items */}
      <View
        style={{
          marginTop: 14,
          marginBottom: 6,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={styles.h2}>Items</Text>
        <TouchableOpacity onPress={addRow} style={styles.addBtn}>
          <MaterialIcons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {items.map((it, idx) => (
        <View key={idx} style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Particulars"
            value={it.particulars}
            onChangeText={(t) => upd(idx, 'particulars', t)}
          />
          <TextInput
            style={[styles.input, { width: 110, marginLeft: 8 }]}
            placeholder="Amount"
            value={String(it.amount_rs ?? '')}
            onChangeText={(t) => upd(idx, 'amount_rs', t)}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity onPress={() => removeRow(idx)} style={styles.removeBtn}>
            <MaterialIcons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.total}>Total: ₹{total}</Text>

      <TouchableOpacity onPress={onSave} style={styles.saveBtn} activeOpacity={0.9}>
        <MaterialIcons name="save" size={18} color="#fff" />
        <Text style={styles.saveText}>{editing ? 'Update' : 'Save'}</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  h2: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 12, marginBottom: 6 },
  input: {
    height: 46,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  selectLike: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Dropdown container (absolute)
  dropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    maxHeight: 260,
    overflow: 'hidden',
    zIndex: 999,
  },
  dropdownScroll: { maxHeight: 220 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  optionText: { fontSize: 14, color: '#0f172a', marginLeft: 6 },

  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 6 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#004080',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
  removeBtn: {
    marginLeft: 8,
    backgroundColor: '#ef4444',
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  total: { marginTop: 10, fontSize: 15, fontWeight: '800', color: '#0f172a' },
  saveBtn: {
    marginTop: 18,
    backgroundColor: '#22c55e',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveText: { color: '#fff', fontWeight: '800' },
});

