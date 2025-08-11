//not in use
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PinchGestureHandler } from 'react-native-gesture-handler';

function ZoomableItem({ text }) {
  const [scale, setScale] = useState(1);

  return (
    <PinchGestureHandler
      onGestureEvent={(e) => setScale(e.nativeEvent.scale)}
    >
      <View>
        <Text style={[styles.text, { transform: [{ scale }] }]}>{text}</Text>
      </View>
    </PinchGestureHandler>
  );
}

const styles = StyleSheet.create({
  text: {
  },
});


export default ZoomableItem;
