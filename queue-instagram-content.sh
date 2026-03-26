#!/bin/bash

# Script to queue all existing published content for Instagram
# This calls the deployed Cloud Function with authentication

set -e

FUNCTION_URL="https://europe-west1-kotikreikasta.cloudfunctions.net/queueInstagramExistingContent"
PROJECT="kotikreikasta"

echo "🔄 Instagram Content Queue Migration"
echo "====================================="
echo ""

# Check if dry run or actual execution
DRY_RUN="${1:-true}"

if [ "$DRY_RUN" = "false" ]; then
    echo "⚠️  WARNING: This will ACTUALLY queue all published content for Instagram!"
    echo ""
    read -p "Are you sure you want to proceed? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
    echo "✅ Proceeding with actual migration..."
else
    echo "ℹ️  Running in DRY RUN mode (no changes will be made)"
    echo "   To actually queue content, run: ./queue-instagram-content.sh false"
fi

echo ""
echo "📡 Calling Cloud Function..."
echo ""

# Get authentication token
TOKEN=$(gcloud auth print-identity-token)

# Call the function with authentication
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer ${TOKEN}" \
    "${FUNCTION_URL}?dryRun=${DRY_RUN}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "$BODY" | python3 -m json.tool
    echo ""
    
    # Extract summary
    TOTAL_QUEUED=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['summary']['totalQueued'])" 2>/dev/null || echo "0")
    TOTAL_ALREADY_PUBLISHED=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['summary']['totalAlreadyPublished'])" 2>/dev/null || echo "0")
    TOTAL_ALREADY_QUEUED=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['summary']['totalAlreadyQueued'])" 2>/dev/null || echo "0")
    TOTAL_SKIPPED=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['summary']['totalSkipped'])" 2>/dev/null || echo "0")
    
    echo "Summary:"
    echo "--------"
    if [ "$DRY_RUN" = "false" ]; then
        echo "✅ Queued for Instagram: $TOTAL_QUEUED"
    else
        echo "📋 Would queue for Instagram: $TOTAL_QUEUED"
    fi
    echo "✓  Already published: $TOTAL_ALREADY_PUBLISHED"
    echo "✓  Already queued: $TOTAL_ALREADY_QUEUED"
    echo "⏭️  Skipped (no image): $TOTAL_SKIPPED"
    echo ""
    
    if [ "$DRY_RUN" = "true" ]; then
        echo "ℹ️  This was a dry run. To actually queue content, run:"
        echo "   ./queue-instagram-content.sh false"
    else
        echo "🎉 Content has been queued for Instagram!"
        echo ""
        echo "Next steps:"
        echo "1. The social media scheduler runs every 83 minutes"
        echo "2. It will pick up queued content based on the Instagram schedule"
        echo "3. Monitor logs: gcloud functions logs read instagramPublisher --region=europe-west1 --limit=50"
    fi
else
    echo "❌ Migration failed (HTTP $HTTP_CODE)"
    echo ""
    echo "$BODY"
    exit 1
fi
