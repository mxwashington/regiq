import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'json';
  dateRange?: {
    start: string;
    end: string;
  };
  categories?: string[];
  urgencyThreshold?: number;
  includeSuppliers?: boolean;
  includeTasks?: boolean;
}

export const useExportData = () => {
  const [exporting, setExporting] = useState(false);

  const exportAlerts = async (options: ExportOptions) => {
    setExporting(true);
    try {
      let query = supabase
        .from('alerts')
        .select('*');

      if (options.dateRange) {
        query = query
          .gte('published_date', options.dateRange.start)
          .lte('published_date', options.dateRange.end);
      }

      if (options.categories && options.categories.length > 0) {
        query = query.in('agency', options.categories);
      }

      if (options.urgencyThreshold) {
        query = query.gte('urgency_score', options.urgencyThreshold);
      }

      const { data: alerts, error } = await query.order('published_date', { ascending: false });
      if (error) throw error;

      if (options.format === 'csv') {
        exportToCSV(alerts, 'regiq-alerts');
      } else if (options.format === 'pdf') {
        exportToPDF(alerts, 'RegIQ Alerts Report');
      } else if (options.format === 'json') {
        exportToJSON(alerts, 'regiq-alerts');
      }

      toast.success(`Successfully exported ${alerts?.length || 0} alerts`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export data: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const exportSuppliers = async (options: ExportOptions) => {
    setExporting(true);
    try {
      const { data: suppliers, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('risk_score', { ascending: false });

      if (error) throw error;

      if (options.format === 'csv') {
        exportToCSV(suppliers, 'regiq-suppliers');
      } else if (options.format === 'pdf') {
        exportToPDF(suppliers, 'RegIQ Suppliers Report');
      } else if (options.format === 'json') {
        exportToJSON(suppliers, 'regiq-suppliers');
      }

      toast.success(`Successfully exported ${suppliers?.length || 0} suppliers`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export suppliers: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const exportTasks = async (options: ExportOptions) => {
    setExporting(true);
    try {
      let query = supabase
        .from('tasks')
        .select('*');

      if (options.dateRange) {
        query = query
          .gte('created_at', options.dateRange.start)
          .lte('created_at', options.dateRange.end);
      }

      const { data: tasks, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      if (options.format === 'csv') {
        exportToCSV(tasks, 'regiq-tasks');
      } else if (options.format === 'pdf') {
        exportToPDF(tasks, 'RegIQ Tasks Report');
      } else if (options.format === 'json') {
        exportToJSON(tasks, 'regiq-tasks');
      }

      toast.success(`Successfully exported ${tasks?.length || 0} tasks`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export tasks: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.warning('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          let value = row[header];
          if (value === null || value === undefined) value = '';
          if (typeof value === 'object') value = JSON.stringify(value);
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = (data: any[], filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (data: any[], title: string) => {
    if (!data || data.length === 0) {
      toast.warning('No data to export');
      return;
    }

    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.text(title, 20, 20);
    doc.setFontSize(12);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`Total Records: ${data.length}`, 20, 40);

    // Prepare table data
    const headers = Object.keys(data[0]).filter(key => 
      !['id', 'user_id', 'created_at', 'updated_at'].includes(key)
    );

    const tableData = data.map(row => 
      headers.map(header => {
        let value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).substring(0, 50); // Truncate long values
      })
    );

    // Add table
    (doc as any).autoTable({
      head: [headers],
      body: tableData,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    // Save PDF
    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return {
    exporting,
    exportAlerts,
    exportSuppliers,
    exportTasks
  };
};