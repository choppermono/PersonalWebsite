// Single source of truth for everything the page renders.
// Add an entry to accessPoints and it shows up in the list — no template edits.

export const identity = {
  handle: 'Halldor Personal',
  operator: 'Halldor Andri Omarsson',
  // Decorative system readouts. Nothing here is real data.
  designation: 'UNIT 0-H',
  build: 'v2.0',
}

// icon     — a name from components/NodeIcon.vue
// vignette — optional, a name from components/NodeVignette.vue. Marks a featured row.
// effect   — optional, 'decrypt' scrambles the label into place on hover and focus
export const accessPoints = [
  {
    id: 'nier',
    label: 'NieR Hack Game',
    desc: 'Hacking minigame — cores shoot back',
    url: 'https://nier.halldor.ch',
    host: 'nier.halldor.ch',
    kind: 'GAME',
    icon: 'hack',
    vignette: 'hack',
    effect: 'decrypt',
    external: true,
  },
  {
    id: 'trackify',
    label: 'Trackify',
    desc: 'Fitness and health tracker',
    url: 'https://florian.halldor.ch',
    host: 'florian.halldor.ch',
    kind: 'APP',
    icon: 'dumbbell',
    vignette: 'pulse',
    external: true,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    desc: 'Photos and everything unfiltered',
    url: 'https://www.instagram.com/halldor0',
    host: '@halldor0',
    kind: 'SOCIAL',
    icon: 'instagram',
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
    external: false,
  },
]
