/**
 * Single source of truth for the dietary preference and allergy chip
 * options used by both the public RSVP form (rsvp.ts) and the admin
 * guest-edit form (guest-form.ts). Both forms write into the same
 * Firestore `dietaryPreferences` and `allergies` string[] fields, so
 * the option lists must agree — otherwise a guest's RSVP selection
 * (e.g. "Children's Meal") wouldn't be representable on the admin side
 * and vice-versa.
 *
 * Each entry pairs the stored value with an ngx-translate key. Both
 * forms display via the translate pipe; keys live in
 * src/assets/i18n/{en,es}.json under the RSVP namespace.
 */
export interface DietaryChipOption {
  value: string;
  labelKey: string;
}

export const DIETARY_OPTIONS: readonly DietaryChipOption[] = [
  { value: 'Vegetarian', labelKey: 'RSVP.DIETARY_VEGETARIAN' },
  { value: 'Vegan', labelKey: 'RSVP.DIETARY_VEGAN' },
  { value: 'Pescatarian', labelKey: 'RSVP.DIETARY_PESCATARIAN' },
  { value: "Children's Meal", labelKey: 'RSVP.DIETARY_CHILDRENS' }
];

export const ALLERGY_OPTIONS: readonly DietaryChipOption[] = [
  { value: 'Nuts', labelKey: 'RSVP.ALLERGY_NUTS' },
  { value: 'Shellfish', labelKey: 'RSVP.ALLERGY_SHELLFISH' },
  { value: 'Eggs', labelKey: 'RSVP.ALLERGY_EGGS' },
  { value: 'Gluten Free', labelKey: 'RSVP.ALLERGY_GLUTEN_FREE' },
  { value: 'Dairy Free', labelKey: 'RSVP.ALLERGY_DAIRY_FREE' }
];