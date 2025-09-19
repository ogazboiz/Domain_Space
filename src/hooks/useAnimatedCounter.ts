import { useEffect, useState } from 'react';

interface UseAnimatedCounterProps {
  targetValue: number;
  duration?: number;
  shouldStart?: boolean;
}

export const useAnimatedCounter = ({
  targetValue,
  duration = 2000,
  shouldStart = true
}: UseAnimatedCounterProps) => {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(easeOut * targetValue);

      setCurrentValue(value);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [targetValue, duration, shouldStart]);

  return currentValue;
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M+';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K+';
  }
  return num.toString();
};

export const formatCurrency = (num: number): string => {
  if (num >= 1000000000) {
    return '$' + (num / 1000000000).toFixed(1) + 'B+';
  }
  if (num >= 1000000) {
    return '$' + (num / 1000000).toFixed(1) + 'M+';
  }
  if (num >= 1000) {
    return '$' + (num / 1000).toFixed(1) + 'K+';
  }
  return '$' + num.toString();
};