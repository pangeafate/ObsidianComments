// Component for prompting anonymous users to enter their name

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserIcon, CheckIcon } from 'lucide-react';
import { Button } from './ui/Button';

interface NamePromptProps {
  onSubmit: (name: string) => void;
}

export function NamePrompt({ onSubmit }: NamePromptProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    
    if (!trimmedName) return;
    
    setIsSubmitting(true);
    onSubmit(trimmedName);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-sm w-full mx-auto p-4"
    >
      <div className="bg-white rounded-xl shadow-large border border-gray-100 p-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-center mb-6"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-medium">
            <UserIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Join Collaboration
          </h2>
          <p className="text-sm text-gray-600">
            Enter your name to start editing together
          </p>
        </motion.div>

        {/* Form */}
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          onSubmit={handleSubmit} 
          className="space-y-4"
        >
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
              autoFocus
              disabled={isSubmitting}
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-2">
              Visible to other collaborators
            </p>
          </div>

          <Button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            loading={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? 'Joining...' : 'Join Collaboration'}
          </Button>
        </motion.form>

        {/* Features list */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-6 pt-4 border-t border-gray-200"
        >
          <h3 className="text-xs font-medium text-gray-900 mb-3">
            What you can do:
          </h3>
          <ul className="space-y-2 text-xs text-gray-600">
            <li className="flex items-center">
              <CheckIcon className="w-3 h-3 text-success-500 mr-2" />
              Real-time collaborative editing
            </li>
            <li className="flex items-center">
              <CheckIcon className="w-3 h-3 text-success-500 mr-2" />
              Live cursor tracking
            </li>
            <li className="flex items-center">
              <CheckIcon className="w-3 h-3 text-success-500 mr-2" />
              Comments & discussions
            </li>
          </ul>
        </motion.div>
      </div>
    </motion.div>
  );
}