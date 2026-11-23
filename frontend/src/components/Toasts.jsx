import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function Toasts() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const show = (e) => {
      const t = e.detail;
      setItems((list) => [...list, t]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), 3600);
    };
    window.addEventListener('toast', show);
    return () => window.removeEventListener('toast', show);
  }, []);

  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            className={'toast ' + t.type}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            {t.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
