# Deployment Performance Analysis

## Current State: 15-Minute Deployments

### Time Breakdown
1. **Next.js Build (hosting)**: ~12s ✅
2. **Next.js Build (admin)**: ~11s ✅
3. **Package Upload**: ~60s (118MB + 35MB)
4. **Cloud Build**: ~10-12 min ⚠️ **MAJOR BOTTLENECK**
5. **Function Update**: ~2-3 min
6. **Hosting Finalization**: ~30s

**Total**: ~15 minutes

---

## Root Causes

### 1. Dual App Deployment (Biggest Issue)
Every `firebase deploy --only hosting` deploys **BOTH**:
- `firebase-frameworks-kotikreikasta` (118MB)
- `firebase-frameworks-kotikreikasta-admin` (35MB)

Even if you only changed one app, both get rebuilt.

### 2. Large Package Sizes
- Hosting: 118.46 MB (includes full node_modules)
- Admin: 35.2 MB
- Cloud Build reinstalls all dependencies from scratch each time

### 3. Cloud Build Cold Starts
Each deployment:
- Downloads source: 30-60s
- Installs dependencies: 3-5 min
- Builds Docker image: 3-4 min
- Pushes to registry: 2-3 min

### 4. No Build Caching
Firebase Frameworks doesn't cache:
- npm dependencies
- Next.js build artifacts
- Docker layers

---

## Solutions (Ranked by Impact)

### 🔥 HIGH IMPACT (5-10 min savings)

#### 1. Deploy Apps Separately
```bash
# Only deploy hosting when hosting changes
firebase deploy --only hosting:kotikreikasta

# Only deploy admin when admin changes
firebase deploy --only hosting:kotikreikasta-admin
```

**Savings**: 5-7 minutes (skip one app's build)

#### 2. Use `.firebaserc` with Targets
Already configured, just use the specific target:
```bash
cd hosting && firebase deploy --only hosting
cd admin && firebase deploy --only hosting
```

#### 3. Reduce Package Size with .gcloudignore
Create `hosting/.gcloudignore`:
```
node_modules/
.next/cache/
.git/
*.md
*.test.ts
*.test.tsx
__tests__/
coverage/
.env.local
```

**Savings**: 2-3 minutes (faster upload/download)

### ⚡ MEDIUM IMPACT (2-4 min savings)

#### 4. Use Cloud Build Caching
Add `cloudbuild.yaml` to enable dependency caching:
```yaml
steps:
  - name: 'gcr.io/cloud-builders/npm'
    args: ['ci', '--cache', '.npm']
    env:
      - 'NPM_CONFIG_CACHE=.npm'
cache:
  paths:
    - '.npm'
    - 'node_modules'
```

**Savings**: 2-3 minutes (cached npm install)

#### 5. Production-Only Dependencies
Move dev dependencies out of production builds:
```json
{
  "dependencies": {
    // Only runtime deps
  },
  "devDependencies": {
    "@types/*": "...",
    "vitest": "...",
    "@testing-library/*": "..."
  }
}
```

Use `npm ci --omit=dev` in production.

**Savings**: 1-2 minutes (smaller package, faster install)

### 💡 LOW IMPACT (30s-1 min savings)

#### 6. Parallel Uploads
Already happening automatically.

#### 7. Optimize next.config.js
Already done:
- ✅ `productionBrowserSourceMaps: false`
- ✅ `swcMinify: true`
- ✅ `eslint.ignoreDuringBuilds: true`

---

## Recommended Action Plan

### Immediate (Do Now)
1. **Deploy apps separately** when only one changed
   ```bash
   # Changed hosting only?
   firebase deploy --only hosting:kotikreikasta
   
   # Changed admin only?
   firebase deploy --only hosting:kotikreikasta-admin
   ```

2. **Create `.gcloudignore`** files to reduce package size

### Short-term (This Week)
3. **Audit dependencies** - move dev deps to devDependencies
4. **Add Cloud Build caching** configuration

### Long-term (Consider)
5. **Migrate to Cloud Run directly** (skip Firebase Frameworks overhead)
6. **Use monorepo build tools** (Turborepo, Nx) for selective builds

---

## Expected Results

| Optimization | Time Saved | Effort |
|-------------|-----------|--------|
| Deploy one app only | 5-7 min | Low (change command) |
| .gcloudignore | 2-3 min | Low (create file) |
| Cloud Build cache | 2-3 min | Medium (config file) |
| Prod-only deps | 1-2 min | Medium (package.json cleanup) |
| **Total Potential** | **10-15 min** | - |

**Target**: 3-5 minute deployments (from 15 min)

---

## Notes

- Firebase Frameworks is convenient but adds overhead
- Each Cloud Build is a fresh container (no persistent cache)
- Next.js build is already fast (~12s) - not the bottleneck
- The 118MB package size is reasonable for a full Next.js app with dependencies
