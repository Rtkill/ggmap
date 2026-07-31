'use client';

import { DbCategory } from '@/types/place';

interface CategoryFilterProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  counts: Record<string, number>;
  categories: DbCategory[];
  isAdminLoggedIn?: boolean;
  unvisitedCount?: number;
}

export default function CategoryFilter({
  selectedCategories,
  onChange,
  counts,
  categories,
  isAdminLoggedIn,
  unvisitedCount = 0,
}: CategoryFilterProps) {
  // Combine 'All' category and database categories, filtering out categories with 0 items
  const allCategoryPill = { id: 'all', name: 'All', color: '#6C7A89', emoji: '🗺️' };
  const buffetCategoryPill = { id: 'buffet', name: 'Buffet', color: '#E26D5C', emoji: '🍱' };
  const unvisitedCategoryPill = { id: 'unvisited', name: 'ยังไม่ได้ไป', color: '#f97316', emoji: '⏳' };

  const validCategories = categories.filter((cat) => {
    if (cat.name === 'All' || cat.name === 'Buffet') return false;
    const count = counts[cat.name] ?? 0;
    return count > 0;
  });

  const buffetCount = counts['Buffet'] ?? 0;

  const items = [
    allCategoryPill,
    ...(buffetCount > 0 ? [buffetCategoryPill] : []),
    ...(isAdminLoggedIn && unvisitedCount > 0 ? [unvisitedCategoryPill] : []),
    ...validCategories,
  ];

  const isAllSelected = selectedCategories.length === 0 || (selectedCategories.length === 1 && selectedCategories.includes('All'));

  const handleToggle = (name: string) => {
    if (name === 'All') {
      onChange(['All']);
      return;
    }

    if (isAllSelected) {
      // Transition from 'All' to single category selection
      onChange([name]);
    } else {
      if (selectedCategories.includes(name)) {
        // Toggle off selected category
        const next = selectedCategories.filter((c) => c !== name);
        onChange(next.length === 0 ? ['All'] : next);
      } else {
        // Multi-select: append category
        onChange([...selectedCategories.filter((c) => c !== 'All'), name]);
      }
    }
  };

  return (
    <div className="category-filter-bar">
      <div className="filter-scroll">
        {items.map((cat) => {
          const color = cat.color;
          const emoji = cat.emoji;
          const count =
            cat.name === 'All'
              ? Object.values(counts).reduce((a, b) => a + b, 0)
              : cat.name === 'ยังไม่ได้ไป'
              ? unvisitedCount
              : counts[cat.name] ?? 0;

          const isActive =
            cat.name === 'All'
              ? isAllSelected
              : selectedCategories.includes(cat.name);

          return (
            <button
              key={cat.id}
              onClick={() => handleToggle(cat.name)}
              className={`filter-btn ${isActive ? 'active' : ''}`}
              style={
                isActive
                  ? { backgroundColor: color, borderColor: color, color: '#fff' }
                  : { borderColor: color + '60', color }
              }
            >
              <span className="filter-emoji">{emoji}</span>
              <span className="filter-label">{cat.name}</span>
              {count > 0 && (
                <span
                  className="filter-count"
                  style={
                    isActive
                      ? { backgroundColor: 'rgba(255,255,255,0.25)' }
                      : { backgroundColor: color + '20', color }
                  }
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
