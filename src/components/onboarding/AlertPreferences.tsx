import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const AlertPreferences: React.FC<{ onNext?: () => void; onBack?: () => void }> = ({ onNext, onBack }) => (
  <Card>
    <CardContent className="p-4">
      <p className="mb-4">Alert Preferences Onboarding - Component not implemented</p>
      <div className="flex gap-2">
        {onBack && <Button variant="outline" onClick={onBack}>Back</Button>}
        {onNext && <Button onClick={onNext}>Finish</Button>}
        {onNext && <Button variant="ghost" onClick={onNext}>Skip for now</Button>}
      </div>
    </CardContent>
  </Card>
);