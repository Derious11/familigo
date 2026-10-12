import Modal from './ui/Modal';

import React from 'react';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
    title: string;
    message: string;
    confirmText?: string;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, onClose, onConfirm, isLoading, title, message, confirmText = 'Delete' }) => {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={() => { if (!isLoading) onClose(); }} title={title} className="app-danger-dialog">
            <p className="app-dialog-description">{message}</p>
            <div className="app-confirm-actions">
                <button type="button" onClick={onClose} disabled={isLoading} className="app-secondary-action">Cancel</button>
                <button type="button" onClick={onConfirm} disabled={isLoading} className="app-danger-action">{isLoading ? 'Deleting…' : confirmText}</button>
            </div>
        </Modal>
    );
};

export default ConfirmDeleteModal;
