// components/ModalDropdown.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Modal, View, Text, Pressable, FlatList, TextInput, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const defer = (cb) =>
  (global?.requestAnimationFrame
    ? requestAnimationFrame(() => setTimeout(cb, 0))
    : setTimeout(cb, 0));

const ITEM_HEIGHT = 48;
const MAX_HEIGHT = Math.min(360, Math.round(Dimensions.get('window').height * 0.55));

const toLabel = (opt) => (typeof opt === 'string' ? opt : (opt && opt.label != null ? String(opt.label) : String(opt ?? '')));
const toValue = (opt) => (typeof opt === 'string' ? opt : (opt && opt.value != null ? opt.value : toLabel(opt)));

export default function ModalDropdown({
  visible,
  title,
  options = [],
  selectedValue = null,
  defaultValue = null,
  onSelect,
  onClose,
  searchEnabled = false,
  searchValue = '',
  onSearchChange = () => {},
  searchPlaceholder = 'Search...',
  allowFreeText = false,
}) {
  const [ready, setReady] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setReady(false);
      defer(() => setReady(true));
      if (searchEnabled) setTimeout(() => searchRef.current?.focus?.(), 120);
    } else {
      setReady(false);
    }
  }, [visible, searchEnabled]);

  const filtered = useMemo(() => {
    if (!visible) return [];
    const arr = Array.isArray(options) ? options : [];
    const q = searchEnabled ? String(searchValue || '').trim().toLowerCase() : '';
    if (!q) return arr;
    return arr.filter((o) => toLabel(o).toLowerCase().includes(q));
  }, [visible, options, searchEnabled, searchValue]);

  const existsExact = useMemo(() => {
    if (!searchEnabled || !searchValue || !String(searchValue).trim()) return false;
    const needle = String(searchValue).trim().toLowerCase();
    const arr = Array.isArray(options) ? options : [];
    return arr.some((o) => toLabel(o).trim().toLowerCase() === needle);
  }, [options, searchEnabled, searchValue]);

  const keyExtractor = useCallback((item, idx) => {
    const v = toValue(item);
    return typeof v === 'string' ? `k:${v}:${idx}` : `i:${idx}`;
  }, []);

  const getItemLayout = useCallback((_, index) => (
    { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
  ), []);

  const renderItem = useCallback(
    ({ item }) => {
      const label = toLabel(item);
      const value = toValue(item);
      const selected = String(selectedValue ?? defaultValue ?? '') === String(value);
      return (
        <Pressable
          onPress={() => onSelect?.(value)}
          android_ripple={{ color: '#e5e7eb' }}
          style={{
            height: ITEM_HEIGHT,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 15, color: '#0f172a', flex: 1 }} numberOfLines={1}>{label}</Text>
          {selected ? <Ionicons name="checkmark" size={18} color="#2563eb" /> : null}
        </Pressable>
      );
    },
    [selectedValue, defaultValue, onSelect]
  );

  const onSearchChangeDebounced = (txt) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(txt), 80);
  };

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* overlay */}
      <Pressable
        onPress={onClose}
        accessibilityLabel="Close dropdown overlay"
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.28)' }}
      />

      {/* sheet */}
      <View
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          top: Platform.select({ ios: 84, android: 66 }),
          backgroundColor: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
            android: { elevation: 4 },
          }),
        }}
      >
        {/* header */}
        <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', minHeight: 48 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 }}>
            {title ? String(title) : 'Select'}
          </Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close dropdown">
            <Ionicons name="close" size={20} color="#6b7280" />
          </Pressable>
        </View>

        {/* search (only when enabled) */}
        {searchEnabled ? (
          <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
            <Ionicons name="search-outline" size={18} color="#6b7280" style={{ marginRight: 8 }} />
            <TextInput
              ref={searchRef}
              placeholder={searchPlaceholder}
              value={searchValue}
              onChangeText={onSearchChangeDebounced}
              placeholderTextColor="#9ca3af"
              style={{ flex: 1, fontSize: 15, paddingVertical: Platform.OS === 'ios' ? 8 : 6 }}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="done"
            />
            {searchValue ? (
              <Pressable onPress={() => onSearchChange('')} hitSlop={8} style={{ marginLeft: 6 }} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* list */}
        {ready ? (
          <FlatList
            data={filtered}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            initialNumToRender={16}
            maxToRenderPerBatch={24}
            windowSize={8}
            updateCellsBatchingPeriod={16}
            removeClippedSubviews
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: MAX_HEIGHT }}
            ListEmptyComponent={
              <View style={{ padding: 16 }}>
                <Text style={{ color: '#6b7280' }}>No results</Text>
              </View>
            }
          />
        ) : (
          <View style={{ padding: 16 }}>
            <Text style={{ color: '#6b7280' }}>Loading...</Text>
          </View>
        )}

        {/* free-text fallback */}
        {searchEnabled && allowFreeText && !!String(searchValue).trim() && !existsExact ? (
          <Pressable
            onPress={() => onSelect?.(String(searchValue).trim())}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: '#e5e7eb',
              flexDirection: 'row',
              alignItems: 'center',
            }}
            android_ripple={{ color: '#e5e7eb' }}
            accessibilityLabel="Use typed value"
          >
            <Ionicons name="add-circle-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
            <Text style={{ color: '#2563eb', fontWeight: '600' }}>
              Use "{String(searchValue).trim()}"
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}
