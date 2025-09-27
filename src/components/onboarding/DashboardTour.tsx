import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const DashboardTour: React.FC<{ onBack?: () => void }> = ({ onBack }) => (
  <Card>
    <CardContent className="p-4">
      Dashboard Tour Onboarding - Component not implemented
      {onBack && <button onClick={onBack}>Back</button>}
    </CardContent>
  </Card>
);