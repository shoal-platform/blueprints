export type Breed = {
  slug: string;
  name: string;
  origin: string;
  height: string;
  temperament: string;
  summary: string;
  details: string[];
};

export const breeds: Breed[] = [
  {
    slug: "arabian",
    name: "Arabian",
    origin: "Arabian Peninsula",
    height: "14.1–15.1 hands",
    temperament: "Spirited, intelligent",
    summary:
      "One of the oldest horse breeds, prized for endurance and a distinctive dished face.",
    details: [
      "Recognisable by a high tail carriage and refined, wedge-shaped head.",
      "Excel at endurance riding thanks to exceptional stamina.",
      "Have influenced most modern light horse breeds.",
    ],
  },
  {
    slug: "clydesdale",
    name: "Clydesdale",
    origin: "Scotland",
    height: "16–18 hands",
    temperament: "Gentle, calm",
    summary:
      "A powerful draft breed famous for feathered legs and a steady disposition.",
    details: [
      "Originally bred for heavy farm and haulage work.",
      "Known for the long white hair (feathering) on their lower legs.",
      "Despite their size they are docile and easy to handle.",
    ],
  },
  {
    slug: "mustang",
    name: "Mustang",
    origin: "North America",
    height: "14–15 hands",
    temperament: "Hardy, independent",
    summary:
      "Free-roaming horses descended from animals brought to the Americas by the Spanish.",
    details: [
      "Live in wild herds across the western United States.",
      "Tough and sure-footed from surviving harsh terrain.",
      "Once tamed, they make resilient and loyal riding horses.",
    ],
  },
  {
    slug: "shetland-pony",
    name: "Shetland Pony",
    origin: "Shetland Isles, Scotland",
    height: "Up to 11.2 hands",
    temperament: "Clever, sometimes stubborn",
    summary:
      "A small but remarkably strong pony, popular with children and as a working animal.",
    details: [
      "Pound for pound one of the strongest horse breeds.",
      "Thick coat keeps them warm in cold, wet climates.",
      "Long-lived and intelligent, with a famously cheeky streak.",
    ],
  },
];

export function getBreed(slug: string) {
  return breeds.find((b) => b.slug === slug);
}
