type Props = { className?: string };

export function ReadingScene({ className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/scenes/v3-04-reading.svg"
      alt=""
      aria-hidden="true"
      className={className}
      style={{ display: "block", width: "100%" }}
    />
  );
}
