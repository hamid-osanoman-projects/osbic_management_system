import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JobBuilder } from '../employee/JobBuilder';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preSelectedClientId?: string;
}

const CreateJobModal = ({ isOpen, onClose, preSelectedClientId }: Props) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/40 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 bg-black/70" 
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-3xl max-h-[90vh] bg-[#1a2130] rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col border border-white/10"
        >
          <JobBuilder
            onClose={onClose}
            onJobCreated={() => {
              onClose();
            }}
            preSelectedClientId={preSelectedClientId}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateJobModal;
