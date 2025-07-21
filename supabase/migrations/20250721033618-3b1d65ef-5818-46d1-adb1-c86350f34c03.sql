-- Fix existing alerts that are incorrectly tagged as CDC when they should be FDA
UPDATE public.alerts 
SET 
  source = 'FDA',
  agency = 'FDA'
WHERE 
  (source = 'CDC' OR agency = 'CDC')
  AND (
    title ILIKE '%fda%' OR 
    title ILIKE '%food and drug administration%' OR
    full_content ILIKE '%fda%' OR
    (
      (title ILIKE '%recall%' OR full_content ILIKE '%recall%') 
      AND (
        title ILIKE '%food%' OR title ILIKE '%drug%' OR title ILIKE '%device%' OR 
        title ILIKE '%allergy%' OR title ILIKE '%undeclared%' OR
        full_content ILIKE '%food%' OR full_content ILIKE '%drug%' OR 
        full_content ILIKE '%device%' OR full_content ILIKE '%allergy%' OR 
        full_content ILIKE '%undeclared%'
      )
    )
  );

-- Fix existing alerts that are incorrectly tagged as CDC when they should be USDA
UPDATE public.alerts 
SET 
  source = 'USDA',
  agency = 'USDA'
WHERE 
  (source = 'CDC' OR agency = 'CDC')
  AND (
    title ILIKE '%usda%' OR title ILIKE '%fsis%' OR
    title ILIKE '%meat%' OR title ILIKE '%poultry%' OR
    full_content ILIKE '%usda%' OR full_content ILIKE '%fsis%' OR
    (
      (title ILIKE '%recall%' OR full_content ILIKE '%recall%') 
      AND (
        title ILIKE '%beef%' OR title ILIKE '%chicken%' OR title ILIKE '%pork%' OR 
        title ILIKE '%ground%' OR title ILIKE '%meat%' OR title ILIKE '%poultry%' OR
        full_content ILIKE '%beef%' OR full_content ILIKE '%chicken%' OR 
        full_content ILIKE '%pork%' OR full_content ILIKE '%ground%' OR
        full_content ILIKE '%meat%' OR full_content ILIKE '%poultry%'
      )
    )
  );