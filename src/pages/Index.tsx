export default function Index() {
  // @ts-ignore
  const url = import.meta.env.VITE_SUPABASE_URL;
  // @ts-ignore
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return (
    <div style={{ padding: 24, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
      {`VITE_SUPABASE_URL: ${url ? "OK" : "MISSING"}\nVITE_SUPABASE_PUBLISHABLE_KEY: ${key ? "OK" : "MISSING"}`}
    </div>
  );
}
