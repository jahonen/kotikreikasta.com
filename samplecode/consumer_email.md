Email Newsletter Consumer Specification
1. Overview
This consumer fetches content from the publication queue, formats branded and engaging emails, and sends them via SendGrid. Blog posts are sent immediately, while listing updates are aggregated and sent weekly at an optimal time.

2. Prerequisites

Google Cloud Pub/Sub Subscription: Configured to receive messages from the publication_queue.
Google Secret Manager: Stores the following secret:

SENDGRID_API_KEY

SendGrid: Configured with a verified sender (noreply@kotikreikasta.com) and GDPR-compliant unsubscribe groups.

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
  "referralCodes": ["email"],
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
    "propertyType": "string",
    "featuredImage": "string"
  }
}



3.2 Email Formatting

Language: Finnish.
Branding: Consistent with "Kotikreikasta.com" (logo, colors, fonts).
Visuals: High-quality images, clear CTAs, and mobile-responsive design.
GDPR Compliance: Unsubscribe links and preference controls in every email.
A. Blog Post Email

Subject: Engaging and personalized, e.g., "Uudet vinkit Kreikan kiinteistömarkkinoille – [Title]"
Content:

Featured image
Engaging introduction
Summary and "Read More" CTA linking to the blog post with ref=email
Footer with unsubscribe link and contact information

B. Weekly Listing Digest

Subject: "Viikon parhaat loma-asunnot Kreikasta – [Date]"
Content:

Curated selection of listings (3-5)
Highlight key details (price, location, property type)
Images and "View Listing" CTAs linking to each listing with ref=email
Footer with unsubscribe link and contact information


3.3 Scheduling

Blog Posts: Sent immediately upon publication.
Listing Updates: Aggregated and sent every Sunday at 10:00 AM (EET) to maximize open rates for the target demographic.

3.4 API Integration

Authentication: Bearer Token using SENDGRID_API_KEY.
Endpoint: https://api.sendgrid.com/v3/mail/send
Request Body:
json
Copy

{
  "personalizations": [
    {
      "to": [{"email": "[Subscriber Email]"}],
      "dynamic_template_data": {
        "subject": "[Subject]",
        "content": "[Formatted Email Content]",
        "unsubscribe_url": "[Unsubscribe Link]"
      }
    }
  ],
  "from": {"email": "noreply@kotikreikasta.com", "name": "Kotikreikasta.com"},
  "template_id": "[SendGrid Template ID]",
  "asm": {"group_id": [GDPR Unsubscribe Group ID]}
}



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

SENDGRID_API_KEY = fetch_secret("SENDGRID_API_KEY")


4.2 Consume Message
python
Copy

from google.cloud import pubsub_v1
import json
from datetime import datetime, timezone

def consume_message():
    subscriber = pubsub_v1.SubscriberClient()
    subscription_path = subscriber.subscription_path("[PROJECT_ID]", "[SUBSCRIPTION_ID]")

    # In-memory storage for weekly listings
    weekly_listings = []

    def callback(message):
        payload = json.loads(message.data)
        if payload["contentType"] == "Blog Post":
            send_blog_email(payload)
        else:
            weekly_listings.append(payload)
            if datetime.now(timezone.utc).weekday() == 6 and datetime.now(timezone.utc).hour == 8:  # Sunday 10:00 AM EET (UTC+2)
                send_weekly_digest(weekly_listings)
                weekly_listings.clear()
        message.ack()

    subscriber.subscribe(subscription_path, callback=callback)
    while True:
        pass


4.3 Format Email Content
python
Copy

def format_blog_email(payload):
    content = payload["content"]
    referral_url = f"{payload['shortUrl']}?ref=email"
    return {
        "subject": f"Uudet vinkit Kreikan kiinteistömarkkinoille – {content['title']}",
        "content": f"""
            <h1>{content['title']}</h1>
            <img src="{content['featuredImage']}" alt="{content['seoTitle']}" style="width:100%;max-width:600px;">
            <p>{content['summary']}</p>
            <a href="{referral_url}" style="background:#007BFF;color:white;padding:10px 20px;text-decoration:none;">Lue lisää</a>
            <p><a href="[Unsubscribe Link]">Peru utiskirjeen tilaus</a></p>
        """
    }

def format_weekly_digest(listings):
    content = "<h1>Viikon parhaat loma-asunnot Kreikasta</h1>"
    for listing in listings:
        content += f"""
            <h2>{listing['content']['title']}</h2>
            <img src="{listing['content']['media'][0]}" alt="{listing['content']['title']}" style="width:100%;max-width:600px;">
            <p>{listing['content']['location']} – {listing['content']['price']} €</p>
            <a href="{listing['shortUrl']}?ref=email" style="background:#28A745;color:white;padding:10px 20px;text-decoration:none;">Katso kohde</a>
        """
    content += "<p><a href='[Unsubscribe Link]'>Peru utiskirjeen tilaus</a></p>"
    return {"subject": f"Viikon parhaat loma-asunnot Kreikasta – {datetime.now().strftime('%d.%m.%Y')}", "content": content}


4.4 Send Email via SendGrid
python
Copy

import requests

def send_email(subject, content, template_id):
    headers = {
        "Authorization": f"Bearer {SENDGRID_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "personalizations": [{"to": [{"email": "[Subscriber Email]"}], "dynamic_template_data": {"subject": subject, "content": content}}],
        "from": {"email": "noreply@kotikreikasta.com", "name": "Kotikreikasta.com"},
        "template_id": template_id,
        "asm": {"group_id": [GDPR Unsubscribe Group ID]}
    }
    response = requests.post("https://api.sendgrid.com/v3/mail/send", headers=headers, json=data)
    if response.status_code != 202:
        print(f"Failed to send email: {response.text}")


5. Deployment

Environment: Google Cloud Run or Cloud Functions.
Trigger: Pub/Sub push or pull.

6. GDPR Compliance

Unsubscribe Handling: SendGrid’s unsubscribe groups and suppression lists.
Data Storage: No personal data stored beyond what is required for sending emails.
