#!/bin/bash

# RegIQ Regulatory Data Sources Test Suite
# Tests all 16 data sources for connectivity and data extraction

echo "================================================"
echo "RegIQ Regulatory Data Sources Test Suite"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Supabase local URL
SUPABASE_URL="http://127.0.0.1:54321"
FUNCTIONS_URL="${SUPABASE_URL}/functions/v1"

# Get anon key from .env or use default
if [ -f .env ]; then
  export $(cat .env | grep SUPABASE_ANON_KEY | xargs)
fi

ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}"

test_count=0
pass_count=0
fail_count=0

# Function to test an endpoint
test_endpoint() {
  local name=$1
  local endpoint=$2
  local action=$3
  local timeout=${4:-30}

  test_count=$((test_count + 1))
  echo -e "${YELLOW}Testing ${test_count}:${NC} ${name}"
  echo "  Endpoint: ${endpoint}"

  if [ -n "$action" ]; then
    response=$(curl -s -w "\n%{http_code}" --max-time ${timeout} -X POST \
      "${FUNCTIONS_URL}/${endpoint}" \
      -H "Authorization: Bearer ${ANON_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"action\":\"${action}\"}" 2>&1)
  else
    response=$(curl -s -w "\n%{http_code}" --max-time ${timeout} -X POST \
      "${FUNCTIONS_URL}/${endpoint}" \
      -H "Authorization: Bearer ${ANON_KEY}" \
      -H "Content-Type: application/json" \
      -d '{}' 2>&1)
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    # Check if response contains success indicators
    if echo "$body" | grep -q '"success":true\|"processed"\|"message"'; then
      echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code)"
      echo "  Response: $(echo $body | head -c 200)..."
      pass_count=$((pass_count + 1))
    else
      echo -e "  ${RED}✗ FAIL${NC} (HTTP $http_code - unexpected response)"
      echo "  Response: $body"
      fail_count=$((fail_count + 1))
    fi
  else
    echo -e "  ${RED}✗ FAIL${NC} (HTTP $http_code)"
    echo "  Response: $(echo $body | head -c 200)..."
    fail_count=$((fail_count + 1))
  fi
  echo ""
}

# Test RSS Alert Scraper (CDC, FTC, OSHA)
echo "================================================"
echo "PART 1: RSS FEEDS"
echo "================================================"
echo ""

test_endpoint "CDC/FTC/OSHA RSS Feeds" "rss-alert-scraper" "" 45

# Test FSIS RSS Feeds
test_endpoint "FSIS RSS Feeds" "fsis-rss-feeds" "" 45

# Test TTB RSS
test_endpoint "TTB RSS Feed" "ttb-rss-scraper" "scrape_ttb_feed" 45

echo "================================================"
echo "PART 2: GOVERNMENT APIs"
echo "================================================"
echo ""

# Test FDA APIs
test_endpoint "FDA OpenFDA APIs" "enhanced-regulatory-apis" "fetch_fda_apis" 60

# Test FSIS API
test_endpoint "FSIS Recalls API" "enhanced-regulatory-apis" "fetch_fsis_recalls" 60

# Test EPA
test_endpoint "EPA ECHO API" "enhanced-regulatory-apis" "fetch_epa_enforcement" 60

# Test Federal Register
test_endpoint "Federal Register API" "enhanced-regulatory-apis" "fetch_federal_register" 60

# Test Canada Health
test_endpoint "Canada Health API" "enhanced-regulatory-apis" "fetch_canada_recalls" 45

# Test Regulations.gov
test_endpoint "Regulations.gov API" "regulations-gov-api" "sync_recent" 60

# Test USDA AMS
test_endpoint "USDA AMS Organic API" "usda-ams-api" "sync_organic_suspensions" 45

echo "================================================"
echo "PART 3: WEB SCRAPERS"
echo "================================================"
echo ""

# Test FDA Warning Letters
test_endpoint "FDA Warning Letters" "fda-warning-letters" "test_scraper" 45

# Test FDA Import Alerts
test_endpoint "FDA Import Alerts" "fda-import-alerts" "test_scraper" 45

# Test NOAA Fisheries
test_endpoint "NOAA Fisheries" "noaa-fisheries-scraper" "test_scraper" 45

# Test CBP Customs
test_endpoint "CBP Customs" "cbp-customs-scraper" "test_scraper" 45

# Test USDA APHIS
test_endpoint "USDA APHIS" "usda-aphis-scraper" "test_scraper" 45

echo "================================================"
echo "TEST SUMMARY"
echo "================================================"
echo ""
echo "Total Tests: $test_count"
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
  exit 1
fi