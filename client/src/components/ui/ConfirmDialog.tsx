import { Modal } from './Modal.js';

interface ConfirmDialogProps {
  message:   string;
  confirmLabel?: string;
  cancelLabel?:  string;
  danger?:   boolean;
  onConfirm: () => void;
  onCancel:  () => void;
}

/** Replaces window.confirm() with a proper styled modal */
export function ConfirmDialog({
  message,
  confirmLabel = 'تأكيد',
  cancelLabel  = 'إلغاء',
  danger       = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title="تأكيد الإجراء" onClose={onCancel} size="sm">
      <p style={{ marginBottom: 20, lineHeight: 1.7 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onCancel}>{cancelLabel}</button>
        <button className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
