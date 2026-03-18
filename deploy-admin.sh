#!/bin/bash
set -e

echo "🚀 Deploying admin app only..."
echo ""

cd admin
firebase deploy --only hosting:kotikreikasta-admin

echo ""
echo "✅ Admin deployment complete!"
