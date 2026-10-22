import { APP_BAWAAN } from '@/api/pengaturanUi'

const BAYANGAN = {
  kecil: 'drop-shadow-[0_2px_3px_rgba(20,40,30,0.35)] dark:drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]',
  besar: 'drop-shadow-[0_8px_10px_rgba(20,40,30,0.35)] dark:drop-shadow-[0_8px_10px_rgba(0,0,0,0.8)]',
}

/**
 * The app logo, a round picture with a soft shadow. The built-in logo follows the theme: black in the light theme, white
 * in the dark one. A logo address an admin set in Kelola Aplikasi is shown as it is. `besar` picks the larger file for big
 * places (login), so the picture is always bigger than where it is shown and never gets stretched.
 */
export default function LogoApp({
  src = APP_BAWAAN.logo,
  alt,
  className,
  besar = false,
  bayangan = besar ? 'besar' : 'kecil',
}: {
  src?: string
  alt: string
  className: string
  besar?: boolean
  bayangan?: keyof typeof BAYANGAN
}) {
  const kelas = `${className} shrink-0 rounded-full object-contain ${BAYANGAN[bayangan]}`
  if (src !== APP_BAWAAN.logo) {
    // An address that does not load falls back to the built-in logo.
    return (
      <img
        src={src}
        alt={alt}
        className={kelas}
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = APP_BAWAAN.logo
        }}
      />
    )
  }
  const n = besar ? 512 : 192
  return (
    <>
      <img src={`/logo-hitam-${n}.png`} alt={alt} className={`${kelas} dark:hidden`} />
      <img src={`/logo-putih-${n}.png`} alt="" aria-hidden="true" className={`${kelas} hidden dark:block`} />
    </>
  )
}
