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

export function portraitUrl(name: string, avatarUrl: string | null | undefined): string | null {
  if (avatarUrl) return avatarUrl;
  return TEMP_PORTRAITS[name.trim().toLocaleLowerCase('fr')] ?? null;
}
