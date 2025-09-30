-- Add circuit breaker table for sync reliability
-- Step-by-step approach: Testing small migration first

CREATE TABLE IF NOT EXISTS circuit_breaker_state (
  source_name text PRIMARY KEY,
  status text NOT NULL DEFAULT 'closed' CHECK (status IN ('closed', 'open', 'half-open')),
  failure_count integer DEFAULT 0,
  last_failure timestamptz,
  last_success timestamptz,
  opened_at timestamptz,
  next_attempt_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_status
ON circuit_breaker_state(status, next_attempt_at);

-- Grant permissions
GRANT ALL ON circuit_breaker_state TO service_role;

-- Add comment for documentation
COMMENT ON TABLE circuit_breaker_state IS 'Circuit breaker pattern for preventing cascading failures in data source fetching';

-- Test data (will be populated by sync functions)
INSERT INTO circuit_breaker_state (source_name, status)
VALUES ('test_source', 'closed')
ON CONFLICT (source_name) DO NOTHING;