// Site-wide header shell. Godfrey owns the real design + nav wiring (cf-3qt.1).
// Keep this a pure placeholder: no state, no data fetches, no client code.
export function Header() {
  return (
    <header
      data-slot="site-header"
      className="border-b border-neutral-200/60"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
        <span className="text-sm font-semibold tracking-tight">
          Carolina Futons
        </span>
      </div>
    </header>
  );
}
