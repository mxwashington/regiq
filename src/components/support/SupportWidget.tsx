import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { SupportModal } from './SupportModal';

interface SupportWidgetProps {
  className?: string;
}

export function SupportWidget({ className }: SupportWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <>
      {/* Fixed position support button */}
      <Button
        onClick={() => setIsModalOpen(true)}
        className={`fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 p-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white ${className || ''}`}
        aria-label="Contact Support"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Support Modal */}
      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
      />
    </>
  );
}