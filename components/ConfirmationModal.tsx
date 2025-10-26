import React from 'react';
import { Modal } from './Modal';
import { CheckIcon, CloseIcon } from './Icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="text-stone-300 mb-6">{message}</div>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="p-3 bg-stone-700 hover:bg-stone-600 rounded-lg text-stone-300 hover:text-white"
          title="No"
          aria-label="No"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
        <button
          onClick={handleConfirm}
          className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          title="Yes"
          aria-label="Yes"
        >
          <CheckIcon className="w-6 h-6" />
        </button>
      </div>
    </Modal>
  );
};
