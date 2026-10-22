import { APP_BAWAAN } from '@/api/pengaturanUi'

/** Width / height of the built-in logo files, so the page keeps its room before the picture loads. */
const RASIO = 240 / 133

/**
 * The app logo. The built-in one is the "Kuning ampel" wordmark with its own soft shadow and follows the theme: grey
 * lettering in the light theme, white lettering in the dark one. A logo address an admin set in Kelola Aplikasi is shown
 * as it is. Set the height in `className` (the width follows). `besar` picks the larger file for big places (login), so
 * the picture is always bigger than where it is shown and never gets stretched.
 */
export default function LogoApp({
  src = APP_BAWAAN.logo,
  alt,
  className,
  besar = false,
  tinggi,
}: {
  src?: string
  alt: string
  className: string
  besar?: boolean
  /** Height in px of the built-in logo, used to reserve its width. */
  tinggi?: number
}) {
  if (src !== APP_BAWAAN.logo) {
    // An address that does not load falls back to the built-in logo.
    return (
      <img
        src={src}
        alt={alt}
        className={`${className} shrink-0 object-contain`}
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = APP_BAWAAN.logo
        }}
      />
    )
  }
  const w = besar ? 720 : 240
  const ukuran = tinggi ? { width: Math.round(tinggi * RASIO), height: tinggi } : {}
  return (
    <>
      <img src={`/wordmark-abu-${w}.png`} alt={alt} className={`${className} w-auto shrink-0 dark:hidden`} {...ukuran} />
      <img src={`/wordmark-putih-${w}.png`} alt="" aria-hidden="true" className={`${className} hidden w-auto shrink-0 dark:block`} {...ukuran} />
    </>
  )
}
