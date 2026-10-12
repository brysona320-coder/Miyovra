// Illustrative patterns, not sky coordinates or a live observing chart.
export const SKY_OBJECTS = [
  {
    id: "orion", name: "Orion", kind: "Constellation", subtitle: "Follow the three-star belt.",
    description: "Three bright stars mark Orion’s belt. Below them, the sword contains the Orion Nebula: a cloud where new stars are forming. The pattern is a view from Earth; its stars are spread through three-dimensional space.",
    fact: "Look for: the belt and the sword", category: "A familiar star pattern", palette: "orion",
    source: "https://science.nasa.gov/universe/stories/quick-reads/discovering-the-universe-through-the-constellation-orion/",
    position: [23, 58],
    points: [[.26,.08],[.8,.16],[.72,.49],[.49,.52],[.28,.55],[.1,.95],[.88,.87]],
    lines: [[0,1],[0,4],[1,2],[4,3],[3,2],[4,5],[2,6],[5,6]],
  },
  {
    id: "cassiopeia", name: "Cassiopeia", kind: "Constellation", subtitle: "A signature written in stars.",
    description: "Five bright stars trace the recognizable W of Cassiopeia. Named for a queen in Greek mythology, this northern constellation sits against a rich Milky Way background of stars and clouds of dust.",
    fact: "Look for: the five-star W", category: "The celestial queen", palette: "helix",
    source: "https://science.nasa.gov/photojournal/a-royal-celebration/",
    position: [46, 20],
    points: [[.05,.25],[.24,.78],[.51,.3],[.73,.82],[.97,.1]],
    lines: [[0,1],[1,2],[2,3],[3,4]],
  },
  {
    id: "cygnus", name: "Cygnus", kind: "Constellation", subtitle: "A swan crossing the Milky Way.",
    description: "Cygnus contains the Northern Cross star pattern. Bright Deneb marks the swan’s tail, with Albireo at the other end. The constellation lies along the Milky Way, a region filled with stars and dark dust clouds.",
    fact: "Look for: the Northern Cross", category: "The celestial swan", palette: "orion",
    source: "https://www.jpl.nasa.gov/videos/whats-up-august-2022/",
    position: [73, 36],
    points: [[.48,.06],[.5,.43],[.12,.35],[.91,.57],[.57,.91]],
    lines: [[0,1],[1,2],[1,3],[1,4]],
  },
  {
    id: "lyra", name: "Lyra", kind: "Constellation", subtitle: "Find the light of Vega.",
    description: "Lyra is home to Vega, one of the three stars that make the Summer Triangle. The other two are Altair in Aquila and Deneb in Cygnus. That triangle connects three constellations; it is a star pattern called an asterism.",
    fact: "Look for: Vega", category: "A corner of the Summer Triangle", palette: "crab",
    source: "https://science.nasa.gov/solar-system/skywatching/night-sky-network/summer-triangle-corner-vega/",
    position: [77, 76],
    points: [[.2,.12],[.37,.4],[.79,.38],[.66,.84],[.2,.8]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,1]],
  },
  {
    id: "orion-nebula", name: "Orion Nebula", kind: "Nebula", subtitle: "A nursery for new worlds.",
    description: "The Orion Nebula is a vast cloud of gas and dust where stars are forming. It sits in Orion’s sword, below the belt. Telescopes reveal a much richer scene than the faint glow our eyes can see.",
    fact: "Catalog: Messier 42 / M42", category: "Star-forming cloud", palette: "orion",
    source: "https://science.nasa.gov/solar-system/skywatching/night-sky-network/a-flame-in-the-sky-the-orion-nebula/",
    position: [34, 83],
  },
  {
    id: "crab-nebula", name: "Crab Nebula", kind: "Nebula", subtitle: "An explosion with an afterlife.",
    description: "The Crab Nebula is the remnant of a supernova recorded in 1054. At its center is a pulsar: a rapidly spinning neutron star. Its gas and filaments are part of the aftermath of that stellar explosion.",
    fact: "Catalog: Messier 1 / M1", category: "Supernova remnant", palette: "crab",
    source: "https://science.nasa.gov/missions/hubble/the-crab-nebula/",
    position: [15, 22],
  },
  {
    id: "helix-nebula", name: "Helix Nebula", kind: "Nebula", subtitle: "The last breath of a star.",
    description: "The Helix is a planetary nebula: gas expelled by a dying Sun-like star. Despite the name, this kind of nebula has nothing to do with planets. Its glowing layers record a late chapter in a star’s life.",
    fact: "A glowing envelope of expelled gas", category: "Planetary nebula", palette: "helix",
    source: "https://science.nasa.gov/asset/hubble/the-helix-nebula-a-gaseous-envelope-expelled-by-a-dying-star/",
    position: [54, 76],
  },
];

export function skyObject(id) {
  return SKY_OBJECTS.find((object) => object.id === id) || SKY_OBJECTS[0];
}

export function starCount(width, height) {
  return Math.min(260, Math.max(65, Math.round(width * height / 7000)));
}

export function canvasScale(width, height, pixelRatio = 1) {
  return Math.min(Math.max(1, pixelRatio || 1), 1.5, Math.sqrt(3_000_000 / Math.max(1, width * height)));
}

export function makeStars(width, height, random = Math.random) {
  return Array.from({ length: starCount(width, height) }, () => ({
    x: random(), y: random(), radius: .4 + random() * 1.3,
    opacity: .16 + random() * .66, phase: random() * Math.PI * 2,
    depth: .2 + random() * .8,
  }));
}

export function makeMeteor(random = Math.random) {
  return { x: random() * 1.15 - .15, y: random() * .55 - .1,
    age: 0, lifetime: .85 + random() * .8, length: 70 + random() * 100,
    speed: 320 + random() * 240 };
}

export function motionAllowed({ paused, reduced, hidden, watching }) {
  return !paused && !reduced && !hidden && !watching;
}
