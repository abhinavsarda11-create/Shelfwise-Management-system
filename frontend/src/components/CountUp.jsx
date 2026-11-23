import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

const plain = (n) => Math.round(n).toLocaleString('en-IN');

export default function CountUp({ value, format = plain, duration = 1.1 }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (reduce) {
      node.textContent = format(value);
      return undefined;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { node.textContent = format(v); },
    });
    return () => controls.stop();
  }, [value]);

  return <span ref={ref}>{format(0)}</span>;
}
