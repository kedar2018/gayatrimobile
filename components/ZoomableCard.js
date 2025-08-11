import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedGestureHandler, useAnimatedStyle, useSharedValue, withDecay } from 'react-native-reanimated';
import { PanGestureHandler, PinchGestureHandler } from 'react-native-gesture-handler';

export default function ZoomableCard({ children }) {
  const scale = useSharedValue(1);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);

  // Handle pinch zoom
  const pinchHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      scale.value = Math.max(1, event.scale);
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = 1;
      }
    },
  });

  // Handle pan (only when zoomed)
  const panHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      if (scale.value > 1) {
        translationX.value += event.translationX;
        translationY.value += event.translationY;
      }
    },
    onEnd: (event) => {
      if (scale.value > 1) {
        translationX.value = withDecay({ velocity: event.velocityX });
        translationY.value = withDecay({ velocity: event.velocityY });
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translationX.value },
        { translateY: translationY.value },
        { scale: scale.value }
      ],
    };
  });

  return (
    <PinchGestureHandler onGestureEvent={pinchHandler}>
      <Animated.View style={styles.zoomableContainer}>
        <PanGestureHandler
          onGestureEvent={panHandler}
          activeOffsetX={scale.value > 1 ? undefined : [-9999, 9999]}
          activeOffsetY={scale.value > 1 ? undefined : [-9999, 9999]}
        >
          <Animated.View style={animatedStyle}>
            {children}
          </Animated.View>
        </PanGestureHandler>
      </Animated.View>
    </PinchGestureHandler>
  );
}

const styles = StyleSheet.create({
  zoomableContainer: {
    overflow: 'visible',
  },
});

