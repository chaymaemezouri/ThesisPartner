const TEMP_PORTRAITS: Record<string, string> = {
  'amina benjelloun': '/tmp-avatars/amina-benjelloun.jpg',
  'anas el ouazzani': '/tmp-avatars/anas-el-ouazzani.jpg',
  'fatima-zahra alaoui': '/tmp-avatars/fatima-zahra-alaoui.jpg',
  'hamza tazi': '/tmp-avatars/hamza-tazi.jpg',
  'imane berrada': '/tmp-avatars/imane-berrada.jpg',
  'khadija amrani': '/tmp-avatars/khadija-amrani.jpg',
  'mehdi bennani': '/tmp-avatars/mehdi-bennani.jpg',
  'omar idrissi': '/tmp-avatars/omar-idrissi.jpg',
  'salma cherkaoui': '/tmp-avatars/salma-cherkaoui.jpg',
  'yassine el fassi': '/tmp-avatars/yassine-el-fassi.jpg',
  'youssef el amrani': '/tmp-avatars/youssef-el-amrani.jpg',
};

/** Prefer relative /tmp-avatars paths so demo portraits survive APP_URL / Vite port changes. */
function normalizeAvatarUrl(avatarUrl: string): string {
  try {
    const url = new URL(avatarUrl, 'http://localhost');
    if (url.pathname.startsWith('/tmp-avatars/')) return url.pathname;
  } catch {
    /* Keep the original string when it is not a valid URL. */
  }
  return avatarUrl;
}

export function portraitUrl(name: string, avatarUrl: string | null | undefined): string | null {
  if (avatarUrl) return normalizeAvatarUrl(avatarUrl);
  return TEMP_PORTRAITS[name.trim().toLocaleLowerCase('fr')] ?? null;
}
