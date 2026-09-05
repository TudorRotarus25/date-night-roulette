export type Cuisine = {
  slug: string;
  label: string;
  emoji: string;
};

export const CUISINES: Cuisine[] = [
  { slug: "italian", label: "Italian", emoji: "🍝" },
  { slug: "pizza", label: "Pizza", emoji: "🍕" },
  { slug: "japanese", label: "Japanese", emoji: "🍣" },
  { slug: "ramen", label: "Ramen", emoji: "🍜" },
  { slug: "chinese", label: "Chinese", emoji: "🥟" },
  { slug: "korean", label: "Korean", emoji: "🍚" },
  { slug: "thai", label: "Thai", emoji: "🍤" },
  { slug: "vietnamese", label: "Vietnamese", emoji: "🍲" },
  { slug: "indian", label: "Indian", emoji: "🍛" },
  { slug: "nepalese", label: "Nepalese", emoji: "🏔️" },
  { slug: "mexican", label: "Mexican", emoji: "🌮" },
  { slug: "venezuelan", label: "Venezuelan", emoji: "🌽" },
  { slug: "ecuadorian", label: "Ecuadorian", emoji: "🦐" },
  { slug: "spanish", label: "Spanish", emoji: "🥘" },
  { slug: "catalan", label: "Catalan", emoji: "🍅" },
  { slug: "french", label: "French", emoji: "🥐" },
  { slug: "greek", label: "Greek", emoji: "🥙" },
  { slug: "lebanese", label: "Lebanese", emoji: "🫓" },
  { slug: "middle_eastern", label: "Middle Eastern", emoji: "🧆" },
  { slug: "turkish", label: "Turkish", emoji: "🍢" },
  { slug: "seafood", label: "Seafood", emoji: "🐟" },
  { slug: "steak", label: "Steak", emoji: "🥩" },
  { slug: "barbecue", label: "Barbecue", emoji: "🍖" },
  { slug: "burgers", label: "Burgers", emoji: "🍔" },
  { slug: "vegetarian", label: "Vegetarian", emoji: "🥗" },
  { slug: "portuguese", label: "Portuguese", emoji: "🦞" },
  { slug: "german", label: "German", emoji: "🥨" },
  { slug: "romanian", label: "Romanian", emoji: "🥧" },
  { slug: "brunch", label: "Brunch / Café", emoji: "☕" },
  { slug: "dessert", label: "Dessert", emoji: "🍮" },
  { slug: "fusion", label: "Fusion / Other", emoji: "🍽️" },
];

export const UNKNOWN_CUISINE: Cuisine = {
  slug: "unknown",
  label: "Needs a cuisine",
  emoji: "❓",
};

export function cuisineFor(slug: string): Cuisine {
  return CUISINES.find((c) => c.slug === slug) ?? UNKNOWN_CUISINE;
}
