import React, { useState } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Alert, Image, ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

export default function SubmitCallReportScreen({ route, navigation }) {
  const { callReportId } = route.params;

  const [actionTaken, setActionTaken] = useState('');
  const [feedbackRating, setFeedbackRating] = useState('');
  const [status, setStatus] = useState('');
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [km, setKm] = useState('');

  const askPermissions = async () => {
    const camera = await ImagePicker.requestCameraPermissionsAsync();
    const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!camera.granted || !media.granted) {
      Alert.alert('Permissions required', 'Please allow camera and media access.');
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

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const captureWithCamera = async () => {
    const ok = await askPermissions();
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const submitReport = async () => {
    if (!actionTaken || !status || !km || isNaN(km)) {
      Alert.alert('Validation Error', 'All fields except signcopy are required.');
      return;
    }

    setSubmitting(true);

    const userId = await AsyncStorage.getItem('user_id');
    const formData = new FormData();

    formData.append('call_report[action_taken]', actionTaken);
    formData.append('call_report[feedback_rating]', feedbackRating);
    formData.append('call_report[status]', status);
    formData.append('call_report[km]',km);

    if (image) {
      formData.append('call_report[signed_copy]', {
        uri: image.uri,
        name: 'signed_copy.jpg',
        type: 'image/jpeg',
      });
    }

    try {
      const response = await fetch(`http://192.34.58.213/gayatri/api/call_reports/${callReportId}/submit_report/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const json = await response.json();
      setSubmitting(false);

      if (json.success) {
        Alert.alert('Success', 'Call report submitted');
        navigation.goBack();
      } else {
        Alert.alert('Error', json.errors?.join(', ') || 'Submission failed');
      }
    } catch (error) {
      setSubmitting(false);
      Alert.alert('Error', 'Network error during submission');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Action Taken *</Text>
      <TextInput
        style={styles.input}
	  placeholderTextColor="#666"  // ✅ Darker placeholder

        value={actionTaken}
        onChangeText={setActionTaken}
        placeholder="Describe what was done"
        multiline
      />


<Text style={styles.label}>Status *</Text>
<View style={styles.pickerWrapper}>
  <Picker
    selectedValue={status}
    onValueChange={(itemValue) => setStatus(itemValue)}
  >
    <Picker.Item color="#999" label="Select status" value="" />
    <Picker.Item color="#999" label="Pending" value="Pending" />
    <Picker.Item color="#999" label="In Progress" value="In Progress" />
    <Picker.Item color="#999" label="Completed" value="Completed" />
  </Picker>
</View>

      <Text style={styles.label}>Distance Travelled (km)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 12.5"
        placeholderTextColor="#666"  // ✅ Darker placeholder
        value={km}
        onChangeText={setKm}
        keyboardType="numeric"
      />

      <View style={{ marginVertical: 10 }}>
        <Button title="Capture Signcopy with Camera" onPress={captureWithCamera} />
        <View style={{ height: 10 }} />
        <Button title="Pick Signcopy from Gallery" onPress={pickFromGallery} />
      </View>

      {image && <Image source={{ uri: image.uri }} style={styles.preview} />}

      <View style={{ marginTop: 20 }}>
        <Button
          title={submitting ? "Submitting..." : "Submit Call Report"}
          onPress={submitReport}
          disabled={submitting}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  label: {
    marginTop: 15,
    fontWeight: 'bold',
  },

input: {
  borderWidth: 1,
  borderColor: '#ccc',
  backgroundColor: '#fff', // Light background
  color: '#000',           // Text color
  padding: 10,
  borderRadius: 8,
  marginBottom: 20,
},

  preview: {
    width: '100%',
    height: 200,
    marginTop: 10,
    borderRadius: 5,
  },
pickerWrapper: {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 5,
  marginTop: 5,
  marginBottom: 10,
},
picker: {
  height: 50,
  color: "#000" // darker text if selected
}


});

