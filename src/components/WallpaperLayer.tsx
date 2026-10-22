import { AuroraBackground } from '@/components/magicui/aurora-background'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { Ripple } from '@/components/magicui/ripple'
import { useTheme } from '@/lib/theme'

/** Fixed decorative layer behind shell content, driven by Appearance wallpaper. */
export default function WallpaperLayer() {
  const { wallpaper } = useTheme()
  if (wallpaper === 'none') return null
  const legacy = wallpaper === 'dots' || wallpaper === 'glow' || wallpaper === 'aurora'
  return (
    <div className={legacy ? 'wallpaper-layer opacity-25' : 'wallpaper-layer'} aria-hidden="true">
      {wallpaper === 'dots' && <DotPattern />}
      {wallpaper === 'glow' && <Ripple />}
      {wallpaper === 'aurora' && <AuroraBackground />}
      {!legacy && <div className={`wallpaper-css wallpaper-${wallpaper}`} data-testid={`wallpaper-${wallpaper}`} />}
    </div>
  )
}
