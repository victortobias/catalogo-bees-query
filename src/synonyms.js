export const PACK_SYNONYMS = {
  cx: 'caixa',
  cxa: 'caixa',
  caixa: 'caixa',
  dz: 'duzia',
  duzia: 'duzia',
  un: 'unidade',
  unid: 'unidade',
  unidade: 'unidade',
  fd: 'fardo',
  fardo: 'fardo'
};

export const DEFAULTS = {
  latao_ml: 473,
  long_neck_ml: 355
};

export const ALIASES = [
  {
    name: 'latao',
    patterns: ['latao', 'lata grande', 'latao grande'],
    sizeMl: DEFAULTS.latao_ml
  },
  {
    name: 'long neck',
    patterns: ['long neck', 'longneck', 'long-neck'],
    sizeMl: DEFAULTS.long_neck_ml
  }
];

export const BRANDS = ['brahma', 'skol', 'spaten', 'heineken', 'beck', 'budweiser', 'antarctica'];

export function canonicalPackFromCode(packName) {
  if (!packName) return null;
  const normalized = packName.toLowerCase();
  const cleaned = normalized.replace(/[^a-z0-9]/g, '');
  return PACK_SYNONYMS[normalized] || PACK_SYNONYMS[cleaned] || normalized;
}
