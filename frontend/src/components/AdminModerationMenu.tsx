import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiMoreHorizontal, FiTrash2 } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { themedConfirm } from '../utils/themedDialog';

export type AdminModerationMenuVariant = 'post' | 'admin';

type AdminModerationMenuProps = {
  /** Parent computes visibility (e.g. own-post check for Hub). */
  visible: boolean;
  variant?: AdminModerationMenuVariant;
  onDelete: () => Promise<void>;
  className?: string;
};

/**
 * Red overflow for platform moderation: delete-only.
 * Posts: parent passes visible when staff/admin and not own post.
 * Other content: parent passes visible when role === 'admin'.
 */
const AdminModerationMenu: React.FC<AdminModerationMenuProps> = ({
  visible,
  variant = 'admin',
  onDelete,
  className = '',
}) => {
  const { t } = useTranslation();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!visible) return null;

  const ring =
    variant === 'post'
      ? isSpace
        ? 'border-red-400/50 text-red-300 hover:bg-red-500/15 hover:border-red-400'
        : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
      : isSpace
        ? 'border-red-500/45 text-red-300 hover:bg-red-500/20 hover:border-red-400'
        : 'border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400';

  const panelSpace = 'border-red-500/25 bg-[#1a0a0c] shadow-[0_16px_48px_rgba(0,0,0,0.55)]';
  const panelGround = 'border-red-100 bg-white shadow-[0_12px_40px_rgba(185,28,28,0.12)]';

  const handleDelete = async () => {
    const ok = await themedConfirm(t('moderation.confirmDelete'));
    if (!ok) return;
    setOpen(false);
    await onDelete();
  };

  return (
    <div className={`relative shrink-0 ${className}`} ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('moderation.menuAria')}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors md:h-8 md:w-8 ${ring}`}
      >
        <FiMoreHorizontal size={14} className="shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            role="menu"
            className={`absolute right-0 z-[60] mt-1.5 min-w-[9.5rem] rounded-xl border py-1.5 ${isSpace ? panelSpace : panelGround}`}
          >
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                void handleDelete();
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest md:text-xs ${
                isSpace ? 'text-red-300 hover:bg-red-500/20' : 'text-red-600 hover:bg-red-50'
              }`}
            >
              <FiTrash2 size={13} />
              {t('moderation.deleteContent')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminModerationMenu;
