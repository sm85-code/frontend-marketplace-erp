/** The Arus Kas row names a party is linked to: several may be given, separated by ';'. */
export const barisTujuan = (teks: string): string[] => (teks ?? '').split(';').map((x) => x.trim()).filter(Boolean)

/** Saved as the only link: the party's entries are not put in any Arus Kas row. */
export const TIDAK_DISAMBUNG = '-'
