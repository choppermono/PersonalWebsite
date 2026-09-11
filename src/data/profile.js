// Single source of truth for everything the page renders.
// Add an entry to accessPoints and it shows up in the list — no template edits.

export const identity = {
  handle: 'Halldor Personal',
  operator: 'Halldor Andri Omarsson',
  // Decorative system readouts. Nothing here is real data.
  designation: 'UNIT 0-H',
  build: 'v4.0',
}

// The sections the page scrolls through, in order. The nav is built from this.
export const sections = [
  { id: 'projects', index: '01', label: 'Projects' },
  { id: 'operator', index: '02', label: 'Operator' },
  { id: 'contact', index: '03', label: 'Contact' },
]

// icon    — a name from components/NodeIcon.vue (the chip and the no-WebGL fallback)
// holo    — the hologram on the terminal's screen: a key of `views` in three/holo/index.js
// cta     — what the terminal says it will do
// feature — present: a large block in 01 Projects. Absent: a channel in 03 Contact.
export const accessPoints = [
  {
    id: 'nier',
    label: 'NieR Hack Game',
    desc: 'Hacking minigame — cores shoot back',
    url: 'https://nier.halldor.ch',
    host: 'nier.halldor.ch',
    kind: 'GAME',
    icon: 'hack',
    holo: 'hack',
    cta: 'Launch game',
    external: true,
    feature: {
      blurb:
        'The hacking minigame from NieR: Automata, rebuilt for the browser. Twin-stick on touch, waves of enemies that hunt you down, and cores that shoot back.',
      facts: [
        ['05', 'Levels'],
        ['04', 'Enemy types'],
        ['06', 'Fire patterns'],
      ],
      stack: ['Vue 3', 'Canvas 2D', 'Vite'],
    },
  },
  {
    id: 'trackify',
    label: 'Trackify',
    desc: 'Fitness and health tracker',
    url: 'https://florian.halldor.ch',
    host: 'florian.halldor.ch',
    kind: 'APP',
    icon: 'dumbbell',
    holo: 'pulse',
    cta: 'Open app',
    external: true,
    feature: {
      blurb:
        'A fitness and health tracker for training and everyday numbers. A school project in module IPT 4.1, built by a team of two.',
      facts: [
        ['02', 'Developers'],
        ['4.1', 'IPT module'],
        ['Live', 'Status'],
      ],
      stack: ['Vue 3', 'Vue Router', 'Vite'],
    },
  },
  {
    id: 'instagram',
    label: 'Instagram',
    desc: 'Photos and everything unfiltered',
    url: 'https://www.instagram.com/halldor0',
    host: '@halldor0',
    kind: 'SOCIAL',
    icon: 'instagram',
    holo: 'lens',
    cta: 'View profile',
    external: true,
  },
  {
    id: 'email',
    label: 'Email',
    desc: 'Direct line — best for anything serious',
    url: 'mailto:halldorandri.omarsson@gmail.com',
    host: 'halldorandri.omarsson@gmail.com',
    kind: 'CONTACT',
    icon: 'mail',
    holo: 'mail',
    cta: 'Write mail',
    external: false,
  },
]
