import React from 'react';
import { DataExportManager } from '@/components/DataExportManager';

const ExportPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Export Data</h1>
        <p className="text-muted-foreground">
          Export your regulatory alerts, supplier data, and compliance tasks in multiple formats.
        </p>
      </div>
      <DataExportManager />
    </div>
  );
};

export default ExportPage;