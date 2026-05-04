export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-30 px-5 py-4 flex items-center justify-between"
      style={{
        background: "linear-gradient(180deg, rgba(10,14,31,0.85), rgba(10,14,31,0.55))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div>
        <h1
          className="text-lg font-bold tracking-tight"
          style={{
            background: "linear-gradient(90deg, #e7ecff 0%, #00e0ff 60%, #a155ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] mt-0.5 font-medium mono" style={{ color: "var(--fg-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </header>
  );
}
