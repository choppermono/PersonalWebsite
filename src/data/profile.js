// Single source of truth for everything the page renders.
// Add an entry to accessPoints and it shows up in the list — no template edits.

export const identity = {
  handle: 'HALLDOR HUB',
  operator: 'Halldor Andri Omarsson',
  // Decorative system readouts. Nothing here is real data.
  designation: 'UNIT 0-H',
  build: 'v2.0',
}

// icon must be one of the names defined in components/NodeIcon.vue
export const accessPoints = [
  {
    id: 'florian',
    label: 'Florian Halldor',
    desc: 'Current project workspace',
    url: 'https://florian.halldor.ch',
    host: 'florian.halldor.ch',
    kind: 'PROJECT',
    icon: 'globe',
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
