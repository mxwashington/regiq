import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface MobileFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    sources: string[];
    urgency: string[];
    tags: string[];
    dateRange: string[];
  };
  onFilterChange: (filterType: string, value: any) => void;
  activeFilters: {
    sources?: string[];
    urgency?: string[];
    tags?: string[];
    dateRange?: string;
  };
}

const MobileFilterPanel: React.FC<MobileFilterPanelProps> = ({ 
  isOpen, 
  onClose, 
  filters, 
  onFilterChange, 
  activeFilters 
}) => {
  const [expandedSections, setExpandedSections] = useState({
    sources: true,
    urgency: true,
    tags: false,
    dateRange: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Filter Panel */}
      <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-blue-50">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-blue-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-20">
          {/* Sources */}
          <div className="border-b">
            <button
              onClick={() => toggleSection('sources')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">Sources</span>
              {expandedSections.sources ? 
                <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                <ChevronDown className="w-4 h-4 text-gray-500" />
              }
            </button>
            
            {expandedSections.sources && (
              <div className="px-4 pb-4 max-h-48 overflow-y-auto">
                {filters.sources.map(source => (
                  <label key={source} className="flex items-center py-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={activeFilters.sources?.includes(source) || false}
                      onChange={(e) => {
                        const newSources = e.target.checked 
                          ? [...(activeFilters.sources || []), source]
                          : (activeFilters.sources || []).filter(s => s !== source);
                        onFilterChange('sources', newSources);
                      }}
                      className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{source}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Urgency */}
          <div className="border-b">
            <button
              onClick={() => toggleSection('urgency')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">Urgency</span>
              {expandedSections.urgency ? 
                <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                <ChevronDown className="w-4 h-4 text-gray-500" />
              }
            </button>
            
            {expandedSections.urgency && (
              <div className="px-4 pb-4">
                {filters.urgency.map(level => (
                  <label key={level} className="flex items-center py-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={activeFilters.urgency?.includes(level) || false}
                      onChange={(e) => {
                        const newUrgency = e.target.checked 
                          ? [...(activeFilters.urgency || []), level]
                          : (activeFilters.urgency || []).filter(u => u !== level);
                        onFilterChange('urgency', newUrgency);
                      }}
                      className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm capitalize ${
                      level === 'high' ? 'text-red-600 font-medium' :
                      level === 'medium' ? 'text-orange-600 font-medium' :
                      'text-green-600'
                    }`}>
                      {level}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="border-b">
            <button
              onClick={() => toggleSection('tags')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">Tags</span>
              {expandedSections.tags ? 
                <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                <ChevronDown className="w-4 h-4 text-gray-500" />
              }
            </button>
            
            {expandedSections.tags && (
              <div className="px-4 pb-4 max-h-48 overflow-y-auto">
                {filters.tags.map(tag => (
                  <label key={tag} className="flex items-center py-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={activeFilters.tags?.includes(tag) || false}
                      onChange={(e) => {
                        const newTags = e.target.checked 
                          ? [...(activeFilters.tags || []), tag]
                          : (activeFilters.tags || []).filter(t => t !== tag);
                        onFilterChange('tags', newTags);
                      }}
                      className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{tag}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="border-b">
            <button
              onClick={() => toggleSection('dateRange')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">Date Range</span>
              {expandedSections.dateRange ? 
                <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                <ChevronDown className="w-4 h-4 text-gray-500" />
              }
            </button>
            
            {expandedSections.dateRange && (
              <div className="px-4 pb-4">
                {filters.dateRange.map(range => (
                  <label key={range} className="flex items-center py-2 cursor-pointer">
                    <input 
                      type="radio"
                      name="dateRange"
                      checked={activeFilters.dateRange === range}
                      onChange={() => onFilterChange('dateRange', range)}
                      className="mr-3 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{range}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
          <div className="flex gap-2">
            <button 
              onClick={() => onFilterChange('clear', null)}
              className="flex-1 py-2 px-4 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Clear All
            </button>
            <button 
              onClick={onClose}
              className="flex-1 py-2 px-4 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileFilterPanel;