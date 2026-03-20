/**
 * PetBase Tag Taxonomy
 *
 * 10 pet categories with services, products, and attributes for each.
 * Used for search query augmentation and result filtering.
 */

export interface PetTagCategory {
  id: string;
  label: string;
  icon: string;
  services: string[];
  products: string[];
  attributes: string[];
}

export const PET_CATEGORIES: PetTagCategory[] = [
  {
    id: 'dog',
    label: 'Dog',
    icon: 'pets',
    services: [
      'Dog grooming', 'Dog walking', 'Dog training', 'Dog boarding',
      'Dog daycare', 'Dog sitting', 'Puppy training', 'Dog obedience',
      'Dog agility', 'Dog dental cleaning', 'Dog vaccination',
    ],
    products: [
      'Dog food', 'Dog toys', 'Dog treats', 'Dog beds', 'Dog collars',
      'Dog leashes', 'Dog crates', 'Dog supplements', 'Dog shampoo',
    ],
    attributes: ['Puppy', 'Senior dog', 'Large breed', 'Small breed', 'Working dog'],
  },
  {
    id: 'cat',
    label: 'Cat',
    icon: 'emoji_nature',
    services: [
      'Cat grooming', 'Cat boarding', 'Cat sitting', 'Cat dental cleaning',
      'Cat vaccination', 'Cat behavior consultation', 'Cat-only veterinarian',
    ],
    products: [
      'Cat food', 'Cat litter', 'Cat toys', 'Cat trees', 'Cat scratching posts',
      'Cat carriers', 'Cat treats', 'Cat supplements',
    ],
    attributes: ['Kitten', 'Senior cat', 'Indoor cat', 'Outdoor cat'],
  },
  {
    id: 'rabbit',
    label: 'Rabbit',
    icon: 'cruelty_free',
    services: [
      'Rabbit veterinarian', 'Rabbit grooming', 'Rabbit boarding',
      'Rabbit nail trimming', 'Rabbit dental care', 'Exotic pet vet',
    ],
    products: [
      'Rabbit food', 'Rabbit hay', 'Rabbit toys', 'Rabbit cages',
      'Rabbit bedding', 'Rabbit treats',
    ],
    attributes: ['Dwarf rabbit', 'Giant rabbit', 'Baby bunny'],
  },
  {
    id: 'bird',
    label: 'Bird',
    icon: 'flutter',
    services: [
      'Avian veterinarian', 'Bird boarding', 'Bird grooming',
      'Bird wing clipping', 'Bird nail trimming', 'Exotic pet vet',
    ],
    products: [
      'Bird food', 'Bird cages', 'Bird toys', 'Bird perches',
      'Bird seed', 'Bird treats', 'Bird supplements',
    ],
    attributes: ['Parrot', 'Parakeet', 'Cockatiel', 'Finch', 'Canary'],
  },
  {
    id: 'fish',
    label: 'Fish',
    icon: 'water',
    services: [
      'Aquarium maintenance', 'Fish veterinarian', 'Aquarium setup',
      'Fish tank cleaning', 'Pond maintenance',
    ],
    products: [
      'Fish food', 'Aquarium filters', 'Fish tanks', 'Aquarium decorations',
      'Water conditioner', 'Fish medication', 'Aquarium lighting',
    ],
    attributes: ['Freshwater fish', 'Saltwater fish', 'Tropical fish', 'Koi'],
  },
  {
    id: 'reptile',
    label: 'Reptile',
    icon: 'genetics',
    services: [
      'Reptile veterinarian', 'Exotic pet vet', 'Reptile boarding',
      'Reptile habitat setup',
    ],
    products: [
      'Reptile food', 'Reptile terrariums', 'Heat lamps', 'UVB lighting',
      'Reptile substrate', 'Reptile supplements', 'Reptile hides',
    ],
    attributes: ['Snake', 'Lizard', 'Gecko', 'Turtle', 'Tortoise', 'Bearded dragon'],
  },
  {
    id: 'small-animal',
    label: 'Small Animal',
    icon: 'sound_detection_dog_barking',
    services: [
      'Small animal veterinarian', 'Exotic pet vet', 'Small animal boarding',
      'Small animal grooming', 'Small animal nail trimming',
    ],
    products: [
      'Hamster food', 'Guinea pig food', 'Small animal cages', 'Small animal bedding',
      'Exercise wheels', 'Small animal toys', 'Small animal treats',
    ],
    attributes: ['Hamster', 'Guinea pig', 'Gerbil', 'Chinchilla', 'Hedgehog', 'Mouse', 'Rat'],
  },
  {
    id: 'horse',
    label: 'Horse',
    icon: 'jump_to_element',
    services: [
      'Equine veterinarian', 'Horse farrier', 'Horse boarding',
      'Horse training', 'Horse grooming', 'Equine dentistry',
      'Horse transportation',
    ],
    products: [
      'Horse feed', 'Horse tack', 'Horse blankets', 'Horse supplements',
      'Horse grooming supplies', 'Saddles', 'Horse treats',
    ],
    attributes: ['Foal', 'Senior horse', 'Draft horse', 'Pony', 'Miniature horse'],
  },
  {
    id: 'ferret',
    label: 'Ferret',
    icon: 'pest_control',
    services: [
      'Ferret veterinarian', 'Exotic pet vet', 'Ferret boarding',
      'Ferret grooming', 'Ferret nail trimming',
    ],
    products: [
      'Ferret food', 'Ferret cages', 'Ferret toys', 'Ferret bedding',
      'Ferret harnesses', 'Ferret treats', 'Ferret supplements',
    ],
    attributes: ['Baby ferret', 'Senior ferret'],
  },
  {
    id: 'other',
    label: 'Other',
    icon: 'help',
    services: [
      'Exotic pet vet', 'Exotic pet boarding', 'Exotic pet grooming',
      'Wildlife rehabilitation',
    ],
    products: [
      'Exotic pet food', 'Exotic pet enclosures', 'Exotic pet supplies',
    ],
    attributes: ['Sugar glider', 'Hermit crab', 'Tarantula', 'Axolotl'],
  },
];

/** Flattened array of all tags across all categories */
export const ALL_PET_TAGS: string[] = PET_CATEGORIES.flatMap(
  c => [...c.services, ...c.products, ...c.attributes]
);

/** Maps a tag string to its category id, e.g. 'Dog grooming' → 'dog' */
export const TAG_TO_CATEGORY: Map<string, string> = new Map(
  PET_CATEGORIES.flatMap(c =>
    [...c.services, ...c.products, ...c.attributes].map(tag => [tag, c.id] as const)
  )
);
