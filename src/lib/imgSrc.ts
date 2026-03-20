import type { StaticImageData } from 'next/image';

/** Next.js image imports are `StaticImageData`; plain `<img src>` needs a string URL. */
export function imgSrc(asset: string | StaticImageData): string {
  return typeof asset === 'string' ? asset : asset.src;
}
