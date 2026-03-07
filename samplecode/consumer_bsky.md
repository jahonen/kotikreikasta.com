Bluesky Consumer Specification
1. Overview
This consumer fetches content from the publication queue, formats it for the Bluesky platform, and publishes it using the Bluesky API. It adheres to Bluesky’s post requirements, includes the referral-coded short URL, and handles errors gracefully.

2. Prerequisites

Google Cloud Pub/Sub Subscription: Configured to receive messages from the publication_queue.
Google Secret Manager: Stores the following secrets:

BSKY_APP_PASSWORD
BSKY_IDENTIFIER

Vertex AI: Used for generating engaging Finnish captions if needed.

3. Consumer Logic
3.1 Message Consumption

Input: Message from publication_queue with the following payload:
json
Copy

{
  "id": "string",
  "contentType": "Listing|Blog Post",
  "contentId": "string",
  "shortUrl": "string",
  "referralCodes": ["bluesky"],
  "status": "pending|published|failed",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "scheduledFor": "timestamp",
  "content": {
    "title": "string",
    "summary": "string",
    "seoTitle": "string",
    "seoMetaDescription": "string",
    "media": ["string"],
    "price": "number",
    "location": "string",
    "propertyType": "string"
  }
}



3.2 Post Formatting


Language: Finnish.


Character Limit: 300 characters (including URL and hashtags).


Content Structure:

Listing:
Copy

[Engaging Finnish caption, e.g., "Unelma loma-asunnosta Kreikassa! 🌊"]
[Key details: price, location, property type]
[Short URL with referral code, e.g., "https://kotikreikasta.com/c/beachfront-villa-athens?ref=bluesky"]
[Hashtags, e.g., "#LomaAsunto #Kreikka #UnelmaKoti"]


Blog Post:
Copy

[Engaging Finnish caption, e.g., "Vinkkejä Kreikan kiinteistömarkkinoille! 🏝️"]
[Short URL with referral code]
[Hashtags, e.g., "#Kreikka #Kiinteistöt #Matkailu"]




Example:
Copy

Unelma loma-asunnosta Kreikassa! 🌊 Hinta: 250 000 €, Ateena, rannalla.
🏡 https://kotikreikasta.com/c/beachfront-villa-athens?ref=bluesky #LomaAsunto #Kreikka #UnelmaKoti



3.3 API Integration

Authentication: Basic Auth using BSKY_IDENTIFIER and BSKY_APP_PASSWORD.
Endpoint: https://bsky.social/xrpc/com.atproto.repo.createRecord
Request Body:
json
Copy

{
  "repo": "[BSKY_IDENTIFIER]",
  "collection": "app.bsky.feed.post",
  "record": {
    "text": "[Formatted post text]",
    "createdAt": "[ISO 8601 timestamp]"
  }
}



3.4 Error Handling

Retry Logic: Retry on transient errors (e.g., network issues) with exponential backoff.
Max Retries: 3 attempts before marking the message as failed.

4. Implementation Steps
4.1 Fetch Secrets
python
Copy

from google.cloud import secretmanager

def fetch_secret(secret_id):
    client = secretmanager.SecretManagerServiceClient()
    secret_name = f"projects/[PROJECT_ID]/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(request={"name": secret_name})
    return response.payload.data.decode("UTF-8")

BSKY_APP_PASSWORD = fetch_secret("BSKY_APP_PASSWORD")
BSKY_IDENTIFIER = fetch_secret("BSKY_IDENTIFIER")


4.2 Consume Message
python
Copy

from google.cloud import pubsub_v1
import json

def consume_message():
    subscriber = pubsub_v1.SubscriberClient()
    subscription_path = subscriber.subscription_path("[PROJECT_ID]", "[SUBSCRIPTION_ID]")

    def callback(message):
        payload = json.loads(message.data)
        post_text = format_post(payload)
        publish_to_bluesky(post_text, payload["id"])
        message.ack()

    subscriber.subscribe(subscription_path, callback=callback)
    while True:
        pass


4.3 Format Post
python
Copy

from datetime import datetime

def format_post(payload):
    content = payload["content"]
    referral_url = f"{payload['shortUrl']}?ref=bluesky"

    if payload["contentType"] == "Listing":
        caption = f"Unelma loma-asunnosta Kreikassa! 🌊 Hinta: {content['price']} €, {content['location']}, {content['propertyType']}."
        post_text = f"{caption} 🏡 {referral_url} #LomaAsunto #Kreikka #UnelmaKoti"
    else:
        caption = f"Vinkkejä Kreikan kiinteistömarkkinoille! 🏝️"
        post_text = f"{caption} 📖 {referral_url} #Kreikka #Kiinteistöt #Matkailu"

    return post_text[:297] + "..." if len(post_text) > 300 else post_text


4.4 Publish to Bluesky
python
Copy

import requests
import time
from datetime import datetime

def publish_to_bluesky(post_text, message_id):
    auth = (BSKY_IDENTIFIER, BSKY_APP_PASSWORD)
    headers = {"Content-Type": "application/json"}
    data = {
        "repo": BSKY_IDENTIFIER,
        "collection": "app.bsky.feed.post",
        "record": {
            "text": post_text,
            "createdAt": datetime.now().isoformat()
        }
    }

    for attempt in range(3):
        try:
            response = requests.post(
                "https://bsky.social/xrpc/com.atproto.repo.createRecord",
                auth=auth,
                headers=headers,
                json=data
            )
            if response.status_code == 200:
                print(f"Published: {post_text}")
                return
            else:
                print(f"Attempt {attempt + 1} failed: {response.text}")
                time.sleep(2 ** attempt)  # Exponential backoff
        except Exception as e:
            print(f"Error publishing: {e}")
            time.sleep(2 ** attempt)
    else:
        print(f"Max retries reached for message {message_id}.")


5. Deployment

Environment: Google Cloud Run or Cloud Functions.
Trigger: Pub/Sub push or pull.
