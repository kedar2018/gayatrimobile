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
    if (!actionTaken || !status || !feedbackRating) {
      Alert.alert('Validation Error', 'All fields except signcopy are required.');
      return;
    }

    setSubmitting(true);

    const userId = await AsyncStorage.getItem('user_id');
    const formData = new FormData();

    formData.append('call_report[action_taken]', actionTaken);
    formData.append('call_report[feedback_rating]', feedbackRating);
    formData.append('call_report[status]', status);

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
        value={actionTaken}
        onChangeText={setActionTaken}
        placeholder="Describe what was done"
        multiline
      />

      <Text style={styles.label}>Feedback Rating (1 to 5) *</Text>
      <TextInput
        style={styles.input}
        value={feedbackRating}
        onChangeText={setFeedbackRating}
        placeholder="e.g. 5"
        keyboardType="numeric"
      />

<Text style={styles.label}>Status *</Text>
<View style={styles.pickerWrapper}>
  <Picker
    selectedValue={status}
    onValueChange={(itemValue) => setStatus(itemValue)}
  >
    <Picker.Item label="Select status" value="" />
    <Picker.Item label="Pending" value="Pending" />
    <Picker.Item label="In Progress" value="In Progress" />
    <Picker.Item label="Completed" value="Completed" />
  </Picker>
</View>

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
    padding: 10,
    minHeight: 50,
    borderRadius: 5,
    marginTop: 5,
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
}

});

