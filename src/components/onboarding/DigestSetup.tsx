import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const DigestSetup: React.FC<{ onNext?: () => void; onBack?: () => void }> = ({ onNext, onBack }) => (
  <Card>
    <CardContent className="p-4">
      Digest Setup Onboarding - Component not implemented
      {onBack && <button onClick={onBack}>Back</button>}
      {onNext && <button onClick={onNext}>Next</button>}
    </CardContent>
  </Card>
);