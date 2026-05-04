type Props = { className?: string };

export function FallsScene({ className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/scenes/v3-05-falls.svg"
      alt=""
      aria-hidden="true"
      className={className}
      style={{ display: "block", width: "100%" }}
    />
  );
}
