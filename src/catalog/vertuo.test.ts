import { describe, expect, it } from 'vitest';
import { CURATED_COFFEE_CATALOG, doseGroupLabel, findCatalogItem, getCatalogBrands, getCatalogProducts, getCatalogSystems } from './vertuo';

describe('curated capsule catalog', () => {
  it('groups major capsule products by company, system, dose group, and source confidence', () => {
    expect(CURATED_COFFEE_CATALOG.length).toBeGreaterThanOrEqual(20);
    expect(getCatalogBrands()).toEqual(expect.arrayContaining(['Nespresso', 'Starbucks', 'Keurig', 'NESCAFÉ Dolce Gusto']));
    expect(getCatalogSystems('Nespresso')).toEqual(expect.arrayContaining(['Vertuo', 'Original']));

    const vertuoDecaf = findCatalogItem('nespresso-vertuo-melozio-decaffeinato');
    const originalDecaf = findCatalogItem('nespresso-original-volluto-decaffeinato');
    const kcup = findCatalogItem('starbucks-kcup-pike-place');
    const dolceGusto = findCatalogItem('dolce-gusto-espresso-intenso');

    expect(vertuoDecaf?.doseGroup).toBe('decaf');
    expect(originalDecaf?.system).toBe('Original');
    expect(kcup?.system).toBe('K-Cup');
    expect(dolceGusto?.confidence).toBe('third-party-estimate');
    expect(doseGroupLabel(kcup!)).toMatch(/75-150 mg range/);
  });

  it('filters product choices within the selected brand and system', () => {
    const nespressoDecafs = getCatalogProducts('Nespresso', 'Vertuo', 'decaf');
    const starbucksKcups = getCatalogProducts('Starbucks', 'K-Cup', 'pike');

    expect(nespressoDecafs.map((item) => item.id)).toContain('nespresso-vertuo-melozio-decaffeinato');
    expect(nespressoDecafs.every((item) => item.brand === 'Nespresso' && item.system === 'Vertuo')).toBe(true);
    expect(starbucksKcups).toHaveLength(1);
    expect(starbucksKcups[0].name).toMatch(/Pike Place/);
    expect(getCatalogProducts('Nespresso', 'Vertuo', '디카페인').map((item) => item.id)).toContain('nespresso-vertuo-melozio-decaffeinato');
  });
});
