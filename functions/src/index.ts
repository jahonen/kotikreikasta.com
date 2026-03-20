/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import * as functions from "firebase-functions/v1";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { Novu } from "@novu/node";
import sgMail from "@sendgrid/mail";

// Social media consumers (legacy)
export { publishToBluesky } from "./consumers/bluesky";
export { testBlueskyPost } from "./consumers/bluesky-test";
export { testXPost } from "./consumers/x-test";
export { testFacebookPost } from "./consumers/facebook-test";
export { testThreadsPost } from "./consumers/threads-test";
export { refreshThreadsToken } from "./consumers/threads-token-refresh";

// Social media publishers (Pub/Sub-based)
export { blueskyPublisher } from "./consumers/bluesky-pubsub";
export { xPublisher } from "./consumers/x-pubsub";
export { facebookPublisher } from "./consumers/facebook-pubsub";
export { threadsPublisher } from "./consumers/threads-pubsub";
export { testContentGeneration } from './test-content-generation';

// Firestore triggers for auto-publishing
export { onBlogPostPublished, onListingPublished } from "./triggers/content-published";

// Schedulers
export { socialMediaScheduler } from "./schedulers/social-media-scheduler";

// API endpoints
export { enqueueSocialPublish } from "./api/enqueue-social-publish";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

initializeApp();

export const createUserDocument = functions.region("europe-west1").auth.user().onCreate(async (user: any) => {
  const db = getFirestore();
  const ref = db.doc(`users/${user.uid}`);
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set({
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
});

// Leads: enrich and notify (alpha)
export const onLeadCreated = functions
  .runWith({ maxInstances: 10 })
  .region("europe-west1")
  .firestore.document("leads/{id}")
  .onCreate(async (snap, ctx) => {
    const db = getFirestore();
    const id = ctx.params.id as string;
    const data = snap.data() as any;

    functions.logger.info("onLeadCreated:start", { id, source: data?.source?.type, email: data?.contact?.email });

    // Compute/normalize server-side to ensure integrity
    const status = (data?.status as string) || "lead";
    const statusPctMap: Record<string, number> = { lead: 0.10, prospect: 0.25, proposal: 0.50, contracting: 0.80, closed: 1.0 };
    const statusPct = statusPctMap[status] ?? 0.10;
    let tcv = Number(data?.tcv || 0);
    if (!tcv && data?.source?.type === 'listing') {
      const price = Number(data?.source?.price || 0);
      if (isFinite(price) && price > 0) tcv = Math.round(price * 0.02);
    }
    const currentValue = Math.round((tcv || 0) * statusPct);

    try {
      await snap.ref.set({
        status,
        statusPct,
        tcv: tcv || 0,
        currentValue,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (e: any) {
      functions.logger.warn("onLeadCreated:update_failed", { id, error: e?.message || String(e) });
    }

    // Load secrets (prefer Secret Manager; fallback to env for local dev)
    const sm = new SecretManagerServiceClient();
    async function accessSecret(name: string): Promise<string> {
      try {
        const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
        if (!project) return process.env[name] || '';
        const full = `projects/${project}/secrets/${name}/versions/latest`;
        const [version] = await sm.accessSecretVersion({ name: full });
        return version.payload?.data?.toString() ?? '';
      } catch {
        return process.env[name] || '';
      }
    }

    // Prepare recipients (admins)
    let adminUids: string[] = [];
    try {
      const rs = await db.collection('roles').where('role', '==', 'admin').get();
      adminUids = rs.docs.map((d) => d.id);
    } catch {}
    let adminEmails: string[] = [];
    try {
      if (adminUids.length) {
        const snaps = await Promise.all(adminUids.map((uid) => db.doc(`users/${uid}`).get()));
        adminEmails = snaps.map((s) => (s.data() as any)?.email).filter(Boolean);
      }
    } catch {}

    // Trigger Novu event
    (async () => {
      try {
        const NOVU_API_KEY = await accessSecret('NOVU_API_KEY');
        if (!NOVU_API_KEY) return;
        const backendUrl = process.env.NEXT_PUBLIC_NOVU_BACKEND_URL as string | undefined;
        const novu = new Novu(NOVU_API_KEY, ...(backendUrl ? [{ backendUrl }] : [{}] as any));
        const to = adminUids.length ? adminUids.map((uid) => ({ subscriberId: uid })) : [];
        if (!to.length) return;
        await novu.trigger('lead-created', {
          to,
          payload: {
            id,
            source: data?.source || null,
            contact: data?.contact || null,
            message: data?.message || '',
            tcv,
            currentValue,
            status,
          },
        });
      } catch (e: any) {
        functions.logger.warn('onLeadCreated:novu_failed', { id, error: e?.message || String(e) });
      }
    })();

    // SendGrid email to admin alias or admin emails
    (async () => {
      try {
        const SENDGRID_API_KEY = await accessSecret('SENDGRID_API_KEY');
        if (!SENDGRID_API_KEY) return;
        sgMail.setApiKey(SENDGRID_API_KEY);
        const TO_ALIAS = (await accessSecret('LEADS_ADMIN_EMAIL')) || '';
        const toList = (TO_ALIAS ? [TO_ALIAS] : []).concat(adminEmails).filter(Boolean);
        if (!toList.length) return;

        const src = data?.source || {};
        const title = src?.title || (src?.type === 'listing' ? `Kohde ${src?.listingId || ''}` : 'Yhteydenotto');
        const url = src?.url || '';
        const c = data?.contact || {};
        const lines = [
          `Uusi liidi — ${title}`,
          url ? `Lähde: ${url}` : '',
          `Nimi: ${c?.name || '-'}`,
          `Sähköposti: ${c?.email || '-'}`,
          `Puhelin: ${c?.phone || '-'}`,
          `Viesti: ${data?.message || ''}`,
          `TCV: €${(tcv || 0).toLocaleString('fi-FI')}`,
          `Nykyarvo: €${(currentValue || 0).toLocaleString('fi-FI')} (${Math.round(statusPct*100)}%)`,
        ].filter(Boolean).join('\n');

        await sgMail.send({
          to: toList,
          from: process.env.SENDGRID_FROM || 'no-reply@kotikreikasta.com',
          subject: `Uusi liidi: ${title}`,
          text: lines,
        } as any);
      } catch (e: any) {
        functions.logger.warn('onLeadCreated:email_failed', { id, error: e?.message || String(e) });
      }
    })();

    functions.logger.info("onLeadCreated:done", { id });
  });

// Publication queue processor - sets blog/listing status to published when queue item created
export const processPublicationQueue = functions
  .runWith({ serviceAccount: "kotikreikasta@appspot.gserviceaccount.com" })
  .region("europe-west1")
  .firestore.document("publication_queue/{id}")
  .onCreate(async (snap, ctx) => {
    const db = getFirestore();
    const id = ctx.params.id as string;
    const payload = snap.data() as any;

    functions.logger.info("processPublicationQueue:start", { 
      id, 
      contentType: payload?.contentType, 
      contentId: payload?.contentId 
    });

    try {
      const contentType = String(payload?.contentType || "");
      const contentId = String(payload?.contentId || "");

      if (!contentType || !contentId) {
        functions.logger.warn("processPublicationQueue:missing_fields", { id, contentType, contentId });
        return;
      }

      // Set content status to published
      if (contentType === "blog_post") {
        const blogRef = db.doc(`blog_posts/${contentId}`);
        const blogSnap = await blogRef.get();
        
        if (!blogSnap.exists) {
          functions.logger.error("processPublicationQueue:content_not_found", { id, contentId });
          return;
        }

        const data = blogSnap.data() || {};
        const alreadyPublished = data.status === "published";
        
        if (!alreadyPublished) {
          await blogRef.set({
            status: "published",
            updatedAt: FieldValue.serverTimestamp(),
            publishedAt: data.publishedAt || FieldValue.serverTimestamp(),
          }, { merge: true });
          
          functions.logger.info("processPublicationQueue:blog_published", { id, contentId });
        }
      } else if (contentType === "listing") {
        const listingRef = db.doc(`listings/${contentId}`);
        const listingSnap = await listingRef.get();
        
        if (!listingSnap.exists) {
          functions.logger.error("processPublicationQueue:content_not_found", { id, contentId });
          return;
        }

        const data = listingSnap.data() || {};
        const alreadyPublished = data.status === "published";
        
        if (!alreadyPublished) {
          await listingRef.set({
            status: "published",
            updatedAt: FieldValue.serverTimestamp(),
            publishedAt: data.publishedAt || FieldValue.serverTimestamp(),
          }, { merge: true });
          
          functions.logger.info("processPublicationQueue:listing_published", { id, contentId });
        }
      }

      functions.logger.info("processPublicationQueue:done", { id, contentType, contentId });
    } catch (e: any) {
      functions.logger.error("processPublicationQueue:error", { 
        id, 
        error: e?.message || String(e) 
      });
    }
  });

// export const helloWorld = functions.https.onRequest((request, response) => {
//   response.send("Hello from Firebase!");
// });
