#!/bin/bash
# Deploy Cloud Scheduler jobs for Bluesky social media posting
# Run this script after deploying the publishToBluesky Cloud Function

set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-kotikreikasta}"
REGION="europe-west1"
FUNCTION_URL="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/publishToBluesky"

echo "Deploying Cloud Scheduler jobs for Bluesky..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Function URL: $FUNCTION_URL"
echo ""

# Helper function to create or update scheduler job
create_or_update_job() {
  local JOB_NAME=$1
  local SCHEDULE=$2
  local DESCRIPTION=$3
  
  echo "Creating/updating job: $JOB_NAME"
  
  # Check if job exists
  if gcloud scheduler jobs describe "$JOB_NAME" --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
    echo "  Job exists, updating..."
    gcloud scheduler jobs update http "$JOB_NAME" \
      --location="$REGION" \
      --project="$PROJECT_ID" \
      --schedule="$SCHEDULE" \
      --uri="$FUNCTION_URL" \
      --http-method=POST \
      --time-zone=UTC \
      --description="$DESCRIPTION" \
      --quiet
  else
    echo "  Job does not exist, creating..."
    gcloud scheduler jobs create http "$JOB_NAME" \
      --location="$REGION" \
      --project="$PROJECT_ID" \
      --schedule="$SCHEDULE" \
      --uri="$FUNCTION_URL" \
      --http-method=POST \
      --time-zone=UTC \
      --description="$DESCRIPTION" \
      --quiet
  fi
  
  echo "  ✓ Done"
  echo ""
}

# Tuesday 7:00 AM EEST (4:00 AM UTC)
create_or_update_job \
  "bluesky-tuesday-primary" \
  "0 4 * * 2" \
  "Bluesky post - Tuesday morning (7:00-8:30 EEST)"

# Wednesday 7:15 AM EEST (4:15 AM UTC)
create_or_update_job \
  "bluesky-wednesday-primary" \
  "15 4 * * 3" \
  "Bluesky post - Wednesday morning (7:15-8:30 EEST)"

# Thursday 3:30 PM EEST (12:30 PM UTC)
create_or_update_job \
  "bluesky-thursday-primary" \
  "30 12 * * 4" \
  "Bluesky post - Thursday afternoon (3:30-5:00 PM EEST)"

# Friday 7:00 AM EEST (4:00 AM UTC)
create_or_update_job \
  "bluesky-friday-primary" \
  "0 4 * * 5" \
  "Bluesky post - Friday morning (7:00-8:15 EEST)"

# Friday 2:00 PM EEST (11:00 AM UTC)
create_or_update_job \
  "bluesky-friday-secondary" \
  "0 11 * * 5" \
  "Bluesky post - Friday afternoon (2:00-4:00 PM EEST)"

# Saturday 9:00 AM EEST (6:00 AM UTC)
create_or_update_job \
  "bluesky-saturday-primary" \
  "0 6 * * 6" \
  "Bluesky post - Saturday morning (9:00-11:00 EEST)"

# Saturday 7:30 PM EEST (4:30 PM UTC)
create_or_update_job \
  "bluesky-saturday-secondary" \
  "30 16 * * 6" \
  "Bluesky post - Saturday evening (7:30-9:00 PM EEST)"

# Sunday 9:30 AM EEST (6:30 AM UTC)
create_or_update_job \
  "bluesky-sunday-primary" \
  "30 6 * * 0" \
  "Bluesky post - Sunday morning (9:30-11:30 EEST)"

# Sunday 3:00 PM EEST (12:00 PM UTC)
create_or_update_job \
  "bluesky-sunday-secondary" \
  "0 12 * * 0" \
  "Bluesky post - Sunday afternoon (3:00-4:30 PM EEST)"

echo "=========================================="
echo "✓ All Cloud Scheduler jobs deployed!"
echo "=========================================="
echo ""
echo "To list all jobs:"
echo "  gcloud scheduler jobs list --location=$REGION --project=$PROJECT_ID"
echo ""
echo "To manually trigger a job for testing:"
echo "  gcloud scheduler jobs run bluesky-tuesday-primary --location=$REGION --project=$PROJECT_ID"
echo ""
echo "To view job logs:"
echo "  gcloud logging read 'resource.type=cloud_scheduler_job' --limit=50 --format=json"
echo ""
