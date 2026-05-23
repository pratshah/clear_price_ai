#!/usr/bin/env bash
# ClearPrice — deploy all services to Cloud Run
# Usage: ./deploy.sh [GCP_PROJECT_ID] [GCP_REGION]
# Requires: gcloud CLI authenticated, GCP_PROJECT_ID and MONGODB_URI set

set -euo pipefail

# Define cleanup handler
cleanup() {
  echo ""
  echo "==> Cleaning up temporary workspace files..."
  rm -f ./Dockerfile
  rm -f frontend/.env.production
}
trap cleanup EXIT INT TERM

# Load environment variables from .env if it exists
if [ -f .env ]; then
  echo "==> Loading configuration from .env..."
  set -a; source .env; set +a
else
  echo "==> No .env file found. Relying on environment or command arguments..."
fi

# Configuration priority: 1) CLI argument, 2) Environment variable, 3) Defaults
PROJECT="${1:-${GCP_PROJECT_ID:-}}"
REGION="${2:-${VERTEX_AI_LOCATION:-us-central1}}"
MONGO_URI="${MONGODB_URI:-}"
MAPS_KEY="${GOOGLE_MAPS_API_KEY:-}"
GEMINI_KEY="${GEMINI_API_KEY:-}"

# Check required parameters
if [ -z "$PROJECT" ]; then
  echo "Error: Google Cloud Project ID is not defined."
  echo "Please set GCP_PROJECT_ID in your .env, as an environment variable, or pass it as the first argument:"
  echo "       ./deploy.sh <GCP_PROJECT_ID> [REGION]"
  exit 1
fi

if [ -z "$MONGO_URI" ]; then
  echo "Error: MONGODB_URI is not defined."
  echo "Please set MONGODB_URI in your .env or as an environment variable."
  exit 1
fi

echo "============================================================"
echo " Deploying ClearPrice to Google Cloud"
echo " Project: $PROJECT"
echo " Region:  $REGION"
echo "============================================================"

# Check gcloud authentication
echo "==> Verifying gcloud authentication..."
ACTIVE_ACCOUNT=$(gcloud config get-value account 2>/dev/null || true)
if [ -z "$ACTIVE_ACCOUNT" ]; then
  echo "Error: No active gcloud account found."
  echo "Please run: gcloud auth login"
  exit 1
fi
echo "Active account: $ACTIVE_ACCOUNT"

# Set active project in gcloud
echo "==> Setting active gcloud project to $PROJECT..."
gcloud config set project "$PROJECT"

# Proactively enable required GCP APIs
echo "==> Checking/Enabling required Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  aiplatform.googleapis.com \
  cloudbuild.googleapis.com \
  --project "$PROJECT" || {
    echo "Warning: Could not enable required services automatically."
    echo "Please ensure Service Usage Admin role is assigned and the billing is enabled."
}

# 0. Build all workspaces
echo ""
echo "--- [0/3] Compiling Workspaces ---"
NODE_ENV=production npm run build

# 1. MCP Server
echo ""
echo "--- [1/3] MCP Server ---"
cp mcp-server/Dockerfile ./Dockerfile
gcloud run deploy clearprice-mcp \
  --source . \
  --project "$PROJECT" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "MONGODB_URI=${MONGO_URI},MONGODB_DATABASE=clearprice,NODE_ENV=production,GCP_PROJECT_ID=${PROJECT},VERTEX_AI_LOCATION=${REGION},GOOGLE_MAPS_API_KEY=${MAPS_KEY}" \
  --memory 512Mi \
  --min-instances 1

MCP_URL=$(gcloud run services describe clearprice-mcp \
  --project "$PROJECT" --region "$REGION" \
  --format "value(status.url)")

if [ -z "$MCP_URL" ]; then
  echo "Error: Failed to retrieve URL for clearprice-mcp."
  exit 1
fi
echo "MCP Server URL: $MCP_URL"

# 2. API (Hosts the Agent In-Memory)
echo ""
echo "--- [2/3] API ---"
cp api/Dockerfile ./Dockerfile
gcloud run deploy clearprice-api \
  --source . \
  --project "$PROJECT" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "MONGODB_URI=${MONGO_URI},MONGODB_DATABASE=clearprice,NODE_ENV=production,MCP_SERVER_URL=${MCP_URL},GOOGLE_MAPS_API_KEY=${MAPS_KEY},GEMINI_API_KEY=${GEMINI_KEY}" \
  --memory 1Gi \
  --min-instances 1

API_URL=$(gcloud run services describe clearprice-api \
  --project "$PROJECT" --region "$REGION" \
  --format "value(status.url)")

if [ -z "$API_URL" ]; then
  echo "Error: Failed to retrieve URL for clearprice-api."
  exit 1
fi
echo "API URL: $API_URL"

# 3. Frontend
echo ""
echo "--- [3/3] Frontend ---"
echo "Generating temporary frontend/.env.production with live build variables..."
echo "NEXT_PUBLIC_API_URL=${API_URL}" > frontend/.env.production
echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${MAPS_KEY}" >> frontend/.env.production

gcloud run deploy clearprice-frontend \
  --source ./frontend \
  --project "$PROJECT" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_API_URL=${API_URL},NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${MAPS_KEY}" \
  --set-build-env-vars "NEXT_PUBLIC_API_URL=${API_URL},NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${MAPS_KEY}" \
  --memory 512Mi

FRONTEND_URL=$(gcloud run services describe clearprice-frontend \
  --project "$PROJECT" --region "$REGION" \
  --format "value(status.url)")

echo "============================================================"
echo "==> Deploy complete!"
echo "    App:     $FRONTEND_URL"
echo "    API:     $API_URL"
echo "    MCP:     $MCP_URL"
echo "============================================================"
