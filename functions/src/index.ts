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

// MVP publication queue processor (alpha)
export const processPublicationQueue = functions
  .region("europe-west1")
  .firestore.document("publication_queue/{id}")
  .onCreate(async (snap, ctx) => {
    const db = getFirestore();
    const id = ctx.params.id as string;
    const payload = snap.data() as any;

    functions.logger.info("processPublicationQueue:start", { id, payloadSummary: { type: payload?.type, action: payload?.action, blogId: payload?.blogId } });

    const statusRef = snap.ref;
    const mark = async (fields: Record<string, any>) => {
      try {
        await statusRef.set({ ...fields, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      } catch (e: any) {
        functions.logger.warn("processPublicationQueue:status_update_failed", { id, error: e?.message || String(e) });
      }
    };

    try {
      const type = String(payload?.type || "");
      const action = String(payload?.action || "");

      if (type === "blog_post" && action === "publish") {
        const blogId = String(payload?.blogId || "");
        if (!blogId) throw new Error("missing_blogId");

        const blogRef = db.doc(`blog_posts/${blogId}`);
        const blogSnap = await blogRef.get();
        if (!blogSnap.exists) throw new Error("blog_not_found");

        const data = blogSnap.data() || {};
        const alreadyPublished = data.status === "published";
        if (alreadyPublished) {
          await mark({ status: "done", note: "already_published" });
          functions.logger.info("processPublicationQueue:skip_already_published", { id, blogId });
          return;
        }

        await blogRef.set({
          status: "published",
          updatedAt: FieldValue.serverTimestamp(),
          publishedAt: data.publishedAt || FieldValue.serverTimestamp(),
        }, { merge: true });

        // TODO: path/tag revalidation can be called here via a signed fetch to Next.js if needed.

        await mark({ status: "done" });
        functions.logger.info("processPublicationQueue:done", { id, blogId });
        return;
      }

      // Unknown payload; mark as ignored
      await mark({ status: "ignored", error: "unsupported_type_or_action" });
      functions.logger.warn("processPublicationQueue:ignored", { id, payload });
    } catch (e: any) {
      await mark({ status: "error", error: e?.message || String(e) });
      functions.logger.error("processPublicationQueue:error", { id, error: e?.message || String(e) });
    }
  });

// export const helloWorld = functions.https.onRequest((request, response) => {
//   response.send("Hello from Firebase!");
// });
