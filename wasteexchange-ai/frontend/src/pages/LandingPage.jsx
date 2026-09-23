// src/pages/LandingPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../App.css';

const LandingPage = () => {
  const navigate = useNavigate();

  // --- Centralized Redirect Logic (with admin support) ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('currentUser'));

    if (token && user) {
      // 🔥 If admin, go directly to admin dashboard
      if (user.role === 'admin') {
        navigate('/admin');
        return;
      }

      // For buyer/generator roles
      if (user.isCompanyRegistered && user.isCompanyVerified) {
        const dashboardPath = user.role === 'generator' ? '/generator' : '/buyer';
        navigate(dashboardPath);
      } else if (user.isCompanyRegistered && !user.isCompanyVerified) {
        navigate('/waiting');
      } else {
        // Not registered yet → company registration
        navigate('/register-company');
      }
    }
    // If no token, stay on landing page (show login/signup buttons)
  }, [navigate]);

  // --- Rest of the component (same as before, unchanged) ---
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [aiWasteDesc, setAiWasteDesc] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');

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

  // Verified partner sellers/buyers on the platform
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

  // Feature slider content (3 features per slide)
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

  // --- Scroll effects (header shrink + section reveal) ---
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

  // --- Auto-sliding features carousel ---
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

  // --- AI Waste Classifier suggestion ---
  const handleAISuggestion = () => {
    if (!aiWasteDesc.trim()) return;
    const desc = aiWasteDesc.toLowerCase();
    let suggestion = 'Based on your description, this looks like ';
    if (desc.includes('bottle') || desc.includes('pet') || desc.includes('plastic')) {
      suggestion += '<strong>Plastic Scrap (PET/HDPE)</strong>. List it under Plastic Scrap — buyers typically request bale weight and colour sorting.';
    } else if (desc.includes('steel') || desc.includes('iron') || desc.includes('aluminium') || desc.includes('metal')) {
      suggestion += '<strong>Metal Scrap</strong>. List it under Metal Scrap — include grade and whether it is segregated by alloy.';
    } else if (desc.includes('fabric') || desc.includes('cloth') || desc.includes('cotton') || desc.includes('textile')) {
      suggestion += '<strong>Textile Waste</strong>. List it under Textile Waste — note fibre composition for the best buyer match.';
    } else if (desc.includes('paper') || desc.includes('cardboard') || desc.includes('carton')) {
      suggestion += '<strong>Paper Waste</strong>. List it under Paper Waste — dry, uncontaminated batches get the highest offers.';
    } else if (desc.includes('wood') || desc.includes('pallet') || desc.includes('sawdust')) {
      suggestion += '<strong>Wood Scrap</strong>. List it under Wood Scrap — mention if it is treated or untreated timber.';
    } else if (desc.includes('glass') || desc.includes('bottle glass')) {
      suggestion += '<strong>Glass Scrap</strong>. List it under Glass Scrap — colour-separated glass fetches better rates.';
    } else {
      suggestion += 'a mixed or specialty material. Our classification model will confirm the exact category once you upload photos in the listing form.';
    }
    setAiSuggestion(suggestion);
  };

  // --- Contact form handling ---
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

  const handleContactSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setFormSubmitting(true);
    setFormMessage('');

    // Replace with a real API.post('/contact/', contactForm) call when the backend endpoint is ready
    setTimeout(() => {
      setFormSubmitting(false);
      setFormMessage('Thank you for your message! We will get back to you within 24 hours.');
      setContactForm({ fullName: '', email: '', phone: '', subject: '', message: '' });
    }, 900);
  };

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

      {/* About Section */}
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

          {/* Impact stat cards */}
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

      {/* Features Section */}
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

      {/* Verified Partners Section */}
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

      {/* How It Works Section */}
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href="/" aria-label="Twitter" title="Twitter / X">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="/" aria-label="YouTube" title="YouTube">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="/" aria-label="GitHub" title="GitHub">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.381 1.235-3.221-.123-.3-.535-1.52.117-3.16 0 0 1.008-.322 3.3 1.23.96-.267 1.98-.399 3-.399s2.04.132 3 .399c2.292-1.552 3.3-1.23 3.3-1.23.653 1.64.24 2.86.118 3.16.768.84 1.233 1.91 1.233 3.221 0 4.61-2.804 5.62-5.476 5.92.43.37.824 1.1.824 2.22 0 1.602-.015 2.894-.015 3.287 0 .32.216.694.825.577C20.565 21.795 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
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

      {/* AI Waste Classifier Modal */}
      {modalOpen && (
        <div className="ai-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="ai-modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="ai-modal-close" onClick={() => setModalOpen(false)}>&times;</span>
            <h3>Get AI Waste Classification</h3>
            <p>Describe your material briefly:</p>
            <textarea
              className="ai-modal-input"
              rows="3"
              placeholder="e.g., Mixed PET bottles from a bottling plant, roughly 2 tonnes..."
              value={aiWasteDesc}
              onChange={(e) => setAiWasteDesc(e.target.value)}
            />
            <button className="hero-button" onClick={handleAISuggestion}>Generate Suggestion</button>
            {aiSuggestion && (
              <div className="ai-modal-suggestion" dangerouslySetInnerHTML={{ __html: aiSuggestion }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;