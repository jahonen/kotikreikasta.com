"use client";

import { FormEvent, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDbClient } from "../../../lib/firebase-client";
import { useRouter } from "next/navigation";

export default function NewListingPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !description.trim()) {
      setError("Täytä otsikko ja kuvaus.");
      return;
    }
    setSaving(true);
    try {
      const db = await getDbClient();
      if (!db) { setError("Firebase init failed"); return; }
      const n = price.trim() ? Number(price.replace(/\s/g, "")) : undefined;
      await addDoc(collection(db, "listings"), {
        title: title.trim(),
        description: description.trim(),
        ...(typeof n === "number" && isFinite(n) ? { price: n } : {}),
        status: "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as any);
      router.push("/listings");
    } catch (e: any) {
      setError(e?.message || "Tallennus epäonnistui. Varmista käyttöoikeudet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Uusi kohdelistaus</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
        <input className="input" placeholder="Otsikko" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" placeholder="Kuvaus" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div>
          <input className="input" placeholder="Hinta (€)" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        {error && <div style={{ color: '#b00020' }}>{error}</div>}
        <div>
          <button className="btn-primary" disabled={saving}>{saving ? 'Tallennetaan…' : 'Tallenna luonnos'}</button>
        </div>
      </form>
    </main>
  );
}
