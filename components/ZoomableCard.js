import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import {
  PanGestureHandler,
  PinchGestureHandler,
  TapGestureHandler,
} from 'react-native-gesture-handler';

export default function ZoomableCard({ children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScale = useRef(1);
  const lastX = useRef(0);
  const lastY = useRef(0);

  const pinchRef = useRef();
  const panRef = useRef();
  const doubleTapRef = useRef();

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { useNativeDriver: false } // ✅ no nesting error
  );

  const onPinchStateChange = (event) => {
    if (event.nativeEvent.oldState === 4) {
      lastScale.current *= event.nativeEvent.scale;
      scale.setValue(lastScale.current);
    }
  };

  const onPanEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
          translationY: translateY,
        },
      },
    ],
    { useNativeDriver: false }
  );

  const onPanStateChange = (event) => {
    if (event.nativeEvent.oldState === 4) {
      lastX.current += event.nativeEvent.translationX;
      lastY.current += event.nativeEvent.translationY;
      translateX.setValue(lastX.current);
      translateY.setValue(lastY.current);
    }
  };

  const onDoubleTap = () => {
    lastScale.current = 1;
    lastX.current = 0;
    lastY.current = 0;
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
  };

  return (
    <TapGestureHandler
      ref={doubleTapRef}
      numberOfTaps={2}
      onActivated={onDoubleTap}
    >
      <PanGestureHandler
        ref={panRef}
        simultaneousHandlers={[pinchRef, doubleTapRef]}
        onGestureEvent={onPanEvent}
        onHandlerStateChange={onPanStateChange}
        activeOffsetX={[-10, 10]} // ✅ avoids accidental triggers
        activeOffsetY={[-10, 10]}
      >
        <PinchGestureHandler
          ref={pinchRef}
          simultaneousHandlers={[panRef, doubleTapRef]}
          onGestureEvent={onPinchEvent}
          onHandlerStateChange={onPinchStateChange}
        >
          <Animated.View
            style={[
              styles.cardContainer,
              {
                transform: [
                  { scale: scale },
                  { translateX: translateX },
                  { translateY: translateY },
                ],
              },
            ]}
          >
            {children}
          </Animated.View>
        </PinchGestureHandler>
      </PanGestureHandler>
    </TapGestureHandler>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 3,
  },
});

