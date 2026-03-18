#!/bin/bash
set -e

echo "🚀 Deploying hosting app only..."
echo ""

cd hosting
firebase deploy --only hosting:kotikreikasta

echo ""
echo "✅ Hosting deployment complete!"
