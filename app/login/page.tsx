import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const hasError = params.error === "1";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-bold text-center mb-2">
          Date Night Roulette
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          Enter the passphrase to get in.
        </p>
        <form action={login} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <input
            type="password"
            name="passphrase"
            autoFocus
            required
            placeholder="Passphrase"
            className="w-full rounded-[14px] border px-4 py-3 text-base outline-none"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
          {hasError && (
            <p className="text-sm" style={{ color: "var(--accent)" }}>
              That&apos;s not it — try again.
            </p>
          )}
          <button type="submit" className="btn btn-primary">
            Let&apos;s eat
          </button>
        </form>
      </div>
    </main>
  );
}
