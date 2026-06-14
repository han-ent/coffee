import type { CoffeeProduct } from '../domain';

export type CatalogConfidence = 'official-exact' | 'official-range' | 'third-party-estimate';
export type DoseGroup = 'decaf' | 'low' | 'standard' | 'high' | 'half-caf';

export interface CatalogItem extends CoffeeProduct {
  brand: 'Nespresso' | 'Starbucks' | 'Keurig' | 'NESCAFÉ Dolce Gusto';
  system: 'Vertuo' | 'Original' | 'K-Cup' | 'Dolce Gusto';
  sizeLabel: string;
  doseGroup: DoseGroup;
  confidence: CatalogConfidence;
  marketNote: string;
}

const nespressoRangeNote =
  'Nespresso public FAQ/health pages describe caffeine by line and cup-size ranges; exact capsule values can vary by market and batch.';
const nespressoVertuoPageNote =
  'Nespresso US Vertuo listing confirms current product availability examples including Melozio Decaffeinato and Half Caffeinato.';
const nespressoOriginalPageNote =
  'Nespresso US Original listing confirms current Original capsule availability examples including Volluto Decaffeinato and Ristretto Italiano Decaffeinato.';
const keurigRangeNote =
  'Keurig support states most K-Cup coffee contains about 75-150 mg caffeine per 8 oz cup; decaf is much lower and product values vary.';
const starbucksKcupNote =
  'Starbucks at Home K-Cup pages provide current product family names; caffeine values use the Keurig/Starbucks published average planning range.';
const dolceGustoNote =
  'Dolce Gusto product pages confirm the capsule system; caffeine values are third-party planning estimates and should be overridden when package data is available.';

export const CURATED_COFFEE_CATALOG: CatalogItem[] = [
  // Nespresso Vertuo — official size ranges plus a few product-specific public notes.
  item('nespresso-vertuo-melozio-boost', 'Melozio Boost', 'Nespresso', 'Vertuo', 'Mug', 230, 200, [180, 200], 'high', 'official-exact', 'Nespresso USA product page states approximately 200 mg caffeine per mug, 180 mg minimum; regular Melozio is approximately 170 mg.'),
  item('nespresso-vertuo-melozio', 'Melozio', 'Nespresso', 'Vertuo', 'Mug', 230, 170, [130, 200], 'high', 'official-range', `${nespressoRangeNote} Seed uses the regular Melozio value referenced on the Melozio Boost product page.`),
  item('nespresso-vertuo-stormio', 'Stormio', 'Nespresso', 'Vertuo', 'Mug', 230, 170, [130, 200], 'high', 'official-range', nespressoRangeNote),
  item('nespresso-vertuo-odacio', 'Odacio', 'Nespresso', 'Vertuo', 'Mug', 230, 170, [130, 200], 'high', 'official-range', nespressoRangeNote),
  item('nespresso-vertuo-intenso', 'Intenso', 'Nespresso', 'Vertuo', 'Mug', 230, 195, [130, 200], 'high', 'official-range', nespressoRangeNote),
  item('nespresso-vertuo-half-caffeinato', 'Half Caffeinato', 'Nespresso', 'Vertuo', 'Mug', 230, 90, [80, 100], 'half-caf', 'official-range', `${nespressoRangeNote} Nespresso FAQ pages identify Half Caffeinato as an exception around 90 mg per mug. ${nespressoVertuoPageNote}`),
  item('nespresso-vertuo-melozio-decaffeinato', 'Melozio Decaffeinato', 'Nespresso', 'Vertuo', 'Mug', 230, 4, [2, 7], 'decaf', 'official-range', `${nespressoRangeNote} Decaffeinated Nespresso capsules are commonly described around 2-4 mg; use manual override for package-specific values. ${nespressoVertuoPageNote}`),
  item('nespresso-vertuo-altissio', 'Altissio', 'Nespresso', 'Vertuo', 'Espresso', 40, 75, [60, 150], 'standard', 'official-range', nespressoRangeNote),
  item('nespresso-vertuo-diavolitto', 'Diavolitto', 'Nespresso', 'Vertuo', 'Espresso', 40, 145, [60, 150], 'high', 'official-range', nespressoRangeNote),
  item('nespresso-vertuo-double-espresso-dolce', 'Double Espresso Dolce', 'Nespresso', 'Vertuo', 'Double Espresso', 80, 130, [130, 160], 'standard', 'official-range', nespressoRangeNote),
  item('nespresso-vertuo-double-espresso-scuro', 'Double Espresso Scuro', 'Nespresso', 'Vertuo', 'Double Espresso', 80, 150, [130, 160], 'high', 'official-range', nespressoRangeNote),
  item('nespresso-vertuo-fortado', 'Fortado', 'Nespresso', 'Vertuo', 'Gran Lungo', 150, 160, [120, 200], 'high', 'official-range', nespressoRangeNote),

  // Nespresso Original — official range groups, product list from current Nespresso US Original page.
  item('nespresso-original-volluto', 'Volluto', 'Nespresso', 'Original', 'Espresso', 40, 60, [50, 130], 'standard', 'official-range', `${nespressoRangeNote} ${nespressoOriginalPageNote}`),
  item('nespresso-original-firenze-arpeggio', 'Firenze Arpeggio', 'Nespresso', 'Original', 'Espresso', 40, 65, [50, 130], 'standard', 'official-range', nespressoRangeNote),
  item('nespresso-original-ristretto-italiano', 'Ristretto Italiano', 'Nespresso', 'Original', 'Ristretto/Espresso', 25, 75, [40, 120], 'standard', 'official-range', nespressoRangeNote),
  item('nespresso-original-kazaar', 'Palermo Kazaar', 'Nespresso', 'Original', 'Ristretto/Espresso', 25, 125, [40, 130], 'high', 'official-range', nespressoRangeNote),
  item('nespresso-original-stockholm-lungo', 'Stockholm Fortissio Lungo', 'Nespresso', 'Original', 'Lungo', 110, 85, [70, 110], 'standard', 'official-range', nespressoRangeNote),
  item('nespresso-original-volluto-decaffeinato', 'Volluto Decaffeinato', 'Nespresso', 'Original', 'Espresso', 40, 3, [2, 4], 'decaf', 'official-range', `${nespressoRangeNote} ${nespressoOriginalPageNote}`),
  item('nespresso-original-ristretto-decaffeinato', 'Ristretto Italiano Decaffeinato', 'Nespresso', 'Original', 'Ristretto/Espresso', 25, 3, [2, 4], 'decaf', 'official-range', `${nespressoRangeNote} ${nespressoOriginalPageNote}`),

  // Major K-Cup examples — grouped by published range rather than false exactness.
  item('starbucks-kcup-pike-place', 'Pike Place Roast K-Cup', 'Starbucks', 'K-Cup', '8 oz cup', 237, 130, [75, 150], 'standard', 'official-range', `${keurigRangeNote} ${starbucksKcupNote}`),
  item('starbucks-kcup-veranda', 'Veranda Blend K-Cup', 'Starbucks', 'K-Cup', '8 oz cup', 237, 130, [75, 150], 'standard', 'official-range', `${keurigRangeNote} ${starbucksKcupNote}`),
  item('starbucks-kcup-sumatra', 'Sumatra K-Cup', 'Starbucks', 'K-Cup', '8 oz cup', 237, 130, [75, 150], 'standard', 'official-range', `${keurigRangeNote} ${starbucksKcupNote}`),
  item('starbucks-kcup-half-caff', 'Half Caff K-Cup', 'Starbucks', 'K-Cup', '8 oz cup', 237, 65, [35, 90], 'half-caf', 'official-range', `${keurigRangeNote} Starbucks at Home lists Half Caff as a product family; use package data when available.`),
  item('keurig-kcup-generic-decaf', 'Generic decaf K-Cup', 'Keurig', 'K-Cup', '8 oz cup', 237, 8, [2, 15], 'decaf', 'official-range', keurigRangeNote),

  // Dolce Gusto — useful major capsule system, clearly marked as third-party estimates.
  item('dolce-gusto-espresso-intenso', 'Espresso Intenso', 'NESCAFÉ Dolce Gusto', 'Dolce Gusto', 'Espresso', 50, 115, [100, 130], 'standard', 'third-party-estimate', dolceGustoNote),
  item('dolce-gusto-grande', 'Grande', 'NESCAFÉ Dolce Gusto', 'Dolce Gusto', 'Mug', 200, 106, [90, 120], 'standard', 'third-party-estimate', dolceGustoNote),
  item('dolce-gusto-cappuccino', 'Cappuccino', 'NESCAFÉ Dolce Gusto', 'Dolce Gusto', 'Specialty', 240, 107, [90, 120], 'standard', 'third-party-estimate', dolceGustoNote),
  item('dolce-gusto-mocha', 'Mocha', 'NESCAFÉ Dolce Gusto', 'Dolce Gusto', 'Specialty', 220, 45, [35, 60], 'low', 'third-party-estimate', dolceGustoNote),
];

export const VERTUO_SEED_CATALOG = CURATED_COFFEE_CATALOG.filter((item) => item.system === 'Vertuo');

export function findCatalogItem(id: string) {
  return CURATED_COFFEE_CATALOG.find((item) => item.id === id) ?? null;
}

export function getCatalogBrands() {
  return unique(CURATED_COFFEE_CATALOG.map((item) => item.brand));
}

export function getCatalogSystems(brand: string) {
  return unique(CURATED_COFFEE_CATALOG.filter((item) => item.brand === brand).map((item) => item.system));
}

export function getCatalogProducts(brand: string, system: string, search = '') {
  const query = search.trim().toLowerCase();
  return CURATED_COFFEE_CATALOG.filter((item) => {
    if (item.brand !== brand || item.system !== system) return false;
    if (!query) return true;
    return `${item.name} ${item.sizeLabel} ${item.doseGroup} ${item.confidence}`.toLowerCase().includes(query);
  });
}

export function doseGroupLabel(item: CatalogItem) {
  const range = item.caffeineMgMin !== undefined && item.caffeineMgMax !== undefined
    ? `${item.caffeineMgMin}-${item.caffeineMgMax} mg range`
    : `${item.caffeineMg} mg`;
  return `${item.doseGroup} · ${range} · ${item.confidence}`;
}

function item(
  id: string,
  name: string,
  brand: CatalogItem['brand'],
  system: CatalogItem['system'],
  sizeLabel: string,
  servingMl: number,
  caffeineMg: number,
  [caffeineMgMin, caffeineMgMax]: [number, number],
  doseGroup: DoseGroup,
  confidence: CatalogConfidence,
  sourceNote: string,
): CatalogItem {
  return {
    id,
    name,
    brand,
    line: system,
    system,
    sizeLabel,
    servingMl,
    caffeineMg,
    caffeineMgMin,
    caffeineMgMax,
    doseGroup,
    confidence,
    marketNote: 'US/global planning seed; product availability and caffeine may differ by market.',
    sourceNote,
  };
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}
