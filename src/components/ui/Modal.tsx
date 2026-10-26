import React,{ useEffect,useMemo,useRef } from 'react';
import { XMarkIcon } from '../Icons';
import { lockScroll } from '../../lib/scrollLock.mjs';
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
    trapFocus?: boolean;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, className = '', trapFocus }) => {
    const containFocus = trapFocus ?? true;
    const dialogRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!isOpen || !containFocus)
            return;
        const previousFocus = document.activeElement as HTMLElement | null;
        const dialog = dialogRef.current;
        const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]') || []).filter(element => element.getClientRects().length > 0);
        focusable()[0]?.focus();
        const trap = (event: KeyboardEvent) => {
            if (event.key !== 'Tab')
                return;
            const elements = focusable();
            const first = elements[0];
            const last = elements.at(-1);
            if (!elements.length) {
                event.preventDefault();
                dialog?.focus();
            }
            else if (!dialog?.contains(document.activeElement)) {
                event.preventDefault();
                first?.focus();
            }
            else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        };
        dialog?.addEventListener('keydown', trap);
        return () => { dialog?.removeEventListener('keydown', trap); previousFocus?.focus(); };
    }, [isOpen, containFocus]);
    const titleId = useMemo(() => `modal-title-${Math.random().toString(36).slice(2)}`, []);
    useEffect(() => {
        if (!isOpen) return;
        return lockScroll([document.body, document.getElementById('root')]);
    }, [isOpen]);
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape')
                onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={onClose} /* Backdrop click closes */>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} tabIndex={-1} className={`modal-container w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] bg-white dark:bg-gray-800 shadow-[0_20px_40px_rgba(0,0,0,0.12)] border border-gray-200 dark:border-slate-700 ${'app-standard-dialog'} ${className}`} onClick={(e) => e.stopPropagation()} /* Prevent backdrop close when clicking inside */>
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
                    {title && (<h2 id={titleId} className="text-xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h2>)}
                    <button onClick={onClose} aria-label="Close modal" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto overscroll-contain flex-1">
                    {children}
                </div>

                {/* Footer */}
                {footer && (<div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        {footer}
                    </div>)}
            </div>
        </div>);
};
export default Modal;
