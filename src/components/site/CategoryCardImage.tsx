"use client";

import Image from "next/image";

type Props = {
  src: string;
  slug: string;
};

export function CategoryCardImage({ src, slug }: Props) {
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      className="object-cover transition-transform duration-300 group-hover:scale-105"
      onError={() =>
        console.warn(`[HomePage] failed to load category image: ${slug}`, src)
      }
    />
  );
}
