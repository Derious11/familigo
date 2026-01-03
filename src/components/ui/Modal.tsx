import React, { useEffect, useMemo } from 'react';
import { XMarkIcon } from '../Icons';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
    const titleId = useMemo(() => `modal-title-${Math.random().toString(36).slice(2)}`, []);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
            onClick={onClose} /* Backdrop click closes */
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                className="modal-container w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] bg-white dark:bg-gray-800 shadow-[0_20px_40px_rgba(0,0,0,0.12)] border border-gray-200 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()} /* Prevent backdrop close when clicking inside */
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
                    {title && (
                        <h2 id={titleId} className="text-xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h2>
                    )}
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto overscroll-contain flex-1">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
