import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const Welcome: React.FC<{ onNext?: () => void }> = ({ onNext }) => (
  <Card>
    <CardContent className="p-4">
      Welcome Onboarding - Component not implemented
      {onNext && <button onClick={onNext}>Next</button>}
    </CardContent>
  </Card>
);