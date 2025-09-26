import React from 'react';
import { Brain } from 'lucide-react';

export const ComplianceAssistant: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          AI Compliance Assistant
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Get expert guidance on FDA, USDA, and EPA regulations tailored to your facility and operations.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <AIComplianceChat />
      </div>
    </div>
  );
};