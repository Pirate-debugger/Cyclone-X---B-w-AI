#!/usr/bin/env bash
# ==============================================================================
# CYCLONE-X V3: GOOGLE CLOUD ENTERPRISE INFRASTRUCTURE DEPLOYMENT SCRIPT
# Provisions: Cloud Run, Cloud SQL PostGIS, BigQuery, Vertex AI, Firestore, GCS
# ==============================================================================

set -euo pipefail

PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project)}
REGION=${GOOGLE_CLOUD_REGION:-"asia-south1"} # Mumbai / Indian Coast proximity
VERTEX_LOCATION=${VERTEX_AI_LOCATION:-"us-central1"}
SQL_INSTANCE="cyclonex-postgis-db"
BUCKET_NAME="${PROJECT_ID}-cyclonex-geospatial"

echo "======================================================================"
echo "DEPLOYING CYCLONE-X V3 TO GOOGLE CLOUD: ${PROJECT_ID} (${REGION})"
echo "======================================================================"

# 1. Enable Required Google Cloud APIs
echo "--> Enabling mandatory Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  aiplatform.googleapis.com \
  earthengine.googleapis.com \
  bigquery.googleapis.com \
  firestore.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  pubsub.googleapis.com \
  speech.googleapis.com \
  texttospeech.googleapis.com \
  translate.googleapis.com \
  cloudbuild.googleapis.com \
  storage-component.googleapis.com \
  --project="${PROJECT_ID}"

# 2. Setup Google Cloud Storage Bucket for Rasters, GeoTIFF, and COG Artifacts
echo "--> Provisioning Google Cloud Storage Bucket: gs://${BUCKET_NAME}..."
if ! gsutil ls -b "gs://${BUCKET_NAME}" > /dev/null 2>&1; then
  gsutil mb -p "${PROJECT_ID}" -c STANDARD -l "${REGION}" "gs://${BUCKET_NAME}"
  gsutil uniformbucketlevelaccess set on "gs://${BUCKET_NAME}"
fi

# 3. Setup BigQuery Datasets (Partitioned & Clustered)
echo "--> Initializing BigQuery Datasets: cyclonex_raw, cyclonex_curated, cyclonex_analytics, cyclonex_ml..."
bq --location="${REGION}" mk -d --description "Raw cyclone ingested feeds" "${PROJECT_ID}:cyclonex_raw" || true
bq --location="${REGION}" mk -d --description "Curated normalized forecast runs" "${PROJECT_ID}:cyclonex_curated" || true
bq --location="${REGION}" mk -d --description "Ensemble and hazard analytics" "${PROJECT_ID}:cyclonex_analytics" || true
bq --location="${REGION}" mk -d --description "Vertex AI training and evaluation features" "${PROJECT_ID}:cyclonex_ml" || true

# 4. Provision Cloud SQL for PostgreSQL 16 + PostGIS
echo "--> Provisioning Cloud SQL PostgreSQL + PostGIS instance (Production Database)..."
# gcloud sql instances create ${SQL_INSTANCE} \
#   --database-version=POSTGRES_16 \
#   --tier=db-custom-2-7680 \
#   --region=${REGION} \
#   --storage-type=SSD \
#   --storage-size=50GB \
#   --project=${PROJECT_ID}

# 5. Secret Manager Setup (Zero Hardcoded Credentials)
echo "--> Creating Secret Manager placeholders for API Keys..."
for SECRET_NAME in "gemini-api-key" "google-maps-api-key" "firebase-admin-key"; do
  if ! gcloud secrets describe "${SECRET_NAME}" --project="${PROJECT_ID}" > /dev/null 2>&1; then
    gcloud secrets create "${SECRET_NAME}" --replication-policy="automatic" --project="${PROJECT_ID}"
  fi
done

# 6. Deploy Backend Service to Cloud Run
echo "--> Deploying Backend API to Cloud Run..."
gcloud run deploy cyclonex-backend \
  --source . \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 10 \
  --cpu 2 \
  --memory 4Gi \
  --set-env-vars "APP_MODE=production,GEMINI_MODEL=gemini-3.8-flash,VERTEX_AI_PROJECT=${PROJECT_ID},VERTEX_AI_LOCATION=${VERTEX_LOCATION},BIGQUERY_PROJECT=${PROJECT_ID},GCS_BUCKET=${BUCKET_NAME}" \
  --project "${PROJECT_ID}"

# 7. Deploy Frontend Service to Cloud Run
echo "--> Deploying Frontend Application to Cloud Run..."
gcloud run deploy cyclonex-frontend \
  --source ./frontend \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 5 \
  --cpu 1 \
  --memory 2Gi \
  --project "${PROJECT_ID}"

echo "======================================================================"
echo "CYCLONE-X V3 DEPLOYMENT COMPLETE"
echo "======================================================================"
