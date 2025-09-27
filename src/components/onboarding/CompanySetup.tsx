import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const CompanySetup: React.FC<{ onNext?: () => void }> = ({ onNext }) => (
  <Card>
    <CardContent className="p-4">
      Company Setup Onboarding - Component not implemented
      {onNext && <button onClick={onNext}>Next</button>}
    </CardContent>
  </Card>
);