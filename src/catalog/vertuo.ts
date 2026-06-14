import type { CoffeeProduct } from '../domain';

export type CatalogConfidence = 'official-exact' | 'official-range' | 'community-estimate';

export interface VertuoCatalogItem extends CoffeeProduct {
  sizeLabel: 'Espresso' | 'Double Espresso' | 'Gran Lungo' | 'Mug' | 'Alto';
  confidence: CatalogConfidence;
}

const officialRangeNote =
  'Nespresso public FAQ/health pages describe Vertuo caffeine by cup-size ranges (roughly 60-200 mg per cup); exact values can vary by market and batch.';

export const VERTUO_SEED_CATALOG: VertuoCatalogItem[] = [
  {
    id: 'vertuo-melozio-boost',
    name: 'Melozio Boost',
    brand: 'Nespresso',
    line: 'Vertuo',
    sizeLabel: 'Mug',
    servingMl: 230,
    caffeineMg: 200,
    caffeineMgMin: 180,
    caffeineMgMax: 200,
    confidence: 'official-exact',
    sourceNote:
      'Nespresso USA product page states approximately 200 mg caffeine per mug, 180 mg minimum; regular Melozio is approximately 170 mg.',
  },
  {
    id: 'vertuo-melozio',
    name: 'Melozio',
    brand: 'Nespresso',
    line: 'Vertuo',
    sizeLabel: 'Mug',
    servingMl: 230,
    caffeineMg: 170,
    caffeineMgMin: 130,
    caffeineMgMax: 200,
    confidence: 'official-range',
    sourceNote: `${officialRangeNote} Seed uses the regular Melozio value referenced on the Melozio Boost product page.`,
  },
  {
    id: 'vertuo-stormio',
    name: 'Stormio',
    brand: 'Nespresso',
    line: 'Vertuo',
    sizeLabel: 'Mug',
    servingMl: 230,
    caffeineMg: 170,
    caffeineMgMin: 130,
    caffeineMgMax: 200,
    confidence: 'community-estimate',
    sourceNote: `${officialRangeNote} Seed estimate from commonly published Vertuo caffeine charts; edit manually if your sleeve/product page differs.`,
  },
  {
    id: 'vertuo-odacio',
    name: 'Odacio',
    brand: 'Nespresso',
    line: 'Vertuo',
    sizeLabel: 'Mug',
    servingMl: 230,
    caffeineMg: 170,
    caffeineMgMin: 130,
    caffeineMgMax: 200,
    confidence: 'community-estimate',
    sourceNote: `${officialRangeNote} Seed estimate from commonly published Vertuo caffeine charts; edit manually if your sleeve/product page differs.`,
  },
  {
    id: 'vertuo-intenso',
    name: 'Intenso',
    brand: 'Nespresso',
    line: 'Vertuo',
    sizeLabel: 'Mug',
    servingMl: 230,
    caffeineMg: 195,
    caffeineMgMin: 130,
    caffeineMgMax: 200,
    confidence: 'community-estimate',
    sourceNote: `${officialRangeNote} Seed estimate from commonly published Vertuo caffeine charts; edit manually if your sleeve/product page differs.`,
  },
  {
    id: 'vertuo-half-caffeinato',
    name: 'Half Caffeinato',
    brand: 'Nespresso',
    line: 'Vertuo',
    sizeLabel: 'Mug',
    servingMl: 230,
    caffeineMg: 90,
    caffeineMgMin: 80,
    caffeineMgMax: 100,
    confidence: 'official-range',
    sourceNote: 'Nespresso FAQ pages identify Half Caffeinato as an exception around 90 mg per mug.',
  },
  {
    id: 'vertuo-double-espresso-dolce',
    name: 'Double Espresso Dolce',
    brand: 'Nespresso',
    line: 'Vertuo',
    sizeLabel: 'Double Espresso',
    servingMl: 80,
    caffeineMg: 130,
    caffeineMgMin: 130,
    caffeineMgMax: 160,
    confidence: 'official-range',
    sourceNote: 'Nespresso FAQ pages place Vertuo double espressos around 130-160 mg per cup; edit manually for product-specific values.',
  },
  {
    id: 'vertuo-double-espresso-scuro',
    name: 'Double Espresso Scuro',
    brand: 'Nespresso',
    line: 'Vertuo',
    sizeLabel: 'Double Espresso',
    servingMl: 80,
    caffeineMg: 150,
    caffeineMgMin: 130,
    caffeineMgMax: 160,
    confidence: 'official-range',
    sourceNote: 'Nespresso FAQ pages place Vertuo double espressos around 130-160 mg per cup; edit manually for product-specific values.',
  },
  {
    id: 'vertuo-altissio',
    name: 'Altissio',
    brand: 'Nespresso',
    line: 'Vertuo',
    sizeLabel: 'Espresso',
    servingMl: 40,
    caffeineMg: 75,
    caffeineMgMin: 60,
    caffeineMgMax: 150,
    confidence: 'official-range',
    sourceNote: 'Nespresso FAQ pages place Vertuo espressos around 60-150 mg per cup; edit manually for product-specific values.',
  },
  {
    id: 'vertuo-diavolitto',
    name: 'Diavolitto',
    brand: 'Nespresso',
    line: 'Vertuo',
    sizeLabel: 'Espresso',
    servingMl: 40,
    caffeineMg: 145,
    caffeineMgMin: 60,
    caffeineMgMax: 150,
    confidence: 'community-estimate',
    sourceNote: 'High-caffeine espresso seed estimate within the official Vertuo espresso range; edit manually if your source differs.',
  },
];

export function findCatalogItem(id: string) {
  return VERTUO_SEED_CATALOG.find((item) => item.id === id) ?? null;
}
