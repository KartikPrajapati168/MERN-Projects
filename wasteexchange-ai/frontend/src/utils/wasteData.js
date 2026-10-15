export const wasteCategories = {
  'Plastic': {
    subtypes: ['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'Other Plastic']
  },
  'Metal': {
    subtypes: ['Steel', 'Aluminium', 'Copper', 'Brass', 'Iron', 'Lead', 'Other Metal']
  },
  'Textile': {
    subtypes: ['Cotton', 'Polyester', 'Nylon', 'Wool', 'Silk', 'Jute', 'Other Textile']
  },
  'Paper': {
    subtypes: ['Cardboard', 'Newsprint', 'Office Paper', 'Magazine', 'Other Paper']
  },
  'Wood': {
    subtypes: ['Sawdust', 'Pallets', 'Wood Chips', 'Timber Scrap', 'Other Wood']
  },
  'Glass': {
    subtypes: ['Bottles', 'Sheet Glass', 'Container Glass', 'Other Glass']
  },
  'Rubber': {
    subtypes: ['Tyre Scrap', 'Rubber Sheets', 'Silicone', 'Other Rubber']
  },
  'Other': {
    subtypes: ['Other Waste']
  }
};

export const mainCategories = Object.keys(wasteCategories);