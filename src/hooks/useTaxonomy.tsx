import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TaxonomyTag {
  id: string;
  name: string;
  slug: string;
  color: string;
  category: string;
}

interface TaxonomyCategory {
  id: string;
  name: string;
  tags: TaxonomyTag[];
}

interface TaxonomyData {
  categories: TaxonomyCategory[];
  loading: boolean;
  error: string | null;
}

export const useTaxonomy = (): TaxonomyData => {
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTaxonomy = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch categories with their tags
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('taxonomy_categories')
          .select(`
            id,
            name,
            taxonomy_tags (
              id,
              name,
              slug,
              color,
              sort_order
            )
          `)
          .order('name');

        if (categoriesError) {
          throw categoriesError;
        }

        // Transform data to match our interface
        const transformedCategories = categoriesData?.map(category => ({
          id: category.id,
          name: category.name,
          tags: (category.taxonomy_tags || [])
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map(tag => ({
              id: tag.id,
              name: tag.name,
              slug: tag.slug,
              color: tag.color,
              category: category.name
            }))
        })) || [];

        setCategories(transformedCategories);
      } catch (err: any) {
        console.error('Error fetching taxonomy:', err);
        setError(err.message || 'Failed to load taxonomy data');
        toast({
          title: 'Error',
          description: 'Failed to load tag categories',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTaxonomy();
  }, [toast]);

  return { categories, loading, error };
};