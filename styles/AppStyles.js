// styles/AppStyles.js
import { Platform, StyleSheet, StatusBar } from 'react-native'; // ⬅️ add StatusBar

/**
 * Design tokens (tweak these to re-theme the whole app)
 */
export const colors = {
  bg: '#f6f8fb',
  card: '#ffffff',
  text: '#0f172a',
  subtext: '#64748b',
  border: '#e5e7eb',
  focus: '#2563eb',
  primary: '#2563eb',
  danger: '#dc3545',
  success: '#065f46',
  warning: '#f59e0b',
  chipBg: '#f8fafc',
  divider: '#eef2f7',
};

export const radius  = { sm: 8, md: 10, lg: 12, xl: 14, pill: 999 };
export const spacing = { xs: 6, sm: 8, md: 10, lg: 12, xl: 16, xxl: 20 };

export const shadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
  android: { elevation: 2 },
});

// ⬇️ safe top gap we can reuse on pages that start at the very top
const STATUSBAR_GAP = Platform.select({
  ios: 16, // small notch/bounce
  android: (StatusBar.currentHeight || 0) + 12,
});

/**
 * Global, merged styles
 */
const S = StyleSheet.create({
badgeSuccess: { backgroundColor: '#16a34a' }, // green
badgeWarning: { backgroundColor: '#f59e0b' }, // amber

  // Layout
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  // ⬇️ apply this in addition to `screen` where you want extra safe top space
  screenPadTop: { paddingTop: STATUSBAR_GAP + spacing.md },
form: {
  marginTop: spacing.md,
  marginBottom: spacing.md,
},
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Headers / Titles
  header: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.bg },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { marginTop: 4, fontSize: 12, color: colors.subtext },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },

  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  cardFooter: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },

  // Key/Value rows + aliases
  kvRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },

kvK: {
  fontWeight: '600',
  color: '#334155',
  marginRight: 4,
},
kvV: {
  color: colors.text,
  fontWeight: '500',
},

  kv: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
k: {
  fontWeight: '700',
  color: '#334155',
  marginRight: 4,        // tiny gap instead of fixed width
},
v: {
  color: colors.text,
  fontWeight: '500',
},

  // Chips / Badges
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipPrimary: { backgroundColor: '#e8f0fe', borderColor: '#dbeafe' },
  chipNeutral: { backgroundColor: '#eee', borderColor: '#e5e7eb' },
  chipText: { fontSize: 12, color: colors.text },
  badge: {
    color: '#f8fafc',
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontSize: 12,
  },
  badgeMeasure: { backgroundColor: '#f0f9ff' },
  badgeMoney: { backgroundColor: '#fff7ed' },
  badgeRow: { marginTop: spacing.sm, flexDirection: 'row', justifyContent: 'flex-end' },

  // Forms
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    minHeight: 44,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  leftIcon: { marginRight: 10, opacity: 0.9 },
  smallLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginBottom: 4, textTransform: 'uppercase', color: colors.subtext },
  pickerWrap: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.card, overflow: 'hidden', height: 48, justifyContent: 'center',
  },
  picker: { color: colors.text, height: 48, fontSize: 14 },
  pickerItem: { color: colors.text, fontSize: 16 },
  dateBtn: { height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, justifyContent: 'center', paddingHorizontal: spacing.md, backgroundColor: colors.card },
  dateBtnText: { color: colors.text, fontSize: 16 },

  // Conveyance list specifics
  spacer: { flex: 1 },
  infoRow: { flexDirection: 'row', marginBottom: spacing.sm },
  infoLabel: { width: 70, color: '#666' },
  infoValue: { flex: 1, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },

  addBtn: {
    position: 'absolute', right: 16, bottom: 20, backgroundColor: colors.primary,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.pill, ...shadow,
  },

  // Buttons
  btn: {
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.text, fontWeight: '700', fontSize: 15 },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  secondaryBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  secondaryText: { color: colors.text, fontWeight: '700', fontSize: 15 },

  softDangerBtn: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  softDangerText: { color: '#7f1d1d', fontWeight: '700', fontSize: 15 },

  dangerBtn: {
    backgroundColor: colors.danger,
    ...Platform.select({
      ios: { shadowColor: '#b91c1c', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 8 }, shadowRadius: 14 },
      android: { elevation: 2 },
    }),
  },

  button: { backgroundColor: '#004080', paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  btnDisabled: { opacity: 0.6 },
  ctaBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 14, borderRadius: 14,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOpacity: 0.25, shadowOffset: { width: 0, height: 8 }, shadowRadius: 14 },
      android: { elevation: 2 },
    }),
  },
  ctaText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingVertical: 14, borderRadius: 14, borderColor: colors.border },
  cancelText: { fontSize: 15, fontWeight: '700', color: colors.danger },
  cardActions: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end' },

  // Bars
  actionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing.xl, paddingTop: spacing.sm,
    backgroundColor: '#ffffffee',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
     zIndex: 50,
 ...Platform.select({ android: { elevation: 8 } }),
  },
  bottomBar: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },

  // Misc
  srOnly: { position: 'absolute', height: 0, width: 0, opacity: 0 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, color: '#444' },
  errorText: {
    color: '#7f1d1d', backgroundColor: '#fecaca',
    borderColor: '#ef4444', borderWidth: 1, padding: spacing.sm,
    borderRadius: radius.md, marginBottom: spacing.sm,
  },

  // Media helpers
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.lg,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
    borderColor: colors.border, backgroundColor: colors.card,
  },
  actionText: { fontSize: 14, fontWeight: '600', color: colors.text },
  previewWrap: { marginTop: spacing.md, alignItems: 'flex-start' },
  previewImg: { width: 240, height: 240, borderRadius: radius.lg },

  // Text utilities
  bold: { fontWeight: '800' },
  mono: { fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }), color: '#cbd5e1' },

  // Scroll helpers (login/register)
  scroll: { flexGrow: 1 },
  scrollContainer: { flexGrow: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },

  // Extras
  cardLine: { color: '#333' },
  footerLoading: { paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center' },
  footerText: { color: '#cbd5e1', fontSize: 12, marginTop: 6 },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: colors.subtext, marginTop: 4 },


// Add these to S = StyleSheet.create({...})
formContent: {
  paddingHorizontal: spacing.xl,
  paddingTop: spacing.lg,
  // NOTE: no flex here — lets content grow and scroll
  rowGap: spacing.md, // RN >=0.71, else remove
},
titleRow: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.bg,
  paddingBottom: spacing.sm,
  marginBottom: spacing.sm,
},
titleIconWrap: {
  width: 28, height: 28, borderRadius: 14,
  alignItems: 'center', justifyContent: 'center',
  backgroundColor: '#e8f0fe',
  marginRight: 8,
},


});

S.colorsFor = (_scheme) => ({
  bg: colors.bg,
  card: colors.card,
  text: colors.text,
  subtext: colors.subtext,
  border: colors.border,
  primary: colors.primary,
  danger: colors.danger,
  focus: colors.focus,
});


export default S;

