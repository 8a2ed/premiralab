import { useEffect } from 'react';

interface ToastProps {
  text: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export function Toast({ text, type = 'info', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);  // FIX: correct dependency

  return (
    <div className={`toast toast--${type}`} role="alert" aria-live="assertive">
      <span>{text}</span>
      <button className="toast__close" onClick={onClose} aria-label="إغلاق الإشعار">×</button>
    </div>
  );
}
