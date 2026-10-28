import { describe, expect, it } from 'vitest';
import { demoTutors } from '../../src/data/demo';
import { DEFAULT_FILTERS, filtersFromParams, filtersToParams, searchTutorList, type TutorFilters } from '../../src/lib/tutorSearch';

const f = (patch: Partial<TutorFilters>): TutorFilters => ({ ...DEFAULT_FILTERS, ...patch });
const names = (r: { items: { display_name: string }[] }) => r.items.map((t) => t.display_name);

describe('URL filter parsing', () => {
  it('round-trips filters through query params', () => {
    const filters = f({ q: 'maths', subject: 'physics', mode: 'online', minRate: 10, maxRate: 50, minExperience: 3, sort: 'price_asc', page: 2 });
    expect(filtersFromParams(filtersToParams(filters))).toEqual(filters);
  });

  it('omits defaults and ignores invalid values', () => {
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('');
    const parsed = filtersFromParams(new URLSearchParams('mode=space&sort=bogus&page=-3&minRate=abc'));
    expect(parsed).toEqual(DEFAULT_FILTERS);
  });
});

describe('searchTutorList (demo data search)', () => {
  it('returns all demo tutors paginated', () => {
    const r = searchTutorList(demoTutors, f({}), 4);
    expect(r.total).toBe(demoTutors.length);
    expect(r.items).toHaveLength(4);
    expect(searchTutorList(demoTutors, f({ page: 3 }), 4).items).toHaveLength(demoTutors.length - 8);
  });

  it('filters by subject slug', () => {
    expect(names(searchTutorList(demoTutors, f({ subject: 'spanish' })))).toEqual(['Sofía Martínez']);
  });

  it('treats "both" tutors as matching either teaching mode', () => {
    const inPerson = searchTutorList(demoTutors, f({ mode: 'in_person' }), 50).items;
    expect(inPerson.every((t) => t.teaching_mode !== 'online')).toBe(true);
    expect(inPerson.some((t) => t.teaching_mode === 'both')).toBe(true);
  });

  it('filters by price range and experience', () => {
    const r = searchTutorList(demoTutors, f({ minRate: 35, maxRate: 40, minExperience: 5 }), 50);
    expect(r.items.every((t) => t.hourly_rate! >= 35 && t.hourly_rate! <= 40 && t.experience_years >= 5)).toBe(true);
    expect(r.total).toBeGreaterThan(0);
  });

  it('matches keywords in names, bios and subject names (case-insensitive)', () => {
    expect(names(searchTutorList(demoTutors, f({ q: 'PRIYA' })))).toEqual(['Priya Raman']);
    expect(names(searchTutorList(demoTutors, f({ q: 'piano' })))).toEqual(['Arjun Mehta']);
    expect(searchTutorList(demoTutors, f({ q: 'economics' })).items.map((t) => t.id)).toContain('demo-hannah-cole');
    expect(searchTutorList(demoTutors, f({ q: 'zzzz-nothing' })).total).toBe(0);
  });

  it('sorts by price and experience', () => {
    const asc = searchTutorList(demoTutors, f({ sort: 'price_asc' }), 50).items.map((t) => t.hourly_rate!);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = searchTutorList(demoTutors, f({ sort: 'price_desc' }), 50).items.map((t) => t.hourly_rate!);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    const exp = searchTutorList(demoTutors, f({}), 50).items.map((t) => t.experience_years);
    expect(exp).toEqual([...exp].sort((a, b) => b - a));
  });

  it('marks every demo tutor as sample data', () => {
    expect(demoTutors.every((t) => t.isDemo)).toBe(true);
  });
});
