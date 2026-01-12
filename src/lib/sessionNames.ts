// Nonsensical word combination generator for session names
// Inspired by Brian Eno's Oblique Strategies and generative naming conventions

const adjectives = [
  // textures
  'velvet', 'granular', 'crystalline', 'molten', 'vapor', 'silk', 'rust', 'foam',
  'liquid', 'frozen', 'hollow', 'dense', 'porous', 'elastic', 'brittle', 'plush',
  // states
  'dormant', 'volatile', 'static', 'orbital', 'parallel', 'inverse', 'residual',
  'phantom', 'latent', 'ambient', 'transient', 'perpetual', 'suspended', 'drifting',
  // colors (abstract)
  'ochre', 'indigo', 'chrome', 'obsidian', 'alabaster', 'cerulean', 'vermillion',
  // qualities
  'oblique', 'refracted', 'diffused', 'muted', 'radiant', 'subdued', 'lucid',
  'opaque', 'translucent', 'iridescent', 'spectral', 'flickering', 'pulsing',
  // invented/abstract
  'nth', 'quasi', 'proto', 'meta', 'ultra', 'sub', 'neo', 'anti', 'pan'
]

const nouns = [
  // abstract objects
  'lattice', 'vector', 'membrane', 'prism', 'axis', 'circuit', 'void', 'grid',
  'vertex', 'node', 'cluster', 'sequence', 'array', 'matrix', 'field', 'zone',
  // natural phenomena
  'aurora', 'glacier', 'sediment', 'ember', 'spore', 'pollen', 'tide', 'current',
  'strata', 'vapor', 'mineral', 'crystal', 'fossil', 'bloom', 'moss', 'lichen',
  // sounds/music
  'drone', 'pulse', 'tone', 'hum', 'static', 'echo', 'reverb', 'signal', 'wave',
  'frequency', 'resonance', 'harmonic', 'overtone', 'timbre', 'grain', 'noise',
  // invented/abstract
  'thing', 'form', 'mass', 'unit', 'instance', 'artifact', 'construct', 'entity',
  'specimen', 'fragment', 'remnant', 'trace', 'residue', 'imprint', 'shadow'
]

const suffixes = [
  // numbering systems
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  // versions
  'A', 'B', 'C', 'alpha', 'beta', 'gamma', 'delta', 'omega',
  // modifiers
  '(rev)', '(alt)', '(var)', '(ext)', '(mix)', '(edit)', '(dub)',
  // none
  '', '', '', '', '', '', '', '', '', ''  // weighted towards no suffix
]

function pick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

export function generateSessionName(): string {
  const adj = pick(adjectives)
  const noun = pick(nouns)
  const suffix = pick(suffixes)

  const base = `${adj} ${noun}`
  return suffix ? `${base} ${suffix}` : base
}

// Generate multiple options for the user to choose from
export function generateSessionNameOptions(count = 5): string[] {
  const names = new Set<string>()
  while (names.size < count) {
    names.add(generateSessionName())
  }
  return Array.from(names)
}
