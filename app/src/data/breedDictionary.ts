/**
 * Breed Intelligence Dictionary — maps breeds and medical conditions to
 * search-relevant keywords for the Pet-Aware Service Orchestrator.
 *
 * Layer 2: breed → size, care keywords, common health concerns
 * Layer 3: medical condition → specialist keywords
 */

export interface BreedProfile {
  size: 'small' | 'medium' | 'large' | 'giant';
  keywords: string[];
  healthConcerns: string[];
}

/** Breed → search augmentation data. Covers common breeds; unlisted breeds use species defaults. */
export const BREED_PROFILES: Record<string, BreedProfile> = {
  // Dogs — Large/Giant
  'German Shepherd': { size: 'large', keywords: ['large dog', 'working breed'], healthConcerns: ['hip dysplasia', 'degenerative myelopathy'] },
  'Golden Retriever': { size: 'large', keywords: ['large dog', 'sporting breed'], healthConcerns: ['hip dysplasia', 'cancer', 'heart disease'] },
  'Labrador Retriever': { size: 'large', keywords: ['large dog', 'sporting breed'], healthConcerns: ['hip dysplasia', 'obesity'] },
  'Great Dane': { size: 'giant', keywords: ['giant breed', 'extra large dog'], healthConcerns: ['bloat', 'cardiomyopathy', 'hip dysplasia'] },
  'Rottweiler': { size: 'large', keywords: ['large dog', 'working breed'], healthConcerns: ['hip dysplasia', 'cancer'] },
  'Husky': { size: 'large', keywords: ['large dog', 'sled dog'], healthConcerns: ['eye disorders', 'hip dysplasia'] },
  'Siberian Husky': { size: 'large', keywords: ['large dog', 'sled dog'], healthConcerns: ['eye disorders', 'hip dysplasia'] },
  'Boxer': { size: 'large', keywords: ['large dog', 'working breed'], healthConcerns: ['cancer', 'heart disease'] },
  'Doberman': { size: 'large', keywords: ['large dog', 'working breed'], healthConcerns: ['cardiomyopathy', 'von Willebrand disease'] },
  'Saint Bernard': { size: 'giant', keywords: ['giant breed', 'extra large dog'], healthConcerns: ['bloat', 'hip dysplasia'] },
  'Bernese Mountain Dog': { size: 'giant', keywords: ['giant breed', 'mountain dog'], healthConcerns: ['cancer', 'hip dysplasia'] },

  // Dogs — Medium
  'Bulldog': { size: 'medium', keywords: ['medium dog', 'brachycephalic'], healthConcerns: ['breathing issues', 'skin allergies', 'hip dysplasia'] },
  'French Bulldog': { size: 'small', keywords: ['small dog', 'brachycephalic'], healthConcerns: ['breathing issues', 'spinal disorders', 'allergies'] },
  'Beagle': { size: 'medium', keywords: ['medium dog', 'hound'], healthConcerns: ['epilepsy', 'hypothyroidism'] },
  'Poodle': { size: 'medium', keywords: ['medium dog', 'hypoallergenic'], healthConcerns: ['eye disorders', 'hip dysplasia'] },
  'Australian Shepherd': { size: 'medium', keywords: ['medium dog', 'herding breed'], healthConcerns: ['eye disorders', 'hip dysplasia'] },
  'Border Collie': { size: 'medium', keywords: ['medium dog', 'herding breed'], healthConcerns: ['hip dysplasia', 'epilepsy'] },
  'Cocker Spaniel': { size: 'medium', keywords: ['medium dog', 'sporting breed'], healthConcerns: ['ear infections', 'eye disorders'] },

  // Dogs — Small
  'Chihuahua': { size: 'small', keywords: ['small dog', 'toy breed'], healthConcerns: ['dental disease', 'heart disease', 'patellar luxation'] },
  'Yorkshire Terrier': { size: 'small', keywords: ['small dog', 'toy breed'], healthConcerns: ['dental disease', 'liver shunt'] },
  'Dachshund': { size: 'small', keywords: ['small dog'], healthConcerns: ['intervertebral disc disease', 'back problems'] },
  'Shih Tzu': { size: 'small', keywords: ['small dog', 'brachycephalic'], healthConcerns: ['breathing issues', 'eye disorders'] },
  'Pomeranian': { size: 'small', keywords: ['small dog', 'toy breed'], healthConcerns: ['dental disease', 'patellar luxation'] },
  'Maltese': { size: 'small', keywords: ['small dog', 'hypoallergenic'], healthConcerns: ['dental disease', 'liver shunt'] },

  // Cats
  'Persian': { size: 'medium', keywords: ['long hair cat', 'brachycephalic cat'], healthConcerns: ['breathing issues', 'kidney disease'] },
  'Siamese': { size: 'medium', keywords: ['cat'], healthConcerns: ['respiratory infections', 'dental disease'] },
  'Maine Coon': { size: 'large', keywords: ['large cat'], healthConcerns: ['hip dysplasia', 'cardiomyopathy'] },
  'Bengal': { size: 'medium', keywords: ['active cat'], healthConcerns: ['heart disease'] },
  'Ragdoll': { size: 'large', keywords: ['large cat', 'long hair cat'], healthConcerns: ['cardiomyopathy', 'bladder stones'] },
  'British Shorthair': { size: 'medium', keywords: ['cat'], healthConcerns: ['cardiomyopathy', 'obesity'] },
  'Sphynx': { size: 'medium', keywords: ['hairless cat'], healthConcerns: ['skin conditions', 'cardiomyopathy'] },
};

/** Medical condition → specialist search keywords for Layer 3. */
export const MEDICAL_AUGMENTS: Record<string, string[]> = {
  'hip dysplasia': ['veterinary orthopedic', 'orthopedic vet'],
  'cancer': ['veterinary oncologist', 'animal cancer specialist'],
  'heart disease': ['veterinary cardiologist', 'animal cardiology'],
  'cardiomyopathy': ['veterinary cardiologist', 'animal cardiology'],
  'eye disorders': ['veterinary ophthalmologist', 'animal eye specialist'],
  'epilepsy': ['veterinary neurologist', 'animal neurology'],
  'diabetes': ['veterinary endocrinologist', 'animal diabetes specialist'],
  'kidney disease': ['veterinary nephrologist', 'animal kidney specialist'],
  'allergies': ['veterinary dermatologist', 'animal allergy specialist'],
  'skin allergies': ['veterinary dermatologist', 'animal skin specialist'],
  'skin conditions': ['veterinary dermatologist'],
  'dental disease': ['veterinary dentist', 'animal dental care'],
  'breathing issues': ['veterinary respiratory', 'brachycephalic specialist'],
  'back problems': ['veterinary orthopedic', 'animal spine specialist'],
  'intervertebral disc disease': ['veterinary neurologist', 'IVDD specialist'],
  'bloat': ['emergency veterinary', '24 hour vet'],
  'spinal disorders': ['veterinary neurologist'],
  'obesity': ['veterinary nutritionist', 'weight management vet'],
};

/**
 * Get breed profile with fallback to species-level defaults.
 */
export function getBreedProfile(breed: string, species?: string): BreedProfile | null {
  if (BREED_PROFILES[breed]) return BREED_PROFILES[breed];

  // Fuzzy match: try case-insensitive partial match
  const breedLower = breed.toLowerCase();
  for (const [key, profile] of Object.entries(BREED_PROFILES)) {
    if (key.toLowerCase() === breedLower) return profile;
    if (breedLower.includes(key.toLowerCase()) || key.toLowerCase().includes(breedLower)) return profile;
  }

  // Species-level defaults
  if (species?.toLowerCase() === 'dog') return { size: 'medium', keywords: ['dog'], healthConcerns: [] };
  if (species?.toLowerCase() === 'cat') return { size: 'medium', keywords: ['cat'], healthConcerns: [] };

  return null;
}

/**
 * Get specialist search terms for a list of medical conditions.
 */
export function getMedicalAugments(conditions: string[]): string[] {
  const augments = new Set<string>();
  for (const condition of conditions) {
    const condLower = condition.toLowerCase();
    for (const [key, terms] of Object.entries(MEDICAL_AUGMENTS)) {
      if (condLower.includes(key) || key.includes(condLower)) {
        terms.forEach(t => augments.add(t));
      }
    }
  }
  return [...augments];
}
