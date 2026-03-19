#!/bin/bash

# Test script for Bluesky Pub/Sub publishing flow
# This script enqueues a test blog post for Bluesky publishing

echo "Testing Bluesky Pub/Sub Publishing Flow"
echo "========================================"
echo ""

# Get auth token
echo "Getting auth token..."
TOKEN=$(gcloud auth print-identity-token)

# Prepare test payload
PAYLOAD='{
  "platforms": ["bluesky"],
  "contentType": "blog",
  "contentId": "test-blog-kreikan-kiinteistokauppa",
  "contentCollection": "content",
  "title": "Kreikan kiinteistökaupan vaiheet",
  "description": "Kattava opas kreikkalaiseen kiinteistökauppaan. Käymme läpi kaikki vaiheet AFM-tunnuksesta notaariin, ja kerromme mitä jokainen vaihe maksaa ja kauanko siihen menee aikaa.",
  "url": "https://kotikreikasta.com/blog/kreikan-kiinteistokauppa",
  "metadata": {
    "category": "opas",
    "readTime": 8
  }
}'

echo "Enqueueing content for Bluesky publishing..."
echo ""

# Call enqueue endpoint
RESPONSE=$(curl -s -X POST \
  https://europe-west1-kotikreikasta.cloudfunctions.net/enqueueSocialPublish \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "Response:"
echo "$RESPONSE" | jq .
echo ""

# Check if successful
if echo "$RESPONSE" | jq -e '.ok' > /dev/null; then
  MESSAGE_ID=$(echo "$RESPONSE" | jq -r '.messageIds.bluesky')
  echo "✅ Message enqueued successfully!"
  echo "Message ID: $MESSAGE_ID"
  echo ""
  echo "The blueskyPublisher function will process this message automatically."
  echo "Check logs with:"
  echo "  gcloud logging read 'resource.type=cloud_function AND resource.labels.function_name=blueskyPublisher' --limit=10 --project=kotikreikasta"
else
  echo "❌ Failed to enqueue message"
  echo "$RESPONSE" | jq .
  exit 1
fi
