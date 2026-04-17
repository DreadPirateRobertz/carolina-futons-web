// Site-wide footer shell. Godfrey owns the real design (cf-3qt.1).
// Keep this a pure placeholder: no state, no data fetches, no client code.
export function Footer() {
  return (
    <footer
      data-slot="site-footer"
      className="mt-auto border-t border-neutral-200/60"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-neutral-500">
        © {new Date().getFullYear()} Carolina Futons
      </div>
    </footer>
  );
}
