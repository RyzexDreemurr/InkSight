import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { 
  GestureHandlerRootView,
  TapGestureHandler,
  PanGestureHandler,
  PinchGestureHandler,
  State,
  TapGestureHandlerStateChangeEvent,
  PanGestureHandlerStateChangeEvent,
  PinchGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface ReadingGestureHandlerProps {
  children: React.ReactNode;
  onSingleTap: () => void;
  onDoubleTap: () => void;
  onLongPress: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onPinchZoom: (scale: number) => void;
  enabled?: boolean;
}

const ReadingGestureHandler: React.FC<ReadingGestureHandlerProps> = ({
  children,
  onSingleTap,
  onDoubleTap,
  onLongPress,
  onSwipeLeft,
  onSwipeRight,
  onPinchZoom,
  enabled = true,
}) => {
  const { width } = Dimensions.get('window');
  
  // Gesture refs
  const singleTapRef = useRef<TapGestureHandler>(null);
  const doubleTapRef = useRef<TapGestureHandler>(null);
  const longPressRef = useRef<TapGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);
  const pinchRef = useRef<PinchGestureHandler>(null);

  // Animated values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Gesture handlers
  const handleSingleTap = (event: TapGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.ACTIVE && enabled) {
      runOnJS(onSingleTap)();
    }
  };

  const handleDoubleTap = (event: TapGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.ACTIVE && enabled) {
      runOnJS(onDoubleTap)();
    }
  };

  const handleLongPress = (event: TapGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.ACTIVE && enabled) {
      runOnJS(onLongPress)();
    }
  };

  const handlePan = (event: PanGestureHandlerStateChangeEvent) => {
    if (!enabled) return;

    const { translationX, velocityX, state } = event.nativeEvent;

    if (state === State.ACTIVE) {
      translateX.value = translationX;
    } else if (state === State.END) {
      const swipeThreshold = width * 0.3;
      const velocityThreshold = 500;

      if (
        (Math.abs(translationX) > swipeThreshold || Math.abs(velocityX) > velocityThreshold)
      ) {
        if (translationX > 0) {
          runOnJS(onSwipeRight)();
        } else {
          runOnJS(onSwipeLeft)();
        }
      }

      // Reset position
      translateX.value = withSpring(0);
    }
  };

  const handlePinch = (event: PinchGestureHandlerStateChangeEvent) => {
    if (!enabled) return;

    const { scale: gestureScale, state } = event.nativeEvent;

    if (state === State.ACTIVE) {
      scale.value = gestureScale;
    } else if (state === State.END) {
      // Constrain scale between 0.5 and 3.0
      const constrainedScale = Math.max(0.5, Math.min(3.0, gestureScale));
      scale.value = withSpring(constrainedScale);
      runOnJS(onPinchZoom)(constrainedScale);
    }
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <PinchGestureHandler
        ref={pinchRef}
        onHandlerStateChange={handlePinch}
        simultaneousHandlers={[panRef]}
      >
        <Animated.View style={styles.container}>
          <PanGestureHandler
            ref={panRef}
            onHandlerStateChange={handlePan}
            simultaneousHandlers={[pinchRef]}
            minPointers={1}
            maxPointers={1}
          >
            <Animated.View style={styles.container}>
              <TapGestureHandler
                ref={longPressRef}
                onHandlerStateChange={handleLongPress}
                maxDurationMs={10000}
                shouldCancelWhenOutside={true}
              >
                <Animated.View style={styles.container}>
                  <TapGestureHandler
                    ref={doubleTapRef}
                    onHandlerStateChange={handleDoubleTap}
                    numberOfTaps={2}
                    maxDelayMs={300}
                  >
                    <Animated.View style={styles.container}>
                      <TapGestureHandler
                        ref={singleTapRef}
                        onHandlerStateChange={handleSingleTap}
                        waitFor={[doubleTapRef, longPressRef]}
                        numberOfTaps={1}
                      >
                        <Animated.View style={[styles.container, animatedStyle]}>
                          {children}
                        </Animated.View>
                      </TapGestureHandler>
                    </Animated.View>
                  </TapGestureHandler>
                </Animated.View>
              </TapGestureHandler>
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </PinchGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ReadingGestureHandler;
