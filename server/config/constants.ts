// server/config/constants.ts
export const ARTICLE_SOURCES = [
  {
    id: 'military-deployment-report',
    url: 'https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-1_military-deployment-report.md',
  },
  {
    id: 'urban-commuting',
    url: 'https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-2_urban-commuting.md',
  },
  {
    id: 'hover-polo',
    url: 'https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-3_hover-polo.md',
  },
  {
    id: 'warehousing',
    url: 'https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-4_warehousing.md',
  },
  {
    id: 'consumer-safety',
    url: 'https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-5_consumer-safety.md',
  },
] as const;

export const PDF_FILES: string[] = [
  "OpEd - A Revolution at Our Feet.pdf",
  "Research Paper - Gravitational Reversal Physics.pdf",
  "White Paper - The Development of Localized Gravity Reversal Technology.pdf"
];

export const ARTICLE_IDS: string[] = ARTICLE_SOURCES.map((a) => a.id);