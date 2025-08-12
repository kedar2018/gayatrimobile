import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SubmitCallReportScreen({ route, navigation }) {
  const { report = {} } = route.params || {};
  const callReportId = report?.id;

  const [actionTaken, setActionTaken] = useState("");
  const [status, setStatus] = useState(report?.status || "");
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const askPermissions = async () => {
    const camera = await ImagePicker.requestCameraPermissionsAsync();
    const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!camera.granted || !media.granted) {
      Alert.alert("Permissions required", "Please allow camera and media access.");
      return false;
    }
    return true;
  };

  const pickFromGallery = async () => {
    const ok = await askPermissions();
    if (!ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const captureWithCamera = async () => {
    const ok = await askPermissions();
    if (!ok) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const removeImage = () => setImage(null);

  const submitReport = async () => {
    if (!actionTaken || !status) {
      Alert.alert("Validation Error", "Action and Status are required.");
      return;
    }
    if (!callReportId) {
      Alert.alert("Error", "Missing Call Report ID.");
      return;
    }

    try {
      setSubmitting(true);

      const userId = await AsyncStorage.getItem("user_id");
      const formData = new FormData();
      formData.append("call_report[action_taken]", actionTaken);
      formData.append("call_report[status]", status);
      formData.append("call_report[user_id]", userId || "");

      if (image) {
        formData.append("call_report[signed_copy]", {
          uri: image.uri,
          name: "signed_copy.jpg",
          type: "image/jpeg",
        });
      }

      const response = await fetch(
        `http://134.199.178.17/gayatri/api/call_reports/${callReportId}/submit_report/`,
        { method: "PATCH", body: formData }
      );
      const json = await response.json();

      if (json.success) {
        Alert.alert("Success", "Call report submitted");
        navigation.goBack();
      } else {
        Alert.alert("Error", json.errors?.join(", ") || "Submission failed");
      }
    } catch (e) {
      Alert.alert("Error", "Network error during submission");
    } finally {
      setSubmitting(false);
    }
  };

  const StatusChip = ({ label, value }) => (
    <TouchableOpacity
      onPress={() => setStatus(value)}
      style={[styles.chip, status === value && styles.chipActive]}
    >
      <Text style={[styles.chipText, status === value && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Build summary rows from report

// --- put this inside your component, before building rows ---
const cd = (report && typeof report.customer_detail === "object" && report.customer_detail) || {};

const customerName = report.customer_name || cd.customer_name || cd.name || "";
const phone       = report.mobile_number || cd.mobile_number || cd.phone_number || "";
const address     = report.address || cd.address || "";
const city        = report.city || cd.city || "";

// Build rows ONLY with strings
const rows = [
  report.case_id ? { icon: "🧾", label: "CCR", value: String(report.case_id) } : null,
  report.project ? { icon: "🏗️", label: "Project", value: String(report.project) } : null,
  customerName    ? { icon: "👤", label: "Customer", value: String(customerName) } : null,
  phone           ? { icon: "☎️", label: "Phone", value: String(phone) } : null,
  (address || city)
    ? { icon: "📍", label: "Address", value: [address, city].filter(Boolean).join(", ") }
    : null,
].filter(Boolean);

  const canSubmit = !submitting && actionTaken && status;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Submit Call Report</Text>
        <Text style={styles.headerSubtitle}>
          Call Report ID: {String(callReportId || "-")}
        </Text>
      </View>

      {/* Summary card */}



{rows.map((r, idx) => (
  <View key={idx} style={styles.summaryRow}>
    <Text style={styles.summaryIcon}>{r.icon}</Text>
    <Text style={styles.summaryLabel}>{r.label}</Text>
    <Text style={styles.summaryValue} numberOfLines={2}>{r.value}</Text>
  </View>
))}

      {/* Action Taken */}
      <View style={styles.card}>
        <Text style={styles.label}>Action Taken *</Text>
        <TextInput
          style={styles.inputMultiline}
          placeholder="Describe what was done"
          placeholderTextColor="#666"
          value={actionTaken}
          onChangeText={setActionTaken}
          multiline
        />
      </View>

      {/* Status */}
      <View style={styles.card}>
        <Text style={styles.label}>Status *</Text>
        <View style={styles.chipsRow}>
          <StatusChip label="Pending" value="Pending" />
          <StatusChip label="In Progress" value="In Progress" />
          <StatusChip label="Completed" value="Completed" />
        </View>
      </View>

      {/* Image actions */}
      <View style={styles.card}>
        <Text style={styles.label}>Signed Copy (optional)</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.btnOutline} onPress={captureWithCamera}>
            <Text style={styles.btnOutlineText}>📷 Capture</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline} onPress={pickFromGallery}>
            <Text style={styles.btnOutlineText}>🖼️ Gallery</Text>
          </TouchableOpacity>
        </View>

        {image && (
          <View style={styles.previewWrap}>
            <Image source={{ uri: image.uri }} style={styles.preview} />
            <TouchableOpacity style={styles.removeBadge} onPress={removeImage}>
              <Text style={styles.removeBadgeText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.btnPrimary, !canSubmit && styles.btnDisabled]}
        onPress={submitReport}
        disabled={!canSubmit}
      >
        {submitting ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.btnPrimaryText}>Submit Call Report</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const COLORS = {
  bg: "#F6F8FA",
  card: "#FFFFFF",
  text: "#111",
  subtext: "#666",
  border: "#E6E8EB",
  primary: "#2563EB",
  primaryText: "#FFFFFF",
  chipBg: "#EFF3F8",
  chipActiveBg: "#DBEAFE",
  chipText: "#374151",
  chipTextActive: "#1D4ED8",
  danger: "#EF4444",
};

const shadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: COLORS.bg },

  headerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...shadow,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  headerSubtitle: { marginTop: 6, color: COLORS.subtext },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderColor: COLORS.border,
    borderWidth: 1,
    ...shadow,
  },

  summaryTitle: { fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryIcon: { width: 24, textAlign: "center", marginRight: 8 },
  summaryLabel: { width: 90, color: COLORS.subtext, fontWeight: "600" },
  summaryValue: { flex: 1, color: COLORS.text, fontWeight: "600" },

  label: { fontWeight: "600", color: COLORS.text, marginBottom: 8 },

  inputMultiline: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 100,
    textAlignVertical: "top",
    backgroundColor: "#fff",
    color: COLORS.text,
  },

  chipsRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.chipBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.chipActiveBg, borderColor: "#BFDBFE" },
  chipText: { color: COLORS.chipText, fontWeight: "600" },
  chipTextActive: { color: COLORS.chipTextActive },

  actionsRow: { flexDirection: "row", gap: 10 },

  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  btnOutlineText: { color: COLORS.text, fontWeight: "600" },

  previewWrap: { marginTop: 12, position: "relative" },
  preview: { width: "100%", height: 220, borderRadius: 12 },
  removeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.danger,
    borderRadius: 16,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBadgeText: { color: "#fff", fontWeight: "700" },

  btnPrimary: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    ...shadow,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: COLORS.primaryText, fontWeight: "700" },
});


