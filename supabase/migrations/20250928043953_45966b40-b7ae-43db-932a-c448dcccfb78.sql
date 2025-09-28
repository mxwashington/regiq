-- Fix agency classification for Federal Register alerts
UPDATE alerts 
SET agency = CASE
  -- EPA patterns
  WHEN title ILIKE '%environmental protection agency%' 
    OR title ILIKE '%EPA%' 
    OR title ILIKE '%environmental%emission%'
    OR title ILIKE '%air quality%'
    OR title ILIKE '%water quality%'
    OR title ILIKE '%pesticide%'
    OR title ILIKE '%toxic%substance%'
    OR title ILIKE '%superfund%'
    OR title ILIKE '%clean air act%'
    OR title ILIKE '%clean water act%'
    THEN 'EPA'

  -- FDA patterns  
  WHEN title ILIKE '%food and drug administration%'
    OR title ILIKE '%FDA%'
    OR title ILIKE '%medical device%'
    OR title ILIKE '%pharmaceutical%'
    OR title ILIKE '%food safety%modernization%'
    OR title ILIKE '%drug approval%'
    OR title ILIKE '%clinical trial%'
    OR title ILIKE '%tobacco%'
    OR title ILIKE '%dietary supplement%'
    THEN 'FDA'

  -- FSIS patterns
  WHEN title ILIKE '%food safety and inspection service%'
    OR title ILIKE '%food safety inspection service%' 
    OR title ILIKE '%FSIS%'
    OR title ILIKE '%meat%inspection%'
    OR title ILIKE '%poultry%inspection%'
    OR title ILIKE '%egg%inspection%'
    OR title ILIKE '%slaughter%'
    OR title ILIKE '%hazard analysis%critical control%'
    OR title ILIKE '%pathogen reduction%'
    THEN 'FSIS'

  -- USDA patterns
  WHEN title ILIKE '%department of agriculture%'
    OR title ILIKE '%USDA%'
    OR title ILIKE '%agricultural marketing service%'
    OR title ILIKE '%animal and plant health inspection service%'
    OR title ILIKE '%APHIS%'
    OR title ILIKE '%forest service%'
    OR title ILIKE '%rural development%'
    OR title ILIKE '%farm service agency%'
    OR title ILIKE '%commodity credit corporation%'
    THEN 'USDA'

  -- DOE
  WHEN title ILIKE '%department of energy%'
    OR title ILIKE '%DOE%'
    OR title ILIKE '%nuclear%'
    OR title ILIKE '%energy efficiency%'
    THEN 'DOE'

  -- DHS
  WHEN title ILIKE '%department of homeland security%'
    OR title ILIKE '%DHS%'
    OR title ILIKE '%transportation security%'
    OR title ILIKE '%customs%border%'
    OR title ILIKE '%immigration%'
    THEN 'DHS'

  -- DOT
  WHEN title ILIKE '%department of transportation%'
    OR title ILIKE '%DOT%'
    OR title ILIKE '%federal aviation%'
    OR title ILIKE '%FAA%'
    OR title ILIKE '%highway%safety%'
    OR title ILIKE '%railroad%'
    THEN 'DOT'

  ELSE 'Federal'
END
WHERE source IN ('Federal Register', 'Enhanced Federal Register Rules')
  AND (agency IS NULL OR agency = 'Federal');