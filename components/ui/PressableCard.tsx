import { useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';

interface Props {
  onPress?: () => void;
  children: React.ReactNode;
  style?: object | object[];
  className?: string;
  disabled?: boolean;
}

export function PressableCard({ onPress, children, style, className, disabled }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      damping: 20,
      stiffness: 400,
      mass: 0.4,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 400,
      mass: 0.4,
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={disabled}
        style={style}
        className={className}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}
