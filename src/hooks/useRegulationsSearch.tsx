import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { regulationsService } from '@/lib/regulations/regulationsService';
import {
  RegulationsGovDocument,
  ProcessedRegulationDocument,
  RegulationsGovSearchFilters,
  INDUSTRY_PRESETS
} from '@/lib/regulations/types';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
interface UseRegulationsSearchProps {
  industryFocus?: keyof typeof INDUSTRY_PRESETS;
  initialFilters?: RegulationsGovSearchFilters;
}

export const useRegulationsSearch = ({ 
  industryFocus, 
  initialFilters = {} 
}: UseRegulationsSearchProps = {}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<RegulationsGovSearchFilters>(initialFilters);
  const [pagination, setPagination] = useState({ page: 1, size: 25 });

  // Query for processed documents
  const {
    data: processedDocuments,
    isLoading: isSearching,
    error: searchError,
    refetch: refetchSearch
  } = useQuery({
    queryKey: ['processed-documents', industryFocus, searchTerm, filters, pagination],
    queryFn: () => regulationsService.getProcessedDocuments(
      industryFocus,
      searchTerm || undefined,
      pagination
    ),
    enabled: !!(searchTerm || industryFocus || Object.keys(filters).length > 0),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for regulatory intelligence
  const {
    data: intelligence,
    isLoading: isLoadingIntelligence,
    error: intelligenceError
  } = useQuery({
    queryKey: ['regulatory-intelligence', industryFocus],
    queryFn: () => industryFocus 
      ? regulationsService.getRegulatoryIntelligence(industryFocus, { days: 30 })
      : Promise.resolve(null),
    enabled: !!industryFocus,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for recent documents
  const {
    data: recentDocuments,
    isLoading: isLoadingRecent
  } = useQuery({
    queryKey: ['recent-documents', industryFocus],
    queryFn: () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const agencies = industryFocus ? INDUSTRY_PRESETS[industryFocus].agencies : undefined;
      
      return regulationsService.getRecentDocuments(
        { startDate },
        agencies,
        { size: 20 }
      );
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Query for open comment periods
  const {
    data: openComments,
    isLoading: isLoadingComments
  } = useQuery({
    queryKey: ['open-comments', industryFocus],
    queryFn: () => {
      const agencies = industryFocus ? INDUSTRY_PRESETS[industryFocus].agencies : undefined;
      return regulationsService.getOpenCommentPeriods(agencies, { size: 20 });
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Mutation for syncing recent documents
  const syncMutation = useMutation({
    mutationFn: () => regulationsService.syncRecentDocuments(),
    onSuccess: (data) => {
      toast({
        title: "Sync Complete",
        description: data.message,
      });
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['processed-documents'] });
      queryClient.invalidateQueries({ queryKey: ['regulatory-intelligence'] });
      queryClient.invalidateQueries({ queryKey: ['recent-documents'] });
    },
    onError: (error) => {
      logger.error('Sync failed:', error);
      toast({
        title: "Sync Error",
        description: "Failed to sync regulatory data. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Search documents with current filters
  const searchDocuments = useCallback(async (
    term: string,
    customFilters?: RegulationsGovSearchFilters
  ) => {
    setSearchTerm(term);
    if (customFilters) {
      setFilters(customFilters);
    }
    setPagination({ page: 1, size: 25 }); // Reset pagination
    
    // The query will automatically refetch due to dependency changes
  }, []);

  // Get document details
  const getDocumentDetails = useCallback(async (documentId: string) => {
    try {
      return await regulationsService.getDocumentDetails(documentId);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load document details.",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  // Get comments for a document
  const getDocumentComments = useCallback(async (docketId: string) => {
    try {
      return await regulationsService.searchComments(docketId, { size: 50 });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load document comments.",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<RegulationsGovSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination({ page: 1, size: pagination.size }); // Reset to first page
  }, [pagination.size]);

  // Update pagination
  const updatePagination = useCallback((newPagination: Partial<typeof pagination>) => {
    setPagination(prev => ({ ...prev, ...newPagination }));
  }, []);

  // Clear search and filters
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setFilters(initialFilters);
    setPagination({ page: 1, size: 25 });
  }, [initialFilters]);

  // Sync recent documents
  const syncRecentDocuments = useCallback(() => {
    syncMutation.mutate();
  }, [syncMutation]);

  // Clear cache
  const clearCache = useCallback(() => {
    regulationsService.clearCache();
    queryClient.invalidateQueries({ queryKey: ['processed-documents'] });
    queryClient.invalidateQueries({ queryKey: ['regulatory-intelligence'] });
    queryClient.invalidateQueries({ queryKey: ['recent-documents'] });
    queryClient.invalidateQueries({ queryKey: ['open-comments'] });
    
    toast({
      title: "Cache Cleared",
      description: "Regulations cache has been cleared. Fresh data will be loaded.",
    });
  }, [queryClient, toast]);

  return {
    // Data
    processedDocuments: processedDocuments || [],
    intelligence,
    recentDocuments: recentDocuments?.data || [],
    openComments: openComments?.data || [],
    
    // State
    searchTerm,
    filters,
    pagination,
    
    // Loading states
    isSearching,
    isLoadingIntelligence,
    isLoadingRecent,
    isLoadingComments,
    isSyncing: syncMutation.isPending,
    
    // Error states
    searchError,
    intelligenceError,
    syncError: syncMutation.error,
    
    // Actions
    searchDocuments,
    updateFilters,
    updatePagination,
    clearSearch,
    getDocumentDetails,
    getDocumentComments,
    syncRecentDocuments,
    clearCache,
    
    // Utilities
    hasSearched: !!(searchTerm || Object.keys(filters).length > 0),
    totalResults: processedDocuments?.length || 0,
    canLoadMore: true, // Could be enhanced based on API response
  };
};