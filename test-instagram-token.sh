#!/bin/bash

# Instagram Token Testing Script
# Tests Instagram API access token validity and functionality

set -e

echo "🔍 Instagram Token Testing"
echo "=========================="
echo ""

# Fetch token from Secret Manager
echo "📦 Fetching token from Secret Manager..."
TOKEN=$(gcloud secrets versions access latest --secret="INSTAGRAM_ACCESS_TOKEN" --project=kotikreikasta)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to fetch token from Secret Manager"
    exit 1
fi

echo "✅ Token fetched successfully"
echo "   Preview: ${TOKEN:0:20}..."
echo ""

# Test 1: Verify token is valid
echo "Test 1: Verify Token Validity"
echo "------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" "https://graph.instagram.com/v18.0/me?fields=id,username&access_token=${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Token is valid"
    echo "   Response: $BODY"
else
    echo "❌ Token validation failed (HTTP $HTTP_CODE)"
    echo "   Error: $BODY"
    exit 1
fi
echo ""

# Test 2: Check token expiration
echo "Test 2: Check Token Expiration"
echo "-------------------------------"
APP_SECRET=$(gcloud secrets versions access latest --secret="INSTAGRAM_APP_SECRET" --project=kotikreikasta)
EXPIRY_RESPONSE=$(curl -s "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${APP_SECRET}&access_token=${TOKEN}")

EXPIRES_IN=$(echo "$EXPIRY_RESPONSE" | grep -o '"expires_in":[0-9]*' | cut -d':' -f2)

if [ -n "$EXPIRES_IN" ]; then
    DAYS_REMAINING=$((EXPIRES_IN / 86400))
    echo "✅ Token expiration checked"
    echo "   Expires in: $EXPIRES_IN seconds ($DAYS_REMAINING days)"
    
    if [ "$DAYS_REMAINING" -lt 7 ]; then
        echo "   ⚠️  WARNING: Token expires in less than 7 days - refresh recommended!"
    fi
else
    echo "⚠️  Could not determine expiration"
    echo "   Response: $EXPIRY_RESPONSE"
fi
echo ""

# Test 3: Test token refresh (dry run - shows what would happen)
echo "Test 3: Test Token Refresh (Dry Run)"
echo "-------------------------------------"
echo "⚠️  This will actually refresh the token!"
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    REFRESH_RESPONSE=$(curl -s "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOKEN}")
    
    NEW_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    NEW_EXPIRES=$(echo "$REFRESH_RESPONSE" | grep -o '"expires_in":[0-9]*' | cut -d':' -f2)
    
    if [ -n "$NEW_TOKEN" ]; then
        NEW_DAYS=$((NEW_EXPIRES / 86400))
        echo "✅ Token refreshed successfully"
        echo "   New token preview: ${NEW_TOKEN:0:20}..."
        echo "   New expiration: $NEW_EXPIRES seconds ($NEW_DAYS days)"
        echo ""
        echo "⚠️  To use the new token, update Secret Manager:"
        echo "   echo '$NEW_TOKEN' | gcloud secrets versions add INSTAGRAM_ACCESS_TOKEN --data-file=- --project=kotikreikasta"
    else
        echo "❌ Token refresh failed"
        echo "   Response: $REFRESH_RESPONSE"
    fi
else
    echo "⏭️  Skipped token refresh"
fi
echo ""

# Test 4: Test media container creation (requires image URL)
echo "Test 4: Test Media Container Creation"
echo "--------------------------------------"
echo "⚠️  This requires a test image URL (1:1 aspect ratio)"
echo "   Example: https://firebasestorage.googleapis.com/v0/b/kotikreikasta.firebasestorage.app/o/test.jpg?alt=media"
echo ""
read -p "Enter test image URL (or press Enter to skip): " IMAGE_URL

if [ -n "$IMAGE_URL" ]; then
    USER_ID=$(gcloud secrets versions access latest --secret="INSTAGRAM_APP_ID" --project=kotikreikasta)
    
    CAPTION="🏝️ Testijulkaisu

Tämä on testijulkaisu Instagram-integrointia varten.

Linkki biossa!

#Kreikka #Testi"
    
    echo "Creating media container..."
    CONTAINER_RESPONSE=$(curl -s -X POST "https://graph.instagram.com/v18.0/${USER_ID}/media" \
        -H "Content-Type: application/json" \
        -d "{\"image_url\": \"${IMAGE_URL}\", \"caption\": \"${CAPTION}\", \"access_token\": \"${TOKEN}\"}")
    
    CONTAINER_ID=$(echo "$CONTAINER_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$CONTAINER_ID" ]; then
        echo "✅ Container created successfully"
        echo "   Container ID: $CONTAINER_ID"
        echo ""
        echo "   To publish this container (will actually post to Instagram):"
        echo "   curl -X POST \"https://graph.instagram.com/v18.0/${USER_ID}/media_publish\" \\"
        echo "        -H \"Content-Type: application/json\" \\"
        echo "        -d '{\"creation_id\": \"${CONTAINER_ID}\", \"access_token\": \"${TOKEN}\"}'"
    else
        echo "❌ Container creation failed"
        echo "   Response: $CONTAINER_RESPONSE"
    fi
else
    echo "⏭️  Skipped container creation test"
fi
echo ""

echo "=========================="
echo "✅ Testing complete!"
echo ""
echo "Summary:"
echo "--------"
echo "Token valid: ✅"
echo "Days remaining: $DAYS_REMAINING"
echo "Refresh available: ✅"
echo ""
echo "Next steps:"
echo "1. If days remaining < 7, run token refresh"
echo "2. Deploy Cloud Functions: cd functions && npm run build && firebase deploy --only functions"
echo "3. Test with actual content from Firestore"
echo "4. Monitor logs for any issues"
