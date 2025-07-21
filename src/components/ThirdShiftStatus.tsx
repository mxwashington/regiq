import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

const ThirdShiftStatus: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API check
    const checkThirdShiftStatus = async () => {
      try {
        // This would be your actual ThirdShift.AI API call
        setStatus('checking');

        // Mock API call - replace with your actual endpoint
        const response = await fetch('/api/thirdshift/status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Add your API key here
            'Authorization': 'Bearer YOUR_API_KEY'
          }
        }).catch(() => {
          throw new Error('Service unavailable');
        });
        
        if (response.ok) {
          setStatus('connected');
          setError(null);
        } else {
          throw new Error(`API Error: ${response.status}`);
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    checkThirdShiftStatus();
  }, []);

  return (
    <div className="mb-4 p-4 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            status === 'connected' ? 'bg-green-500' : 
            status === 'checking' ? 'bg-yellow-500 animate-pulse' : 
            'bg-red-500'
          }`} />
          <span className="font-medium text-gray-900">ThirdShift.AI Status</span>
        </div>

        <div className="text-sm">
          {status === 'connected' && <span className="text-green-600">Connected</span>}
          {status === 'checking' && <span className="text-yellow-600">Checking...</span>}
          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span>Error: {error}</span>
            </div>
          )}
        </div>
      </div>
      
      {status === 'error' && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700 mb-2">
            <strong>ThirdShift.AI Integration Issue:</strong>
          </p>
          <ul className="text-sm text-red-600 space-y-1">
            <li>• Check API key configuration</li>
            <li>• Verify endpoint URL is correct</li>
            <li>• Ensure CORS settings allow requests</li>
            <li>• Check rate limiting and quotas</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ThirdShiftStatus;