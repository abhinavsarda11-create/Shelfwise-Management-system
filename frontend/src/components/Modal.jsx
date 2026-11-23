import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} onMouseDown={onClose}>
      <motion.div
        className={'modal' + (wide ? ' wide' : '')}
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header>
          <h3>{title}</h3>
          <button className="icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        {children}
      </motion.div>
    </motion.div>,
    document.body
  );
}
