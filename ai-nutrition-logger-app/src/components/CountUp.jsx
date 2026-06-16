import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

// Animates a number from its current displayed value to `value`. On first mount
// it counts up from 0; when `value` later changes (e.g. fresh data arrives) it
// smoothly tweens from the current number to the new one.
export default function CountUp({ value, duration = 0.8 }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: 'easeOut' });
    return controls.stop;
  }, [value, mv, duration]);
  return <motion.span>{rounded}</motion.span>;
}
