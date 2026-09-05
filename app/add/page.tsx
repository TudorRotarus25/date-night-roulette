"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CUISINES } from "@/lib/cuisines";
import { addRestaurant } from "@/lib/actions";
import { resolveLink } from "./actions";

const REASON_COPY: Record<string, string> = {
  no_url: "Didn't find a link in there. Paste the share text or the URL itself.",
  not_maps_link: "That doesn't look like a Google Maps link.",
  no_name: "That link doesn't carry a name (likely a dropped pin) — type it in below.",
  network_error: "Couldn't reach that link just now — type it in below.",
};

export default function AddPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<"paste" | "details">("paste");
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [note, setNote] = useState("");
  const [sourceUrl, setSourceUrl] = useState<string | undefined>(undefined);

  function handleResolve() {
    setPasteError(null);
    startTransition(async () => {
      const result = await resolveLink(pasteText);
      if (result.ok) {
        setName(result.name);
        setSourceUrl(result.resolvedUrl);
        setStep("details");
      } else {
        setPasteError(REASON_COPY[result.reason] ?? "Couldn't resolve that link.");
      }
    });
  }

  function handleSkip() {
    setPasteError(null);
    setName("");
    setSourceUrl(undefined);
    setStep("details");
  }

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      await addRestaurant({ name, cuisine: cuisine || "unknown", note, sourceUrl });
      router.push("/restaurants");
    });
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold mb-6 text-center">Add a restaurant</h1>

        {step === "paste" && (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold" htmlFor="paste">
              Paste what you shared from Google Maps
            </label>
            <textarea
              id="paste"
              autoFocus
              rows={4}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="L'homme https://maps.app.goo.gl/..."
              className="w-full rounded-[14px] border px-4 py-3 text-base outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            {pasteError && (
              <p className="text-sm" style={{ color: "var(--accent)" }}>
                {pasteError}
              </p>
            )}
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={isPending || !pasteText.trim()}
                onClick={handleResolve}
              >
                {isPending ? "Looking it up…" : "Find it"}
              </button>
              <button type="button" className="btn btn-quiet" onClick={handleSkip}>
                Skip — I&apos;ll type it in
              </button>
            </div>
          </div>
        )}

        {step === "details" && (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[14px] border px-4 py-3 text-base outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            />

            <label className="text-sm font-semibold" htmlFor="cuisine">
              Cuisine
            </label>
            <select
              id="cuisine"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="w-full rounded-[14px] border px-4 py-3 text-base outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              <option value="">Not sure yet</option>
              {CUISINES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>

            <label className="text-sm font-semibold" htmlFor="note">
              Note (optional)
            </label>
            <textarea
              id="note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything worth remembering"
              className="w-full rounded-[14px] border px-4 py-3 text-base outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            />

            <div className="btn-row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={isPending || !name.trim()}
                onClick={handleSave}
              >
                {isPending ? "Saving…" : "Add to the pool"}
              </button>
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <Link href="/" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            ← Back
          </Link>
        </div>
      </div>
    </main>
  );
}
