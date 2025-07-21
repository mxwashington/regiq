import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import MobileFilterPanel from './MobileFilterPanel';
import AlertCard from './AlertCard';
import ThirdShiftStatus from './ThirdShiftStatus';

// Mock data for demo purposes
const mockAlerts = [
  {
    id: 1,
    title: "FDA Issues New Medical Device Guidance",
    source: "FDA",
    urgency: "high",
    published_date: "2024-07-20T10:30:00Z",
    summary: "New guidance document released for Class II medical devices.",
    external_url: "https://fda.gov/guidance/medical-devices/new-guidance-2024",
    tags: ["Medical Devices", "FDA", "Guidance"]
  },
  {
    id: 2,
    title: "EU MDR Implementation Update",
    source: "EU Commission",
    urgency: "medium",
    published_date: "2024-07-19T14:15:00Z",
    summary: "Updated implementation timeline for Medical Device Regulation.",
    external_url: "https://ec.europa.eu/health/mdr-update-2024",
    tags: ["EU MDR", "Medical Devices", "Regulation"]
  },
  {
    id: 3,
    title: "ISO 13485:2024 Draft Standard Released",
    source: "ISO",
    urgency: "low",
    published_date: "2024-07-18T09:00:00Z",
    summary: "New draft of quality management standard for medical devices.",
    external_url: "https://iso.org/standard/iso-13485-2024-draft",
    tags: ["ISO", "Quality Management", "Standards"]
  }
];

const mockFilters = {
  sources: ["FDA", "EU Commission", "ISO", "Health Canada", "TGA", "PMDA"],
  urgency: ["high", "medium", "low"],
  tags: ["Medical Devices", "FDA", "Guidance", "EU MDR", "Regulation", "ISO", "Quality Management", "Standards"],
  dateRange: ["Last 24 hours", "Last 7 days", "Last 30 days", "Custom"]
};

const RegIQFeed: React.FC = () => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    sources: [] as string[],
    urgency: [] as string[],
    tags: [] as string[],
    dateRange: 'Last 7 days'
  });
  const [filteredAlerts, setFilteredAlerts] = useState(mockAlerts);

  const handleFilterChange = (filterType: string, value: any) => {
    if (filterType === 'clear') {
      setActiveFilters({
        sources: [],
        urgency: [],
        tags: [],
        dateRange: 'Last 7 days'
      });
    } else {
      setActiveFilters(prev => ({
        ...prev,
        [filterType]: value
      }));
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = mockAlerts;

    if (activeFilters.sources.length > 0) {
      filtered = filtered.filter(alert => 
        activeFilters.sources.includes(alert.source)
      );
    }

    if (activeFilters.urgency.length > 0) {
      filtered = filtered.filter(alert => 
        activeFilters.urgency.includes(alert.urgency)
      );
    }

    if (activeFilters.tags.length > 0) {
      filtered = filtered.filter(alert => 
        alert.tags.some(tag => activeFilters.tags.includes(tag))
      );
    }

    setFilteredAlerts(filtered);
  }, [activeFilters]);

  const getActiveFilterCount = () => {
    return activeFilters.sources.length +
           activeFilters.urgency.length +
           activeFilters.tags.length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">RegIQ Feed</h1>
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors relative"
            >
              <Filter className="w-4 h-4" />
              Filters
              {getActiveFilterCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getActiveFilterCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ThirdShift.AI Status */}
        <ThirdShiftStatus />

        {/* Desktop Filters (hidden on mobile) */}
        <div className="hidden lg:block mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="grid grid-cols-4 gap-4">
              {/* Sources */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sources</label>
                <select className="w-full p-2 border border-gray-300 rounded-md text-sm">
                  <option>All Sources</option>
                  {mockFilters.sources.map(source => (
                    <option key={source}>{source}</option>
                  ))}
                </select>
              </div>
              
              {/* Urgency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
                <select className="w-full p-2 border border-gray-300 rounded-md text-sm">
                  <option>All Levels</option>
                  {mockFilters.urgency.map(level => (
                    <option key={level} className="capitalize">{level}</option>
                  ))}
                </select>
              </div>
              
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <select className="w-full p-2 border border-gray-300 rounded-md text-sm">
                  <option>All Tags</option>
                  {mockFilters.tags.map(tag => (
                    <option key={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <select className="w-full p-2 border border-gray-300 rounded-md text-sm">
                  {mockFilters.dateRange.map(range => (
                    <option key={range}>{range}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No alerts match your filters</div>
              <button 
                onClick={() => handleFilterChange('clear', null)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear filters to see all alerts
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Panel */}
      <MobileFilterPanel 
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        filters={mockFilters}
        onFilterChange={handleFilterChange}
        activeFilters={activeFilters}
      />
    </div>
  );
};

export default RegIQFeed;