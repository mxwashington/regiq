import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const CompanySetup: React.FC<{ onNext?: () => void }> = ({ onNext }) => (
  <Card>
    <CardContent className="p-4">
      <p className="mb-4">Company Setup Onboarding - Component not implemented</p>
      <div className="flex gap-2">
        {onNext && <Button onClick={onNext}>Next</Button>}
        {onNext && <Button variant="outline" onClick={onNext}>Skip for now</Button>}
      </div>
    </CardContent>
  </Card>
);