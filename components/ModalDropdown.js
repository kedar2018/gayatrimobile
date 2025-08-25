// components/ModalDropdown.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Modal, View, Text, Pressable, FlatList, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Tiny cross-engine defer (Hermes-safe)
const defer = (cb) =>
  (global?.requestAnimationFrame
    ? requestAnimationFrame(() => setTimeout(cb, 0))
    : setTimeout(cb, 0));

const ITEM_HEIGHT = 48;

const toLabel = (opt) => (typeof opt === 'string' ? opt : opt?.label ?? String(opt ?? ''));
const toValue = (opt) => (typeof opt === 'string' ? opt : opt?.value ?? toLabel(opt));

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
}) {
  const [ready, setReady] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setReady(false);
      defer(() => setReady(true)); // mount list after a frame
      if (searchEnabled) setTimeout(() => searchRef.current?.focus?.(), 120);
    } else {
      setReady(false);
    }
  }, [visible, searchEnabled]);

  const filtered = useMemo(() => {
    if (!visible) return [];
    const arr = Array.isArray(options) ? options : [];
    const q = searchEnabled ? searchValue.trim().toLowerCase() : '';
    if (!q) return arr;
    return arr.filter((o) => toLabel(o).toLowerCase().includes(q));
  }, [visible, options, searchEnabled, searchValue]);

  const keyExtractor = useCallback((item, idx) => {
    const v = toValue(item);
    return typeof v === 'string' ? `k:${v}` : `i:${idx}`;
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* overlay */}
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.28)' }} />

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
            {title || 'Select'}
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color="#6b7280" />
          </Pressable>
        </View>

        {/* search (only when enabled) */}
        {searchEnabled && (
          <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
            <Ionicons name="search-outline" size={18} color="#6b7280" style={{ marginRight: 8 }} />
            <TextInput
              ref={searchRef}
              placeholder={searchPlaceholder}
              value={searchValue}
              onChangeText={onSearchChange}
              placeholderTextColor="#9ca3af"
              style={{ flex: 1, fontSize: 15, paddingVertical: Platform.OS === 'ios' ? 8 : 6 }}
            />
            {searchValue?.length ? (
              <Pressable onPress={() => onSearchChange('')} hitSlop={8} style={{ marginLeft: 6 }}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </Pressable>
            ) : null}
          </View>
        )}

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
            style={{ maxHeight: 360 }}
            ListEmptyComponent={<View style={{ padding: 16 }}><Text style={{ color: '#6b7280' }}>No results</Text></View>}
          />
        ) : (
          <View style={{ padding: 16 }}>
            <Text style={{ color: '#6b7280' }}>Loading…</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
