import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const AlertPreferences: React.FC<{ onNext?: () => void; onBack?: () => void }> = ({ onNext, onBack }) => (
  <Card>
    <CardContent className="p-4">
      Alert Preferences Onboarding - Component not implemented
      {onBack && <button onClick={onBack}>Back</button>}
      {onNext && <button onClick={onNext}>Next</button>}
    </CardContent>
  </Card>
);