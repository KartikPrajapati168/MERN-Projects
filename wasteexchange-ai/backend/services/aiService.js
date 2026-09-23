// backend/services/aiService.js
// ✅ Pure JavaScript AI Engine - No Python needed!

/**
 * TF-IDF (Term Frequency - Inverse Document Frequency)
 * Text ko numerical vector me convert karta hai
 */
class TFIDFVectorizer {
  constructor() {
    this.vocabulary = new Map();  // word -> index
    this.idf = new Map();          // word -> idf score
    this.documents = [];
  }

  // Tokenize text - clean karke words nikalo
  tokenize(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2); // 2 se chhote words ignore
  }

  // Fit - saare documents se vocabulary aur IDF banao
  fit(documents) {
    this.documents = documents;
    const docCount = documents.length;
    const wordDocCount = new Map(); // word kitne documents me aaya

    // Har document ke words count karo
    documents.forEach(doc => {
      const words = new Set(this.tokenize(doc));
      words.forEach(word => {
        wordDocCount.set(word, (wordDocCount.get(word) || 0) + 1);
        if (!this.vocabulary.has(word)) {
          this.vocabulary.set(word, this.vocabulary.size);
        }
      });
    });

    // IDF calculate karo: log(N / df)
    wordDocCount.forEach((df, word) => {
      this.idf.set(word, Math.log(docCount / (df + 1)) + 1);
    });

    return this;
  }

  // Ek document ko TF-IDF vector me convert karo
  transform(text) {
    const words = this.tokenize(text);
    const vector = new Array(this.vocabulary.size).fill(0);
    
    if (words.length === 0) return vector;

    // Term Frequency
    const tf = new Map();
    words.forEach(w => tf.set(w, (tf.get(w) || 0) + 1));

    // TF-IDF = TF × IDF
    tf.forEach((count, word) => {
      const idx = this.vocabulary.get(word);
      if (idx !== undefined) {
        const idf = this.idf.get(word) || 1;
        vector[idx] = (count / words.length) * idf;
      }
    });

    return vector;
  }
}

/**
 * Cosine Similarity - Do vectors ke beech angle nikalta hai
 * 1 = identical, 0 = completely different
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Material Classifier - Text se category predict karta hai
 * Naive Bayes style scoring
 */
const MATERIAL_KEYWORDS = {
  'Plastic': ['plastic', 'pet', 'hdpe', 'ldpe', 'pvc', 'polypropylene', 'polythene', 'bottle', 'container', 'polymer'],
  'Metal': ['metal', 'steel', 'iron', 'aluminium', 'aluminum', 'copper', 'brass', 'scrap', 'ferrous', 'alloy'],
  'Paper': ['paper', 'cardboard', 'carton', 'newsprint', 'kraft', 'newspaper', 'corrugated'],
  'Textile': ['textile', 'cotton', 'fabric', 'cloth', 'polyester', 'nylon', 'wool', 'yarn', 'garment'],
  'Wood': ['wood', 'timber', 'pallet', 'sawdust', 'plywood', 'log', 'bamboo'],
  'Glass': ['glass', 'bottle', 'window', 'pane', 'container'],
  'Rubber': ['rubber', 'tyre', 'tire', 'latex', 'silicone'],
  'E-waste': ['electronic', 'e-waste', 'circuit', 'board', 'computer', 'mobile', 'battery', 'cable'],
  'Organic': ['organic', 'food', 'vegetable', 'fruit', 'kitchen', 'compost', 'bio']
};

class MaterialClassifier {
  constructor() {
    // Category -> keyword weights (yaad rakhne ke liye)
    this.keywords = MATERIAL_KEYWORDS;
  }

  // Description se category predict karo
  classify(text) {
    if (!text) return { category: 'Other', confidence: 0, scores: {} };

    const words = text.toLowerCase().split(/\s+/);
    const scores = {};
    let totalMatches = 0;

    // Har category ke keywords count karo
    Object.keys(this.keywords).forEach(category => {
      scores[category] = 0;
      this.keywords[category].forEach(keyword => {
        words.forEach(word => {
          if (word.includes(keyword) || keyword.includes(word)) {
            scores[category] += 1;
            totalMatches += 1;
          }
        });
      });
    });

    // Highest score wali category nikalo
    let bestCategory = 'Other';
    let bestScore = 0;

    Object.keys(scores).forEach(cat => {
      if (scores[cat] > bestScore) {
        bestScore = scores[cat];
        bestCategory = cat;
      }
    });

    // Confidence = best score / total matches
    const confidence = totalMatches > 0 
      ? Math.round((bestScore / totalMatches) * 100) 
      : 0;

    return {
      category: bestCategory,
      confidence: Math.min(confidence, 95),
      scores
    };
  }
}

/**
 * Hybrid Recommendation Engine
 * - Content-Based Filtering (TF-IDF + Cosine) — 60%
 * - Rule-Based Weighted Score — 40%
 */
class RecommendationEngine {
  constructor() {
    this.vectorizer = new TFIDFVectorizer();
  }

  // Listing/Requirement ko ek text string me combine karo
  toText(item) {
    return [
      item.material || '',
      item.materialSubtype || '',
      item.description || '',
      item.location || ''
    ].join(' ').toLowerCase();
  }

  // Rule-based score - quantity, price, location
  ruleBasedScore(listing, requirement) {
    let score = 0;

    // Quantity match (25 points)
    if (listing.quantity >= requirement.minQty && listing.quantity <= requirement.maxQty) {
      score += 25;
    } else if (listing.quantity > requirement.maxQty) {
      score += Math.max(0, 25 - ((listing.quantity - requirement.maxQty) / requirement.maxQty) * 25);
    } else {
      score += Math.max(0, 25 - ((requirement.minQty - listing.quantity) / requirement.minQty) * 25);
    }

    // Price match (25 points)
    if (listing.price <= requirement.maxPrice) {
      score += 25;
    } else {
      score += Math.max(0, 25 - ((listing.price - requirement.maxPrice) / requirement.maxPrice) * 25);
    }

    // Location match (25 points)
    if (listing.location && requirement.location) {
      const l1 = listing.location.toLowerCase();
      const l2 = requirement.location.toLowerCase();
      if (l1 === l2) score += 25;
      else if (l1.includes(l2) || l2.includes(l1)) score += 15;
      else score += 5;
    }

    // Material category match (25 points)
    if (listing.material && requirement.material) {
      if (listing.material.toLowerCase() === requirement.material.toLowerCase()) {
        score += 25;
      } else if (listing.materialSubtype && requirement.materialSubtype &&
                 listing.materialSubtype.toLowerCase() === requirement.materialSubtype.toLowerCase()) {
        score += 20;
      } else {
        score += 5;
      }
    }

    return score; // 0-100
  }

  // Main recommend function
  recommend(userRequirement, allListings, topN = 12) {
    if (!allListings || allListings.length === 0) return [];

    // TF-IDF fit karo saare listings pe + requirement pe
    const corpus = [
      this.toText(userRequirement),
      ...allListings.map(l => this.toText(l))
    ];

    this.vectorizer.fit(corpus);

    // Requirement ka vector
    const reqVector = this.vectorizer.transform(this.toText(userRequirement));

    // Har listing ka score calculate karo
    const results = allListings.map(listing => {
      // Text similarity (TF-IDF + Cosine)
      const listingVector = this.vectorizer.transform(this.toText(listing));
      const textSim = cosineSimilarity(reqVector, listingVector) * 100;

      // Rule-based score
      const ruleScore = this.ruleBasedScore(listing, userRequirement);

      // Hybrid score: 60% text similarity + 40% rule
      const hybridScore = (textSim * 0.6) + (ruleScore * 0.4);

      return {
        ...listing.toObject ? listing.toObject() : listing,
        matchScore: Math.round(hybridScore),
        textSimilarity: Math.round(textSim),
        ruleScore: Math.round(ruleScore),
        aiExplanation: this.generateExplanation(listing, userRequirement, textSim, ruleScore)
      };
    });

    // Sort by matchScore descending, filter >30
    return results
      .filter(r => r.matchScore > 20)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, topN);
  }

  // AI explanation - "kyun recommend kiya" (Netflix style)
  generateExplanation(listing, requirement, textSim, ruleScore) {
    const reasons = [];
    
    if (listing.material === requirement.material) {
      reasons.push('Material category perfectly matches');
    }
    if (listing.quantity >= requirement.minQty && listing.quantity <= requirement.maxQty) {
      reasons.push('Quantity is in your preferred range');
    }
    if (listing.price <= requirement.maxPrice) {
      reasons.push('Price is within your budget');
    }
    if (listing.location && listing.location.toLowerCase() === requirement.location?.toLowerCase()) {
      reasons.push('Same location');
    }
    if (textSim > 50) {
      reasons.push('High text similarity with your requirements');
    }

    return reasons.length > 0 ? reasons : ['Partial match found'];
  }

  // Generator ke liye - best buyers dhundo
  recommendBuyers(generatorListing, allRequirements, topN = 12) {
    if (!allRequirements || allRequirements.length === 0) return [];

    const corpus = [
      this.toText(generatorListing),
      ...allRequirements.map(r => this.toText(r))
    ];

    this.vectorizer.fit(corpus);
    const listingVector = this.vectorizer.transform(this.toText(generatorListing));

    const results = allRequirements.map(req => {
      const reqVector = this.vectorizer.transform(this.toText(req));
      const textSim = cosineSimilarity(listingVector, reqVector) * 100;
      const ruleScore = this.ruleBasedScore(generatorListing, req);
      const hybridScore = (textSim * 0.6) + (ruleScore * 0.4);

      return {
        ...req.toObject ? req.toObject() : req,
        matchScore: Math.round(hybridScore),
        textSimilarity: Math.round(textSim),
        ruleScore: Math.round(ruleScore),
        aiExplanation: this.generateExplanation(generatorListing, req, textSim, ruleScore)
      };
    });

    return results
      .filter(r => r.matchScore > 20)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, topN);
  }
}

// Export singletons
const materialClassifier = new MaterialClassifier();
const recommendationEngine = new RecommendationEngine();

module.exports = {
  TFIDFVectorizer,
  cosineSimilarity,
  MaterialClassifier,
  RecommendationEngine,
  materialClassifier,
  recommendationEngine
};