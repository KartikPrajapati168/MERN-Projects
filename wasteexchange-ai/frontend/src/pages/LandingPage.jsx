// src/pages/LandingPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../App.css';

/* ============================================================
   🧠 AI WASTE CLASSIFIER — Knowledge Base + TF-IDF Engine
   ============================================================ */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'of', 'from', 'and', 'or', 'to', 'for', 'with', 'in', 'on', 'at', 'by',
  'as', 'it', 'this', 'that', 'these', 'those', 'we', 'i', 'you', 'my',
  'our', 'their', 'some', 'any', 'all', 'roughly', 'approximately',
  'about', 'tonnes', 'tonne', 'tons', 'ton', 'kg', 'kgs', 'kilo', 'kilos',
  'please', 'need', 'want', 'have', 'has', 'had', 'lot', 'lots', 'piece',
  'pieces', 'type', 'kind', 'sort', 'mixed', 'around', 'nearly', 'almost'
]);

const WASTE_KB = {
  'Plastic Scrap': {
    icon: '🧴',
    color: '#6366f1',
    keywords: [
      'plastic', 'pet', 'hdpe', 'ldpe', 'pp', 'pvc', 'ps', 'abs',
      'polythene', 'polymer', 'bottle', 'bottles', 'container', 'containers',
      'bag', 'bags', 'film', 'wrap', 'packaging', 'granule', 'granules',
      'flake', 'flakes', 'poly', 'plastic waste', 'plastic scrap', 'plastic bottles'
    ],
    subtypes: ['PET', 'HDPE', 'LDPE', 'PP', 'PVC', 'PS', 'ABS', 'Mixed Plastic'],
    subKeywords: {
      'PET': ['pet', 'water bottle', 'soda bottle', 'clear bottle', 'beverage bottle'],
      'HDPE': ['hdpe', 'milk jug', 'detergent bottle', 'shampoo bottle', 'opaque bottle'],
      'LDPE': ['ldpe', 'carry bag', 'shrink wrap', 'plastic film', 'poly bag'],
      'PP': ['pp', 'polypropylene', 'yogurt cup', 'bucket', 'crate'],
      'PVC': ['pvc', 'pipe', 'vinyl', 'window frame'],
      'PS': ['polystyrene', 'styrofoam', 'thermocol'],
      'ABS': ['abs', 'acrylonitrile'],
    },
    avgPrice: '₹18–45 / kg',
  },

  'Metal Scrap': {
    icon: '⚙️',
    color: '#f59e0b',
    keywords: [
      'metal', 'steel', 'iron', 'aluminium', 'aluminum', 'copper', 'brass',
      'bronze', 'zinc', 'lead', 'tin', 'alloy', 'sheet', 'pipe', 'rod',
      'turnings', 'shavings', 'scrap metal', 'ferrous', 'non-ferrous',
      'nonferrous', 'wire', 'cable', 'metal waste', 'metal scrap', 'mill scale'
    ],
    subtypes: ['Steel', 'Iron', 'Aluminium', 'Copper', 'Brass', 'Mixed Metal'],
    subKeywords: {
      'Steel': ['steel', 'ms', 'stainless', 'ss', 'rebar', 'girder', 'tmt'],
      'Iron': ['iron', 'cast iron', 'pig iron', 'wrought iron'],
      'Aluminium': ['aluminium', 'aluminum', 'alu', 'extrusion'],
      'Copper': ['copper', 'cu', 'copper wire', 'bus bar', 'armature'],
      'Brass': ['brass', 'bronze', 'yellow metal'],
    },
    avgPrice: '₹25–250 / kg',
  },

  'Textile Waste': {
    icon: '🧵',
    color: '#ec4899',
    keywords: [
      'textile', 'fabric', 'cloth', 'cotton', 'polyester', 'nylon', 'silk',
      'wool', 'yarn', 'thread', 'garment', 'clothing', 'apparel',
      'cutting', 'cuttings', 'rag', 'rags', 'denim', 'jute', 'linen',
      'cloth waste', 'fabric waste', 'textile waste', 'textile scrap'
    ],
    subtypes: ['Cotton', 'Polyester', 'Denim', 'Jute', 'Mixed Fabric'],
    subKeywords: {
      'Cotton': ['cotton', 'cotton fabric', 'cotton waste', 'tshirt', 't-shirt', 'shirt'],
      'Polyester': ['polyester', 'poly', 'synthetic', 'pet fabric'],
      'Denim': ['denim', 'jeans', 'jean'],
      'Jute': ['jute', 'burlap', 'hessian', 'gunny'],
    },
    avgPrice: '₹8–35 / kg',
  },

  'Paper Waste': {
    icon: '📄',
    color: '#22c55e',
    keywords: [
      'paper', 'cardboard', 'carton', 'newsprint', 'newspaper', 'magazine',
      'book', 'books', 'corrugated', 'kraft', 'white paper', 'office paper',
      'paper waste', 'paper scrap', 'occ', 'onp', 'ledger', 'journal',
      'waste paper', 'old paper', 'paper board'
    ],
    subtypes: ['Cardboard', 'Newsprint', 'Office Paper', 'Kraft', 'Mixed Paper'],
    subKeywords: {
      'Cardboard': ['cardboard', 'carton', 'corrugated', 'box', 'boxes', 'occ'],
      'Newsprint': ['newsprint', 'newspaper', 'news', 'onp'],
      'Office Paper': ['office paper', 'a4', 'ledger', 'white paper', 'printer'],
      'Kraft': ['kraft', 'brown paper', 'paper bag'],
    },
    avgPrice: '₹8–22 / kg',
  },

  'Wood Scrap': {
    icon: '🪵',
    color: '#8b5cf6',
    keywords: [
      'wood', 'wooden', 'timber', 'lumber', 'pallet', 'pallets', 'sawdust',
      'plywood', 'mdf', 'particle board', 'crate', 'log', 'logs', 'branch',
      'branches', 'tree', 'furniture', 'wood waste', 'wood scrap', 'wood dust'
    ],
    subtypes: ['Pallets', 'Sawdust', 'Plywood', 'MDF', 'Firewood'],
    subKeywords: {
      'Pallets': ['pallet', 'pallets', 'shipping pallet'],
      'Sawdust': ['sawdust', 'saw dust', 'wood dust', 'wood shaving'],
      'Plywood': ['plywood', 'ply'],
      'MDF': ['mdf', 'particle board', 'chipboard'],
      'Firewood': ['firewood', 'fire wood', 'log', 'logs'],
    },
    avgPrice: '₹3–15 / kg',
  },

  'Glass Scrap': {
    icon: '🍾',
    color: '#06b6d4',
    keywords: [
      'glass', 'bottle', 'bottles', 'jar', 'jars', 'window', 'windshield',
      'mirror', 'glazing', 'cullet', 'glass waste', 'glass scrap',
      'broken glass', 'sheet glass', 'glass bottle'
    ],
    subtypes: ['Bottles', 'Sheet Glass', 'Windshield', 'Cullet'],
    subKeywords: {
      'Bottles': ['bottle', 'bottles', 'jar', 'jars'],
      'Sheet Glass': ['sheet glass', 'window glass', 'plate glass'],
      'Windshield': ['windshield', 'car glass', 'auto glass'],
      'Cullet': ['cullet', 'broken glass', 'glass pieces'],
    },
    avgPrice: '₹4–18 / kg',
  },

  'Rubber Waste': {
    icon: '🛞',
    color: '#ef4444',
    keywords: [
      'rubber', 'tire', 'tyre', 'tires', 'tyres', 'tube', 'hose', 'mat',
      'matting', 'sole', 'soles', 'rubber waste', 'rubber scrap', 'rubber sheet'
    ],
    subtypes: ['Tyres', 'Tubes', 'Rubber Sheets'],
    subKeywords: {
      'Tyres': ['tyre', 'tire', 'truck tyre', 'car tyre'],
      'Tubes': ['tube', 'tubes', 'inner tube'],
      'Rubber Sheets': ['rubber sheet', 'mat', 'matting'],
    },
    avgPrice: '₹5–25 / kg',
  },

  'E-Waste': {
    icon: '💻',
    color: '#84cc16',
    keywords: [
      'electronic', 'electronics', 'e-waste', 'ewaste', 'computer', 'laptop',
      'mobile', 'phone', 'pcb', 'circuit', 'board', 'battery', 'batteries',
      'crt', 'monitor', 'television', 'tv', 'refrigerator', 'fridge',
      'appliance', 'electronic waste', 'electronic scrap'
    ],
    subtypes: ['PCBs', 'Cables', 'Batteries', 'Appliances'],
    subKeywords: {
      'PCBs': ['pcb', 'circuit board', 'motherboard'],
      'Cables': ['cable', 'cables', 'wire', 'wires'],
      'Batteries': ['battery', 'batteries', 'cell', 'cells'],
      'Appliances': ['fridge', 'refrigerator', 'washing machine', 'tv', 'television'],
    },
    avgPrice: '₹15–200 / kg',
  },

  'Organic Waste': {
    icon: '🌱',
    color: '#10b981',
    keywords: [
      'organic', 'food', 'vegetable', 'fruit', 'kitchen', 'garden', 'leaves',
      'leaf', 'compost', 'biodegradable', 'bio', 'manure', 'sludge', 'agri',
      'agriculture', 'crop', 'crop residue', 'green waste', 'food waste',
      'vegetable waste', 'kitchen waste'
    ],
    subtypes: ['Food Waste', 'Garden Waste', 'Crop Residue'],
    subKeywords: {
      'Food Waste': ['food waste', 'kitchen waste', 'vegetable', 'fruit', 'restaurant'],
      'Garden Waste': ['garden', 'leaf', 'leaves', 'grass', 'plant'],
      'Crop Residue': ['crop', 'husk', 'straw', 'bagasse', 'agri'],
    },
    avgPrice: '₹2–10 / kg',
  },
};

/* ---------- NLP helpers ---------- */

const tokenize = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

const termFreq = (tokens) => {
  const tf = {};
  tokens.forEach((t) => { tf[t] = (tf[t] || 0) + 1; });
  return tf;
};

const cosineSim = (v1, v2) => {
  const keys = new Set([...Object.keys(v1), ...Object.keys(v2)]);
  let dot = 0, mag1 = 0, mag2 = 0;
  keys.forEach((k) => {
    const a = v1[k] || 0;
    const b = v2[k] || 0;
    dot += a * b;
    mag1 += a * a;
    mag2 += b * b;
  });
  if (mag1 === 0 || mag2 === 0) return 0;
  return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
};

/* ---------- Main classifier ---------- */

const classifyWaste = (text) => {
  const queryTokens = tokenize(text);
  if (queryTokens.length === 0) return null;
  const queryTF = termFreq(queryTokens);
  const lowerText = text.toLowerCase();

  const results = Object.entries(WASTE_KB).map(([category, data]) => {
    // Build doc vector from keywords + all sub keywords
    const docTokens = [...data.keywords];
    Object.values(data.subKeywords || {}).forEach((arr) => docTokens.push(...arr));
    const docTF = termFreq(docTokens);

    // Cosine similarity (TF-based)
    const textSim = cosineSim(queryTF, docTF);

    // Keyword-hit score (rule-based boost)
    const hitKeywords = data.keywords.filter((k) => lowerText.includes(k));
    const keywordScore = Math.min(1, hitKeywords.length / 3);

    // Subtype detection
    const detectedSubtypes = [];
    Object.entries(data.subKeywords || {}).forEach(([sub, kws]) => {
      const hits = kws.filter((k) => lowerText.includes(k));
      if (hits.length > 0) detectedSubtypes.push({ name: sub, hits, count: hits.length });
    });
    detectedSubtypes.sort((a, b) => b.count - a.count);

    // Composite score
    const composite = textSim * 0.55 + keywordScore * 0.45;

    return {
      category,
      icon: data.icon,
      color: data.color,
      avgPrice: data.avgPrice,
      textSim: Math.round(textSim * 100),
      keywordScore: Math.round(keywordScore * 100),
      composite: Math.round(composite * 100),
      hitKeywords,
      detectedSubtypes,
      allSubtypes: data.subtypes,
    };
  });

  results.sort((a, b) => b.composite - a.composite);

  const top = results[0];
  const sum = results.reduce((s, r) => s + r.composite, 0);
  const confidence = sum > 0 ? Math.round((top.composite / sum) * 100) : 0;

  // Filter meaningful alternatives
  const alternatives = results.slice(1, 4).filter((r) => r.composite > 8);

  return {
    top,
    alternatives,
    confidence,
    allScores: results,
    queryTokens,
    tokenCount: queryTokens.length,
  };
};

/* ============================================================
   🎨 COMPONENT
   ============================================================ */

const LandingPage = () => {
  const navigate = useNavigate();

  // --- Centralized Redirect Logic (with admin support) ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('currentUser'));

    if (token && user) {
      // ✅ Admin → admin dashboard
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
        return;
      }

      // ✅ Generator
      if (user.role === 'generator') {
        if (user.isCompanyVerified) {
          navigate('/generator', { replace: true });
        } else if (user.isCompanyRegistered) {
          navigate('/waiting', { replace: true });
        } else {
          navigate('/register-company', { replace: true });
        }
        return;
      }

      // ✅ Buyer
      if (user.role === 'buyer') {
        if (user.isCompanyVerified) {
          navigate('/buyer', { replace: true });
        } else if (user.isCompanyRegistered) {
          navigate('/waiting', { replace: true });
        } else {
          navigate('/register-company', { replace: true });
        }
      }
    }
  }, [navigate]);

  // --- State ---
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // AI modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [aiWasteDesc, setAiWasteDesc] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const [contactForm, setContactForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  const slideInterval = useRef(null);
  const totalSlides = 3;

  const categories = [
    { id: 1, title: 'Plastic Scrap', image: 'https://images.jdmagicbox.com/quickquotes/images_main/plastic-scrap-2215023708-2athf4si.jpg', tags: ['PET', 'HDPE'] },
    { id: 2, title: 'Metal Scrap', image: 'https://tiimg.tistatic.com/fp/1/008/546/100-recycled-eco-friendly-industrial-grade-heavy-metal-scrap-585.jpg', tags: ['Steel', 'Aluminium'] },
    { id: 3, title: 'Textile Waste', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1QuvaECD5QbU3thLsri9z8pdIuGHmm3cAN3P2-ydLkb0HyxxjfXIq0Gc&s=10', tags: ['Cotton', 'Fabric'] },
    { id: 4, title: 'Paper Waste', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_r4fvo7you3sNdN_OtOMFJJuf5D5K3fk_hqHpilnPaXkFvF2_Uv3XAkA&s=10', tags: ['Cardboard', 'Newsprint'] },
    { id: 5, title: 'Wood Scrap', image: 'https://5.imimg.com/data5/SELLER/Default/2025/9/544019610/FN/WH/BV/59321860/waste-wooden-scrap-250x250.jpg', tags: ['Sawdust', 'Pallets'] },
    { id: 6, title: 'Glass Scrap', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRecrfXQ2opE_wdDTGTbWdyanR4Wa4XsUNfFudNAyrCSKhfQYZnpa4_HBE-&s=10', tags: ['Bottles', 'Sheet'] },
  ];

  const partners = [
    {
      id: 1,
      name: 'Greenline Recyclers Pvt. Ltd.',
      image: 'https://images.unsplash.com/photo-1567113463300-102a7eb3cb26?w=800&h=500&fit=crop',
      description: 'Large-scale plastic and metal scrap aggregator, processing over 500 tonnes monthly with certified segregation and baling facilities.',
      contacts: [
        { name: 'Rakesh Patel', desc: 'Plant Manager — handles bulk PET and HDPE offtake agreements.' },
        { name: 'Ananya Shah', desc: 'Sustainability Lead — manages compliance and buyer verification.' },
      ],
    },
    {
      id: 2,
      name: 'Bhoomi Textile Reclaim',
      image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&h=500&fit=crop',
      description: 'Specialists in cotton and fabric waste reprocessing, supplying shredded textile feedstock to spinning mills across Gujarat.',
      contacts: [
        { name: 'Meera Joshi', desc: 'Procurement Head — sources textile cuttings and end-of-roll waste.' },
        { name: 'Sameer Vora', desc: 'Quality Analyst — grades incoming fabric batches.' },
      ],
    },
    {
      id: 3,
      name: 'Suraksha Metal Works',
      image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=500&fit=crop',
      description: 'Certified steel and aluminium scrap buyer with foundry-direct pricing and same-week pickup across Western India.',
      contacts: [
        { name: 'Vikram Solanki', desc: 'Buyer Relations — negotiates rate contracts for ferrous scrap.' },
        { name: 'Priya Nair', desc: 'Logistics Coordinator — schedules pickup and weighbridge slots.' },
      ],
    },
  ];

  const featureSlides = [
    [
      { title: 'AI Material Classification', desc: 'Upload a photo or description and our model identifies material type, grade, and estimated purity in seconds.', icon: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=300&h=300&fit=crop' },
      { title: 'Buyer Matching Engine', desc: 'We rank verified buyers by material fit, price, quantity needs, and distance so you never chase leads manually.', icon: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&h=300&fit=crop' },
      { title: 'Secure Transactions', desc: 'Escrow-backed payments and digital contracts protect both sides until pickup and delivery are confirmed.', icon: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=300&h=300&fit=crop' },
    ],
    [
      { title: 'Verified Marketplace', desc: 'Every seller and buyer completes a KYC and facility verification step before their first transaction.', icon: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=300&fit=crop' },
      { title: 'Real-Time Analytics', desc: 'Track live scrap prices, demand trends, and your own transaction history from one dashboard.', icon: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&h=300&fit=crop' },
      { title: 'Compliance Documentation', desc: 'Auto-generate weighbridge slips, manifests, and pollution board paperwork for every trade.', icon: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=300&h=300&fit=crop' },
    ],
    [
      { title: 'Location-Based Sourcing', desc: 'Filter listings by radius so pickup and freight costs stay predictable on every deal.', icon: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=300&h=300&fit=crop' },
      { title: 'Price Intelligence', desc: 'Historical and regional pricing data helps you negotiate from a position backed by real numbers.', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&h=300&fit=crop' },
      { title: 'Mobile Access', desc: 'List material, respond to offers, and track pickups from the field with our mobile-friendly platform.', icon: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=300&h=300&fit=crop' },
    ],
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const sections = document.querySelectorAll('.reveal-section');
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) {
          section.classList.add('visible');
        }
      });
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    startAutoSlide();
    return () => clearInterval(slideInterval.current);
  }, []);

  const startAutoSlide = () => {
    clearInterval(slideInterval.current);
    slideInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 5000);
  };
  const pauseAutoSlide = () => clearInterval(slideInterval.current);
  const resumeAutoSlide = () => startAutoSlide();
  const goToSlide = (index) => setCurrentSlide(index);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  /* ---------- 🤖 AI Classifier handler ---------- */
  const handleAISuggestion = () => {
    setAiError('');
    if (!aiWasteDesc.trim() || aiWasteDesc.trim().length < 5) {
      setAiError('Please describe your material in a few words (min 5 characters).');
      return;
    }

    setAiLoading(true);
    setAiResult(null);

    // Simulate brief "thinking" latency for UX (feels like real AI)
    setTimeout(() => {
      try {
        const result = classifyWaste(aiWasteDesc);
        if (!result || result.top.composite === 0) {
          setAiError(
            "Our classifier couldn't identify a clear material match. Try adding details like 'plastic bottles', 'steel scrap', 'cotton fabric', etc."
          );
        } else {
          setAiResult(result);
        }
      } catch (e) {
        setAiError('Something went wrong while classifying. Please try again.');
      } finally {
        setAiLoading(false);
      }
    }, 700);
  };

  const resetAIModal = () => {
    setAiWasteDesc('');
    setAiResult(null);
    setAiError('');
    setAiLoading(false);
  };

  const handleExampleFill = (text) => {
    setAiWasteDesc(text);
    setAiResult(null);
    setAiError('');
  };

  /* ---------- Contact form ---------- */
  const validateForm = () => {
    const errors = {};
    if (!contactForm.fullName.trim()) errors.fullName = 'Full name is required.';
    if (!contactForm.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(contactForm.email)) {
      errors.email = 'Enter a valid email address.';
    }
    if (!contactForm.subject) errors.subject = 'Please select a subject.';
    if (!contactForm.message.trim()) errors.message = 'Message cannot be empty.';
    return errors;
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setFormSubmitting(true);
    setFormMessage('');

    try {
      const res = await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFormMessage(data.msg || 'Thank you! We will get back to you within 24 hours.');
        setContactForm({ fullName: '', email: '', phone: '', subject: '', message: '' });
        // Auto-hide success message after 6 seconds
        setTimeout(() => setFormMessage(''), 6000);
      } else {
        setFormErrors({ general: data.msg || 'Failed to send message. Please try again.' });
      }
    } catch (err) {
      console.error('Contact form error:', err);
      setFormErrors({ general: 'Cannot connect to server. Please try again.' });
    } finally {
      setFormSubmitting(false);
    }
  };

  {
    formMessage && (
      <div className="form-status form-status-success">{formMessage}</div>
    )
  }
  {
    formErrors.general && (
      <div className="form-status form-status-error">{formErrors.general}</div>
    )
  }

  const EXAMPLE_PROMPTS = [
    'Mixed PET bottles from a bottling plant, roughly 2 tonnes',
    'Steel turnings and shavings from a CNC workshop',
    'Cotton fabric cuttings from a garment factory',
    'Old corrugated cardboard boxes from warehouse',
    'Aluminium window frames from a demolition site',
  ];

  return (
    <div className="delviix-container">
      <div className="bg-gradient"></div>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
      <div className="grid-overlay"></div>
      <div className="noise-overlay"></div>

      <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
        <div className="header-content">
          <div className="logo">♻️ WasteExchange AI</div>
          <nav className="nav-menu">
            <a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>Home</a>
            <div
              className="dropdown-container"
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <span className="dropdown-trigger">Categories ▾</span>
              {isDropdownOpen && (
                <div className="dropdown-menu">
                  {categories.map((cat) => (
                    <a key={cat.id} href={`#${cat.title.toLowerCase().replace(/\s+/g, '-')}`} className="dropdown-item">
                      {cat.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
            <a href="#partners" onClick={(e) => { e.preventDefault(); scrollToSection('partners'); }}>Partners</a>
            <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>About Us</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Contact Us</a>
            <Link to="/login" className="nav-contact">Login</Link>
            <Link to="/signup" className="nav-contact" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none' }}>Sign Up</Link>
          </nav>
        </div>
      </header>

      <section className="hero" id="home">
        <div className="hero-wrapper">
          <div className="hero-left">
            <h1 className="hero-title">
              Industrial Waste <br />
              Meets <span style={{ background: 'linear-gradient(135deg,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI Intelligence</span>
            </h1>
            <p className="hero-description">
              Connect waste generators with verified buyers using AI-powered material classification and intelligent matchmaking.
            </p>

            <div className="hero-search-bar">
              <input type="text" className="hero-search-input" placeholder="Search for materials, buyers, or sellers..." />
              <button className="hero-search-btn">Search</button>
              <button className="hero-ai-btn" onClick={() => setModalOpen(true)}>AI Waste Classifier</button>
            </div>

            <Link to="/signup"><button className="hero-button">Get Started →</button></Link>
          </div>
          <div className="hero-right">
            <div className="templates-grid">
              {categories.map((cat) => (
                <div key={cat.id} className="template-card" id={cat.title.toLowerCase().replace(/\s+/g, '-')}>
                  <div className="template-image"><img src={cat.image} alt={cat.title} /></div>
                  <div className="template-info"><h4>{cat.title}</h4><div className="template-tags">{cat.tags.map((t, i) => <span key={i} className="tech-tag">{t}</span>)}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="about-section reveal-section" id="about">
        <div className="section-container">
          <h2 className="section-title">About <span className="highlight">WasteExchange AI</span></h2>

          <div className="about-grid">
            <div className="about-text">
              <h3 className="about-subtitle">🌍 Our Mission</h3>
              <p>
                WasteExchange AI is a revolutionary B2B platform designed to transform the way industries manage their waste.
                We believe that waste is not an endpoint but a new beginning — one industry's waste is another's valuable raw material.
              </p>

              <h3 className="about-subtitle">🤖 How It Works</h3>
              <p>
                Our platform uses advanced <strong>AI-powered material classification</strong> to automatically categorize waste
                based on description, quality, and composition. The <strong>intelligent matching engine</strong> then finds the
                most suitable buyers based on material type, quantity, price, condition, and location.
              </p>

              <h3 className="about-subtitle">💡 Why Choose Us</h3>
              <ul className="about-features">
                <li>✅ <strong>AI-Driven</strong> — Automatic waste classification and smart recommendations</li>
                <li>✅ <strong>Transparent</strong> — Clear commission structure and transaction tracking</li>
                <li>✅ <strong>Sustainable</strong> — Promote circular economy and reduce environmental impact</li>
                <li>✅ <strong>Efficient</strong> — Connect with verified buyers and sellers instantly</li>
                <li>✅ <strong>Secure</strong> — Role-based access and data privacy protection</li>
              </ul>
            </div>
            <div className="about-image">
              <div className="about-placeholder">
                <div className="placeholder-content">
                  <span style={{ fontSize: '4rem', display: 'block' }}>♻️</span>
                  <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.4)' }}>Circular Economy</span>
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.5rem' }}>
                    Waste → Resource
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <img src="https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=300&h=300&fit=crop" alt="Material streams" />
              <h3>Broader Material Streams</h3>
              <p>From plastics to metals, list and source across six major waste categories from a single dashboard.</p>
            </div>
            <div className="stat-card">
              <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=300&fit=crop" alt="Verified network" />
              <h3>Verified Buyer Network</h3>
              <p>Every buyer completes KYC and facility checks, so your material goes to a legitimate, traceable destination.</p>
            </div>
            <div className="stat-card">
              <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&h=300&fit=crop" alt="Analytics" />
              <h3>AI-Powered Insights</h3>
              <p>Live pricing trends and demand forecasts help you time listings and negotiate with confidence.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section reveal-section" id="features">
        <div className="section-container">
          <h2 className="section-title">Key <span className="highlight">Features</span></h2>

          <div className="feature-hero">
            <div className="feature-hero-text">
              <h3>Intelligent Material Classification</h3>
              <p>Describe or photograph your scrap and our model identifies material type, grade, and an estimated fair price — no manual cataloguing needed.</p>
              <button className="hero-button" onClick={() => setModalOpen(true)}>Try the AI Classifier</button>
            </div>
            <div className="feature-hero-image">
              <img src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=500&fit=crop" alt="AI material classification" />
            </div>
          </div>

          <div className="slider-container" onMouseEnter={pauseAutoSlide} onMouseLeave={resumeAutoSlide}>
            <div className="slider-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {featureSlides.map((slide, idx) => (
                <div key={idx} className="slider-slide">
                  {slide.map((feature, fIdx) => (
                    <div key={fIdx} className="feature-card">
                      <img src={feature.icon} alt={feature.title} />
                      <h3>{feature.title}</h3>
                      <p>{feature.desc}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="slider-dots">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={`slider-dot ${currentSlide === idx ? 'active' : ''}`}
                  onClick={() => goToSlide(idx)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="partners-section reveal-section" id="partners">
        <div className="section-container">
          <h2 className="section-title">Our Verified <span className="highlight">Partners</span></h2>
          <p className="section-subtitle">
            Browse verified sellers and buyers already trading on WasteExchange AI, complete with facility details and key contacts.
          </p>
          <div className="partners-grid">
            {partners.map((partner) => (
              <div key={partner.id} className="partner-card">
                <img className="partner-image" src={partner.image} alt={partner.name} />
                <h3>{partner.name}</h3>
                <p>{partner.description}</p>
                <ul className="partner-contacts">
                  {partner.contacts.map((c, idx) => (
                    <li key={idx}>
                      <strong>{c.name}</strong>
                      <span>{c.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="how-it-works-section reveal-section" id="how-it-works">
        <div className="section-container">
          <h2 className="section-title">How It <span className="highlight">Works</span></h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&h=200&fit=crop" alt="List your material" />
              <h3>List Your Material</h3>
              <p>Add quantity, condition, and photos of your scrap through our secure listing portal.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <img src="https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=200&h=200&fit=crop" alt="AI classification" />
              <h3>AI Classification</h3>
              <p>Our model categorizes the material and suggests a fair market price range instantly.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&h=200&fit=crop" alt="Get matched" />
              <h3>Get Matched</h3>
              <p>Review ranked buyer offers based on price, quantity fit, and pickup distance.</p>
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <img src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=200&h=200&fit=crop" alt="Track transaction" />
              <h3>Track & Complete</h3>
              <p>Confirm pickup, release escrow payment, and download compliance documents.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-section reveal-section" id="contact">
        <div className="section-container">
          <h2 className="section-title">Get in <span className="highlight">Touch</span></h2>
          <p className="contact-subtitle">
            Have questions? We'd love to hear from you. Reach out to us anytime.
          </p>

          <div className="contact-grid">
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <div>
                  <h4>Visit Our Office</h4>
                  <p>WasteExchange AI Headquarters</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                    B-201, S.G. Highway,<br />
                    Ahmedabad, Gujarat 380054<br />
                    India
                  </p>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <div>
                  <h4>Email Us</h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)' }}>info@wasteexchange.ai</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>support@wasteexchange.ai</p>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <div>
                  <h4>Call Us</h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)' }}>+91 98765 43210</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                    Mon-Fri: 9:00 AM - 6:00 PM
                  </p>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-icon">🕐</span>
                <div>
                  <h4>Working Hours</h4>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                    Monday - Friday: 9:00 AM - 6:00 PM<br />
                    Saturday: 10:00 AM - 2:00 PM<br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>

            <form className="contact-form" onSubmit={handleContactSubmit} noValidate>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Send Us a Message</h4>

              {formMessage && (
                <div className="form-status form-status-success">{formMessage}</div>
              )}

              <input
                type="text"
                placeholder="Your Full Name"
                className="form-input"
                value={contactForm.fullName}
                onChange={(e) => setContactForm({ ...contactForm, fullName: e.target.value })}
              />
              {formErrors.fullName && <span className="form-error">{formErrors.fullName}</span>}

              <input
                type="email"
                placeholder="Your Email Address"
                className="form-input"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              />
              {formErrors.email && <span className="form-error">{formErrors.email}</span>}

              <input
                type="tel"
                placeholder="Phone Number (optional)"
                className="form-input"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
              />

              <select
                className="form-input"
                value={contactForm.subject}
                onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
              >
                <option value="">Select Subject</option>
                <option value="general">General Inquiry</option>
                <option value="listing">Listing / Material Question</option>
                <option value="technical">Technical Issue</option>
                <option value="partnership">Partnership Inquiry</option>
              </select>
              {formErrors.subject && <span className="form-error">{formErrors.subject}</span>}

              <textarea
                placeholder="Tell us how we can help..."
                rows="5"
                className="form-input"
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
              />
              {formErrors.message && <span className="form-error">{formErrors.message}</span>}

              <button type="submit" className="login-submit-btn" style={{ width: '100%' }} disabled={formSubmitting}>
                {formSubmitting ? 'Sending...' : 'Send Message →'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">♻️ WasteExchange AI</div>
            <p className="footer-tagline">
              Transforming industrial waste management through AI-powered intelligence.
            </p>
            <div className="footer-social">
              <a href="/" aria-label="LinkedIn" title="LinkedIn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              <a href="/" aria-label="Twitter" title="Twitter / X">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="/" aria-label="YouTube" title="YouTube">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
              </a>
              <a href="/" aria-label="GitHub" title="GitHub">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.381 1.235-3.221-.123-.3-.535-1.52.117-3.16 0 0 1.008-.322 3.3 1.23.96-.267 1.98-.399 3-.399s2.04.132 3 .399c2.292-1.552 3.3-1.23 3.3-1.23.653 1.64.24 2.86.118 3.16.768.84 1.233 1.91 1.233 3.221 0 4.61-2.804 5.62-5.476 5.92.43.37.824 1.1.824 2.22 0 1.602-.015 2.894-.015 3.287 0 .32.216.694.825.577C20.565 21.795 24 17.3 24 12c0-6.627-5.373-12-12-12z" /></svg>
              </a>
            </div>
          </div>

          <div className="footer-links-group">
            <h4>Quick Links</h4>
            <div className="footer-links">
              <a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>Home</a>
              <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>About Us</a>
              <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
              <a href="#partners" onClick={(e) => { e.preventDefault(); scrollToSection('partners'); }}>Partners</a>
              <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }}>How It Works</a>
              <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Contact</a>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign Up</Link>
            </div>
          </div>

          <div className="footer-links-group">
            <h4>Contact Us</h4>
            <div className="footer-links">
              <span>Email: info@wasteexchange.ai</span>
              <span>Phone: +91 98765 43210</span>
              <span>Address: B-201, S.G. Highway, Ahmedabad, Gujarat 380054</span>
              <span>Support: Mon-Fri, 9AM-6PM IST</span>
            </div>
          </div>

          <div className="footer-links-group">
            <h4>Legal</h4>
            <div className="footer-links">
              <a href="/">Privacy Policy</a>
              <a href="/">Terms of Service</a>
              <a href="/">Cookie Policy</a>
              <a href="/">GDPR Compliance</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} WasteExchange AI. All rights reserved.
            <br />
            Built with ♻️ for a sustainable future.
          </p>
        </div>
      </footer>

      {/* ============================================================
          🤖 AI WASTE CLASSIFIER MODAL
          ============================================================ */}
      {modalOpen && (
        <div className="ai-modal-overlay" onClick={() => { setModalOpen(false); resetAIModal(); }}>
          <div className="ai-modal-content ai-modal-wide" onClick={(e) => e.stopPropagation()}>
            <span className="ai-modal-close" onClick={() => { setModalOpen(false); resetAIModal(); }}>&times;</span>

            <div className="ai-modal-header">
              <div className="ai-modal-badge">
                <i className="fas fa-robot"></i>
                <span>AI Classifier</span>
              </div>
              <h3>Instant Waste Material Classification</h3>
              <p className="ai-modal-subtitle">
                Powered by <strong>TF-IDF vectorization + Cosine Similarity</strong> across 9 material categories.
                Describe your material and get an instant classification with confidence score.
              </p>
            </div>

            {/* Input Section */}
            <div className="ai-modal-input-section">
              <label className="ai-input-label">
                <i className="fas fa-pen"></i> Describe your material
              </label>
              <textarea
                className="ai-modal-input"
                rows="3"
                placeholder="e.g., Mixed PET bottles from a bottling plant, roughly 2 tonnes..."
                value={aiWasteDesc}
                onChange={(e) => { setAiWasteDesc(e.target.value); setAiError(''); }}
                disabled={aiLoading}
                maxLength={500}
              />
              <div className="ai-input-meta">
                <span className="ai-char-count">{aiWasteDesc.length}/500</span>
              </div>

              {/* Example chips */}
              {!aiResult && !aiLoading && (
                <div className="ai-examples">
                  <span className="ai-examples-label">Try an example:</span>
                  <div className="ai-examples-chips">
                    {EXAMPLE_PROMPTS.slice(0, 3).map((p, i) => (
                      <button key={i} className="ai-example-chip" onClick={() => handleExampleFill(p)}>
                        {p.length > 45 ? p.slice(0, 45) + '…' : p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="ai-classify-btn"
                onClick={handleAISuggestion}
                disabled={aiLoading || !aiWasteDesc.trim()}
              >
                {aiLoading ? (
                  <>
                    <span className="ai-btn-spinner"></span>
                    Analyzing with AI…
                  </>
                ) : (
                  <>
                    <i className="fas fa-bolt"></i>
                    Classify Material
                  </>
                )}
              </button>

              {aiError && (
                <div className="ai-error">
                  <i className="fas fa-exclamation-triangle"></i>
                  {aiError}
                </div>
              )}
            </div>

            {/* Results */}
            {aiResult && (
              <div className="ai-results">
                {/* Top match */}
                <div className="ai-top-match" style={{ borderColor: aiResult.top.color }}>
                  <div className="ai-top-match-header">
                    <div className="ai-top-match-icon" style={{ background: aiResult.top.color + '22', color: aiResult.top.color }}>
                      <span>{aiResult.top.icon}</span>
                    </div>
                    <div className="ai-top-match-info">
                      <div className="ai-top-match-label">
                        <i className="fas fa-star"></i> Top Match
                      </div>
                      <h4 style={{ color: aiResult.top.color }}>{aiResult.top.category}</h4>
                      <p className="ai-top-match-price">Est. market price: <strong>{aiResult.top.avgPrice}</strong></p>
                    </div>
                    <div className="ai-confidence-badge" style={{ background: aiResult.top.color }}>
                      {aiResult.confidence}%
                      <small>confidence</small>
                    </div>
                  </div>

                  {/* Score breakdown */}
                  <div className="ai-score-breakdown">
                    <div className="ai-score-row">
                      <span className="ai-score-label">📐 Text Similarity (TF-IDF)</span>
                      <div className="ai-score-bar">
                        <div className="ai-score-fill" style={{ width: `${aiResult.top.textSim}%`, background: aiResult.top.color }}></div>
                      </div>
                      <span className="ai-score-value">{aiResult.top.textSim}%</span>
                    </div>
                    <div className="ai-score-row">
                      <span className="ai-score-label">🎯 Keyword Match (Rule-based)</span>
                      <div className="ai-score-bar">
                        <div className="ai-score-fill" style={{ width: `${aiResult.top.keywordScore}%`, background: aiResult.top.color }}></div>
                      </div>
                      <span className="ai-score-value">{aiResult.top.keywordScore}%</span>
                    </div>
                  </div>

                  {/* Detected subtypes */}
                  {aiResult.top.detectedSubtypes.length > 0 && (
                    <div className="ai-detected-subtypes">
                      <span className="ai-detected-label">
                        <i className="fas fa-tag"></i> Detected subtypes:
                      </span>
                      <div className="ai-subtype-chips">
                        {aiResult.top.detectedSubtypes.map((s, i) => (
                          <span key={i} className="ai-subtype-chip" style={{ borderColor: aiResult.top.color + '55', color: aiResult.top.color }}>
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested subtypes */}
                  {aiResult.top.detectedSubtypes.length === 0 && (
                    <div className="ai-detected-subtypes">
                      <span className="ai-detected-label">
                        <i className="fas fa-list"></i> Common subtypes:
                      </span>
                      <div className="ai-subtype-chips">
                        {aiResult.top.allSubtypes.slice(0, 4).map((s, i) => (
                          <span key={i} className="ai-subtype-chip">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matched keywords */}
                  {aiResult.top.hitKeywords.length > 0 && (
                    <div className="ai-keywords-matched">
                      <i className="fas fa-check-circle"></i>
                      Matched on: {aiResult.top.hitKeywords.slice(0, 5).join(', ')}
                      {aiResult.top.hitKeywords.length > 5 && ` +${aiResult.top.hitKeywords.length - 5} more`}
                    </div>
                  )}
                </div>

                {/* Alternatives */}
                {aiResult.alternatives.length > 0 && (
                  <div className="ai-alternatives">
                    <h5 className="ai-alt-title">
                      <i className="fas fa-layer-group"></i> Other possible matches
                    </h5>
                    <div className="ai-alt-list">
                      {aiResult.alternatives.map((alt, i) => (
                        <div key={i} className="ai-alt-item">
                          <span className="ai-alt-icon" style={{ background: alt.color + '22', color: alt.color }}>
                            {alt.icon}
                          </span>
                          <div className="ai-alt-info">
                            <strong>{alt.category}</strong>
                            <span className="ai-alt-price">{alt.avgPrice}</span>
                          </div>
                          <div className="ai-alt-score" style={{ color: alt.color }}>
                            {alt.composite}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="ai-result-cta">
                  <button
                    className="ai-btn-secondary"
                    onClick={() => { setAiResult(null); setAiWasteDesc(''); }}
                  >
                    <i className="fas fa-redo"></i> Try Another
                  </button>
                  <Link
                    to="/signup"
                    className="ai-btn-primary"
                    onClick={() => { setModalOpen(false); resetAIModal(); }}
                  >
                    List This Material <i className="fas fa-arrow-right"></i>
                  </Link>
                </div>

                <div className="ai-disclaimer">
                  <i className="fas fa-info-circle"></i>
                  <span>
                    AI classification is an estimate. Final category, grade, and price are confirmed by buyers upon inspection.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- Scoped CSS for the AI modal ---------- */}
      <style>{`
        /* ========== AI MODAL BASE ========== */
        .ai-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.78);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 10000;
          padding: 20px;
          animation: aiFadeIn 0.25s ease;
        }
        @keyframes aiFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .ai-modal-content {
          background: linear-gradient(160deg, #1a1a2e 0%, #16162a 100%);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 20px;
          padding: 28px;
          max-width: 480px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 20px 60px rgba(99, 102, 241, 0.25), 0 0 0 1px rgba(255,255,255,0.04) inset;
          animation: aiSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: 'Inter', sans-serif;
          color: #e5e7eb;
        }
        .ai-modal-wide { max-width: 620px; }
        @keyframes aiSlideUp {
          from { transform: translateY(24px) scale(0.97); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }

        .ai-modal-content::-webkit-scrollbar { width: 6px; }
        .ai-modal-content::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.35); border-radius: 3px;
        }

        .ai-modal-close {
          position: absolute;
          top: 14px; right: 18px;
          font-size: 1.8rem;
          color: #6b7280;
          cursor: pointer;
          line-height: 1;
          transition: color 0.2s;
          z-index: 2;
        }
        .ai-modal-close:hover { color: #e5e7eb; }

        /* ========== HEADER ========== */
        .ai-modal-header { margin-bottom: 20px; }

        .ai-modal-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(139, 92, 246, 0.15);
          color: #a78bfa;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          border: 1px solid rgba(139, 92, 246, 0.3);
          margin-bottom: 12px;
        }
        .ai-modal-badge i { font-size: 0.75rem; }

        .ai-modal-header h3 {
          margin: 0 0 8px;
          font-size: 1.35rem;
          font-weight: 800;
          color: #fff;
          line-height: 1.25;
          letter-spacing: -0.3px;
        }

        .ai-modal-subtitle {
          margin: 0;
          font-size: 0.83rem;
          color: #9ca3af;
          line-height: 1.55;
        }
        .ai-modal-subtitle strong { color: #a78bfa; }

        /* ========== INPUT ========== */
        .ai-modal-input-section { margin-bottom: 20px; }

        .ai-input-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          color: #d1d5db;
          margin-bottom: 8px;
        }
        .ai-input-label i { color: #8b5cf6; }

        .ai-modal-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 0.9rem;
          color: #fff;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s, box-shadow 0.2s;
          line-height: 1.5;
        }
        .ai-modal-input:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
          background: rgba(255, 255, 255, 0.05);
        }
        .ai-modal-input::placeholder { color: #4b5563; }
        .ai-modal-input:disabled { opacity: 0.6; cursor: not-allowed; }

        .ai-input-meta {
          display: flex; justify-content: flex-end;
          margin-top: 4px;
        }
        .ai-char-count { font-size: 0.68rem; color: #6b7280; }

        /* ========== EXAMPLES ========== */
        .ai-examples { margin-top: 12px; }
        .ai-examples-label {
          display: block;
          font-size: 0.7rem;
          color: #6b7280;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          font-weight: 600;
        }
        .ai-examples-chips {
          display: flex; flex-wrap: wrap; gap: 6px;
        }
        .ai-example-chip {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #9ca3af;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.72rem;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
          text-align: left;
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ai-example-chip:hover {
          background: rgba(139, 92, 246, 0.12);
          color: #a78bfa;
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateY(-1px);
        }

        /* ========== CLASSIFY BUTTON ========== */
        .ai-classify-btn {
          width: 100%;
          margin-top: 16px;
          padding: 13px 20px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.92rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
          font-family: inherit;
        }
        .ai-classify-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(99, 102, 241, 0.5);
        }
        .ai-classify-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .ai-btn-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: aiSpin 0.7s linear infinite;
        }
        @keyframes aiSpin { to { transform: rotate(360deg); } }

        /* ========== ERROR ========== */
        .ai-error {
          margin-top: 12px;
          padding: 11px 14px;
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.3);
          color: #f87171;
          border-radius: 10px;
          font-size: 0.82rem;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: aiSlideUp 0.3s ease;
        }

        /* ========== RESULTS ========== */
        .ai-results {
          margin-top: 22px;
          padding-top: 22px;
          border-top: 1px dashed rgba(255, 255, 255, 0.08);
          animation: aiSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Top Match Card */
        .ai-top-match {
          background: rgba(255, 255, 255, 0.03);
          border: 1.5px solid;
          border-radius: 14px;
          padding: 18px;
          position: relative;
          overflow: hidden;
        }
        .ai-top-match::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #60a5fa);
        }

        .ai-top-match-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }

        .ai-top-match-icon {
          width: 56px; height: 56px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.7rem;
          flex-shrink: 0;
        }

        .ai-top-match-info { flex: 1; min-width: 0; }

        .ai-top-match-label {
          font-size: 0.65rem;
          color: #fbbf24;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          display: flex; align-items: center; gap: 4px;
          margin-bottom: 3px;
        }
        .ai-top-match-info h4 {
          margin: 0 0 4px;
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: -0.3px;
        }
        .ai-top-match-price {
          margin: 0;
          font-size: 0.78rem;
          color: #9ca3af;
        }
        .ai-top-match-price strong { color: #22c55e; }

        .ai-confidence-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 800;
          font-size: 1.3rem;
          padding: 10px 14px;
          border-radius: 12px;
          min-width: 78px;
          line-height: 1;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
        }
        .ai-confidence-badge small {
          font-size: 0.55rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.85;
          margin-top: 3px;
        }

        /* Score Breakdown */
        .ai-score-breakdown {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 14px;
          padding: 12px 14px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .ai-score-row {
          display: grid;
          grid-template-columns: 140px 1fr 42px;
          align-items: center;
          gap: 10px;
        }
        .ai-score-label {
          font-size: 0.7rem;
          color: #9ca3af;
          font-weight: 600;
        }
        .ai-score-bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 3px;
          overflow: hidden;
        }
        .ai-score-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ai-score-value {
          font-size: 0.75rem;
          font-weight: 700;
          color: #d1d5db;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        /* Subtypes */
        .ai-detected-subtypes {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }
        .ai-detected-label {
          font-size: 0.72rem;
          color: #9ca3af;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ai-detected-label i { color: #8b5cf6; }
        .ai-subtype-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .ai-subtype-chip {
          padding: 4px 11px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 0.72rem;
          font-weight: 600;
          color: #d1d5db;
        }

        /* Matched keywords */
        .ai-keywords-matched {
          font-size: 0.72rem;
          color: #22c55e;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(34, 197, 94, 0.08);
          border-radius: 8px;
          border: 1px solid rgba(34, 197, 94, 0.15);
          line-height: 1.4;
        }

        /* Alternatives */
        .ai-alternatives { margin-top: 18px; }
        .ai-alt-title {
          font-size: 0.78rem;
          color: #9ca3af;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 10px;
          display: flex; align-items: center; gap: 6px;
        }
        .ai-alt-title i { color: #8b5cf6; }

        .ai-alt-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ai-alt-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          transition: 0.15s;
        }
        .ai-alt-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(139, 92, 246, 0.2);
        }
        .ai-alt-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.15rem;
          flex-shrink: 0;
        }
        .ai-alt-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .ai-alt-info strong {
          font-size: 0.85rem;
          color: #e5e7eb;
          font-weight: 700;
        }
        .ai-alt-price {
          font-size: 0.7rem;
          color: #6b7280;
        }
        .ai-alt-score {
          font-size: 0.9rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }

        /* CTA */
        .ai-result-cta {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        .ai-btn-primary, .ai-btn-secondary {
          flex: 1;
          padding: 12px 16px;
          border-radius: 11px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition: 0.2s;
          font-family: inherit;
          text-decoration: none;
          border: none;
        }
        .ai-btn-primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
        }
        .ai-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.5);
        }
        .ai-btn-secondary {
          background: rgba(255, 255, 255, 0.04);
          color: #e5e7eb;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .ai-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }

        /* Disclaimer */
        .ai-disclaimer {
          margin-top: 14px;
          padding: 10px 12px;
          background: rgba(96, 165, 250, 0.06);
          border: 1px solid rgba(96, 165, 250, 0.15);
          border-radius: 9px;
          font-size: 0.7rem;
          color: #93c5fd;
          display: flex;
          gap: 8px;
          line-height: 1.5;
        }
        .ai-disclaimer i { flex-shrink: 0; margin-top: 2px; }

        /* Responsive */
        @media (max-width: 520px) {
          .ai-modal-content { padding: 22px; border-radius: 16px; }
          .ai-modal-header h3 { font-size: 1.15rem; }
          .ai-score-row { grid-template-columns: 1fr; gap: 4px; }
          .ai-score-value { text-align: left; }
          .ai-confidence-badge { font-size: 1.1rem; min-width: 68px; padding: 8px 10px; }
          .ai-result-cta { flex-direction: column; }
        }

        .form-status-error {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 0.85rem;
  margin-bottom: 12px;
}

.form-status-success {
  background: rgba(34, 197, 94, 0.12);
  color: #34d399;
  border: 1px solid rgba(34, 197, 94, 0.3);
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 0.85rem;
  margin-bottom: 12px;
}
      `}</style>
    </div>
  );
};

export default LandingPage;