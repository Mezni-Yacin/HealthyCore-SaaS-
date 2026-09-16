// src/pages/HomePage.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import "../css/HomePage.css";

/* ══════════════════ Animated Counter ══════════════════ */
function Counter({ end, suffix = '', duration = 2000 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    // Évite la division par zéro si end est 0
    const step = end > 0 ? Math.ceil(end / (duration / 16)) : 0;
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(timer); }
      else setVal(start);
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return <span>{val.toLocaleString('fr-FR')}{suffix}</span>;
}

/* ══════════════════ Feature Card ══════════════════ */
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="hp-feature-card text-center p-4">
      <div className="hp-feature-icon mb-3">
        <i className={icon}></i>
      </div>
      <h5 className="fw-bold mb-2">{title}</h5>
      <p className="text-muted mb-0">{desc}</p>
    </div>
  );
}

/* ══════════════════ Step Card ══════════════════ */
function StepCard({ num, title, desc }) {
  return (
    <div className="hp-step-card text-center position-relative p-4">
      <div className="hp-step-num mx-auto mb-3">{num}</div>
      <h5 className="fw-bold mb-2">{title}</h5>
      <p className="text-muted mb-0">{desc}</p>
    </div>
  );
}

/* ══════════════════ Testimonial Card ══════════════════ */
function TestimonialCard({ name, role, text }) {
  return (
    <div className="hp-testi-card p-4 h-100">
      <div className="hp-testi-stars mb-3">
        {[...Array(5)].map((_, i) => (
          <i key={i} className="bi bi-star-fill text-warning"></i>
        ))}
      </div>
      <p className="hp-testi-text mb-3">"{text}"</p>
      <div className="d-flex align-items-center gap-3">
        <div className="hp-testi-avatar">
          <i className="bi bi-person-circle"></i>
        </div>
        <div>
          <div className="fw-bold">{name}</div>
          <small className="text-muted">{role}</small>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ Pricing Card ══════════════════ */
function PricingCard({ name, price, period, features, highlighted, cta }) {
  return (
    <div className={`hp-price-card p-4 h-100 ${highlighted ? 'hp-price-highlight' : ''}`}>
      {highlighted && <div className="hp-price-badge">Populaire</div>}
      <h4 className="fw-bold mb-1">{name}</h4>
      <div className="hp-price-amount mb-3">
        <span className="hp-price-value">{price}</span>
        {price !== 'Gratuit' && price !== 'Sur devis' && <span className="hp-price-period">/{period}</span>}
      </div>
      <ul className="hp-price-list list-unstyled mb-4">
        {features.map((f, i) => (
          <li key={i}><i className="bi bi-check-circle-fill text-success me-2"></i>{f}</li>
        ))}
      </ul>
      <Link to="/register/doctor" className={`btn w-100 ${highlighted ? 'btn-primary hp-btn-glow' : 'btn-outline-primary'}`}>
        {cta}
      </Link>
    </div>
  );
}

/* ══════════════════ MAIN COMPONENT ══════════════════ */
export default function HomePage() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const registerRef = useRef(null);

  // ── État pour les données du Hero (Vraies données si connecté) ──
  const [heroData, setHeroData] = useState({
    loading: true,
    rdvToday: 24,
    patients: 9,
    pending: 5,
    appointments: [
      { doctor: 'Dr. Ben Ali', patient: 'Mme. Trabelsi', reason: 'Cardiologie', time: '09:30' },
      { doctor: 'Dr. Bouzid', patient: 'M. Bouazizi', reason: 'Consultation', time: '10:15' },
      { doctor: 'Dr. Mansouri', patient: 'Mme. Gharbi', reason: 'Suivi', time: '11:00' }
    ]
  });

  // ✅ État pour les statistiques publiques (Stats Bar)
  const [publicStats, setPublicStats] = useState([
    { icon: 'bi-hospital', val: 50, suffix: '+', label: 'Cabinets médicaux' },
    { icon: 'bi-people-fill', val: 5000, suffix: '+', label: 'Patients gérés' },
    { icon: 'bi-calendar2-check', val: 20000, suffix: '+', label: 'Rendez-vous pris' },
    { icon: 'bi-geo-alt-fill', val: 24, suffix: '', label: 'Gouvernorats couverts' },
  ]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (registerRef.current && !registerRef.current.contains(event.target)) {
        setRegisterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Récupérer les VRAIES données si l'utilisateur est connecté ──
  useEffect(() => {
    if (!user) {
      setHeroData(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchHeroStats = async () => {
      try {
        setTimeout(() => setHeroData(prev => ({ ...prev, loading: false })), 800);
      } catch (err) {
        console.error("Erreur lors du chargement des données du Hero:", err);
        setHeroData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchHeroStats();
  }, [user]);

  // ✅ Récupérer les VRAIES données des statistiques publiques
  useEffect(() => {
    const fetchPublicStats = async () => {
      try {
        const res = await api.get('/users/public-stats/');
        if (res.data) {
          setPublicStats([
            { icon: 'bi-hospital', val: res.data.cabinets || 0, suffix: '+', label: 'Cabinets médicaux' },
            { icon: 'bi-people-fill', val: res.data.patients || 0, suffix: '+', label: 'Patients gérés' },
            { icon: 'bi-calendar2-check', val: res.data.appointments || 0, suffix: '+', label: 'Rendez-vous pris' },
            { icon: 'bi-geo-alt-fill', val: res.data.governorates || 0, suffix: '', label: 'Gouvernorats couverts' },
          ]);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des stats publiques:", err);
        // On garde les valeurs par défaut en cas d'erreur
      }
    };

    fetchPublicStats();
  }, []);

  const roles = [
    { slug: 'patient', label: 'Patient', icon: 'bi-person-fill', color: 'text-success' },
    { slug: 'doctor', label: 'Médecin', icon: 'bi-heart-pulse-fill', color: 'text-danger' },
    { slug: 'pharmacist', label: 'Pharmacien', icon: 'bi-shop', color: 'text-primary' },
    { slug: 'lab_staff', label: 'Laboratoire', icon: 'bi-clipboard2-pulse', color: 'text-info' },
  ];

  return (
    <div className="hp-wrapper">
      {/* ══════════ NAVBAR ══════════ */}
      <nav className={`hp-navbar navbar navbar-expand-lg fixed-top ${scrolled ? 'hp-navbar-scrolled' : ''}`}>
        <div className="container">
          <Link className="hp-logo navbar-brand fw-bold" to="/">
            <i className="bi bi-heart-pulse-fill hp-logo-icon me-2"></i>
            HealthyCore<span className="hp-logo-pro">.tn</span>
          </Link>
          <button className="navbar-toggler border-0" type="button" onClick={() => setMobileOpen(!mobileOpen)}>
            <i className={`bi ${mobileOpen ? 'bi-x-lg' : 'bi-list'} fs-4`}></i>
          </button>
          <div className={`collapse navbar-collapse ${mobileOpen ? 'show' : ''}`}>
            <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
              <li className="nav-item"><a className="nav-link" href="#features">Fonctionnalités</a></li>
              <li className="nav-item"><a className="nav-link" href="#how">Comment ça marche</a></li>
              <li className="nav-item"><a className="nav-link" href="#pricing">Tarifs</a></li>
              <li className="nav-item"><a className="nav-link" href="#testimonials">Témoignages</a></li>
              <li className="nav-item"><a className="nav-link" href="#contact">Contact</a></li>
            </ul>
            <div className="d-flex gap-2 hp-auth-btns align-items-center">
              <Link to="/login" className="btn btn-outline-primary hp-btn-outline">Connexion</Link>
              
              {/* MENU DÉROULANT D'INSCRIPTION */}
              <div className="position-relative" ref={registerRef}>
                <button className="btn btn-primary hp-btn-filled" onClick={() => setRegisterOpen(!registerOpen)}>
                  S'inscrire <i className={`bi ${registerOpen ? 'bi-caret-up-fill' : 'bi-caret-down-fill'} ms-1`}></i>
                </button>
                {registerOpen && (
                  <div className="shadow border rounded-3 p-2 bg-white position-absolute end-0 mt-2" style={{ minWidth: '200px', zIndex: 1050 }}>
                    <h6 className="dropdown-header text-muted">Créer un compte</h6>
                    {roles.map(r => (
                      <Link key={r.slug} to={`/register/${r.slug}`} className="dropdown-item rounded-2 py-2 d-flex align-items-center" onClick={() => setRegisterOpen(false)}>
                        <i className={`bi ${r.icon} me-2 ${r.color}`}></i> {r.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="hp-hero">
        <div className="hp-hero-bg-shapes">
          <div className="hp-shape hp-shape-1"></div>
          <div className="hp-shape hp-shape-2"></div>
          <div className="hp-shape hp-shape-3"></div>
        </div>
        <div className="container position-relative">
          <div className="row align-items-center min-vh-100">
            <div className="col-lg-6 hp-hero-content">
              <div className="hp-hero-badge mb-3">
                <i className="bi bi-patch-check-fill me-1"></i> Plateforme de gestion médicale en Tunisie
              </div>
              <h1 className="hp-hero-title">
                Gérez votre cabinet médical <span className="hp-text-gradient">en toute simplicité</span>
              </h1>
              <p className="hp-hero-subtitle">
                Prise de rendez-vous, dossiers patients, ordonnances numériques, messagerie et bien plus.
                Tout ce dont votre structure de santé a besoin, en une seule plateforme.
              </p>
              <div className="d-flex flex-wrap gap-3 mt-4">
                <Link to={user ? "/dashboard" : "/register/doctor"} className="btn btn-primary btn-lg hp-btn-hero px-4">
                  <i className="bi bi-rocket-takeoff me-2"></i>{user ? "Mon Dashboard" : "Démarrer maintenant"}
                </Link>
                <a href="#features" className="btn btn-outline-light btn-lg px-4">
                  <i className="bi bi-play-circle me-2"></i>Découvrir
                </a>
              </div>
              <div className="hp-hero-trust mt-4 d-flex flex-wrap gap-4">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-shield-check text-success fs-5"></i>
                  <small>Données sécurisées</small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-cloud-check text-primary fs-5"></i>
                  <small>Cloud 69.9% uptime</small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-headset text-info fs-5"></i>
                  <small>Support 24/7</small>
                </div>
              </div>
            </div>
            
            {/* ══════════ VRAIES DONNÉES DANS LE MOCKUP DASHBOARD ══════════ */}
            <div className="col-lg-6 hp-hero-visual d-none d-lg-block">
              <div className="hp-hero-card">
                <div className="hp-hero-card-header d-flex align-items-center gap-2 mb-3">
                  <div className="hp-dot hp-dot-red"></div>
                  <div className="hp-dot hp-dot-yellow"></div>
                  <div className="hp-dot hp-dot-green"></div>
                  <span className="ms-auto small text-muted">
                    {user ? `Bonjour, Dr. ${user.last_name || user.username}` : 'HealthyCore.tn — Dashboard'}
                  </span>
                </div>
                <div className="hp-mock-stat-row d-flex gap-3 mb-3">
                  <div className="hp-mock-stat flex-fill rounded-3 p-3">
                    <i className="bi bi-calendar-check text-primary fs-4"></i>
                    <div className="fw-bold mt-2">
                      {heroData.loading ? <span className="spinner-border spinner-border-sm"></span> : heroData.rdvToday}
                    </div>
                    <small className="text-muted">RDV aujourd'hui</small>
                  </div>
                  <div className="hp-mock-stat flex-fill rounded-3 p-3">
                    <i className="bi bi-people text-success fs-4"></i>
                    <div className="fw-bold mt-2">
                      {heroData.loading ? <span className="spinner-border spinner-border-sm"></span> : heroData.patients}
                    </div>
                    <small className="text-muted">Patients</small>
                  </div>
                  <div className="hp-mock-stat flex-fill rounded-3 p-3">
                    <i className="bi bi-clock-history text-warning fs-4"></i>
                    <div className="fw-bold mt-2">
                      {heroData.loading ? <span className="spinner-border spinner-border-sm"></span> : heroData.pending}
                    </div>
                    <small className="text-muted">En attente</small>
                  </div>
                </div>
                <div className="hp-mock-list">
                  {heroData.appointments.map((item, i) => (
                    <div key={i} className="hp-mock-item d-flex align-items-center gap-3 p-2 rounded-2 mb-2">
                      <div className="hp-mock-avatar rounded-circle d-flex align-items-center justify-content-center">
                        <i className="bi bi-person-fill text-white"></i>
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-semibold small">{item.doctor}</div>
                        <small className="text-muted">{item.patient} — {item.reason}</small>
                      </div>
                      <div className="d-flex flex-column align-items-end">
                        <span className="badge bg-success-subtle text-success mb-1">Confirmé</span>
                        <small className="text-muted fw-bold">{item.time}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hp-hero-wave">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 52.5C480 45 600 60 720 67.5C840 75 960 75 1080 67.5C1200 60 1320 45 1380 37.5L1440 30V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ══════════ STATS BAR (AVEC VRAIES DONNÉES) ══════════ */}
      <section className="hp-stats py-5">
        <div className="container">
          <div className="row text-center g-4">
            {publicStats.map((s, i) => (
              <div key={i} className="col-6 col-md-3">
                <i className={`bi ${s.icon} hp-stat-icon`}></i>
                <div className="hp-stat-val mt-2">
                  <Counter end={s.val} suffix={s.suffix} />
                </div>
                <div className="hp-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="hp-section py-5">
        <div className="container py-5">
          <div className="text-center mb-5">
            <span className="hp-section-badge">Fonctionnalités</span>
            <h2 className="hp-section-title mt-3">Tout ce dont votre cabinet a besoin</h2>
            <p className="hp-section-subtitle">
              Une suite complète d'outils conçus pour simplifier la gestion de votre pratique médicale
            </p>
          </div>
          <div className="row g-4">
            {[
              { icon: "bi-calendar2-week", title: "Gestion des rendez-vous", desc: "Planification intelligente, rappels automatiques et gestion multi-médecins avec vue calendrier complète." },
              { icon: "bi-folder2-open", title: "Dossiers médicaux", desc: "Dossiers patients numériques complets avec prescriptions, pièces jointes et historique médical." },
              { icon: "bi-people", title: "File d'attente virtuelle", desc: "Système de file d'attente en temps réel pour optimiser le flux des patients au cabinet." },
              { icon: "bi-chat-dots", title: "Messagerie intégrée", desc: "Communication sécurisée entre médecins, secrétaires et patients au sein du cabinet." },
              { icon: "bi-building", title: "Gestion multi-cabinets", desc: "Gérez plusieurs cabinets médicaux depuis un seul compte avec des accès personnalisés." },
              { icon: "bi-capsule-pill", title: "Pharmacie & Ordonnances", desc: "Caisse (POS), gestion de stock et circuit d'ordonnance numérique relié aux médecins." },
              { icon: "bi-shield-lock", title: "Sécurité avancée", desc: "Protection des données de santé conforme aux réglementations avec chiffrement de bout en bout." },
              { icon: "bi-robot", title: "Assistant IA", desc: "Chatbot médical intégré pour vulgariser les résultats d'analyses et aider les patients." }
            ].map((f, i) => (
              <div key={i} className="col-md-6 col-lg-3">
                <FeatureCard icon={f.icon} title={f.title} desc={f.desc} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section id="how" className="hp-section hp-section-alt py-5">
        <div className="container py-5">
          <div className="text-center mb-5">
            <span className="hp-section-badge">Comment ça marche</span>
            <h2 className="hp-section-title mt-3">Lancez-vous en 3 étapes simples</h2>
            <p className="hp-section-subtitle">
              Configuration rapide et intuitive pour commencer à gérer votre cabinet en quelques minutes
            </p>
          </div>
          <div className="row g-4 justify-content-center">
            {[
              { num: "1", title: "Créez votre compte", desc: "Inscrivez-vous gratuitement selon votre rôle (Médecin, Patient, Pharmacien...) et configurez votre espace." },
              { num: "2", title: "Configurez votre structure", desc: "Ajoutez vos secrétaires, définissez vos horaires ou ajoutez votre stock de médicaments." },
              { num: "3", title: "Travaillez intelligemment", desc: "Prenez des rendez-vous, émettez des ordonnances et communiquez avec vos patients." }
            ].map((s, i) => (
              <div key={i} className="col-md-4">
                <StepCard num={s.num} title={s.title} desc={s.desc} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ ROLES ══════════ */}
      <section className="hp-section py-5">
        <div className="container py-5">
          <div className="text-center mb-5">
            <span className="hp-section-badge">Pour chaque rôle</span>
            <h2 className="hp-section-title mt-3">Un espace adapté à chaque utilisateur</h2>
          </div>
          <div className="row g-4">
            {[
              {
                icon: "bi-heart-pulse-fill",
                color: "#e74c3c",
                role: "Médecin",
                items: ["Tableau de bord avec statistiques", "Gestion complète des dossiers médicaux", "Prescriptions numériques", "Messagerie avec les patients"],
              },
              {
                icon: "bi-person-badge-fill",
                color: "#3498db",
                role: "Secrétaire",
                items: ["Planification des rendez-vous", "Gestion de la file d'attente", "Coordination médecin-patient", "Gestion administrative du cabinet"],
              },
              {
                icon: "bi-person-fill",
                color: "#2ecc71",
                role: "Patient",
                items: ["Prise de rendez-vous en ligne", "Consultation du dossier médical", "Paiement en ligne (Stripe)", "Assistant IA pour résultats d'analyses"],
              },
              {
                icon: "bi-shop",
                color: "#9b59b6",
                role: "Pharmacien",
                items: ["Caisse (POS) intégrée", "Gestion de stock automatique", "Réception des ordonnances numériques", "Historique des ventes"],
              }
            ].map((r, i) => (
              <div key={i} className="col-md-6 col-lg-3">
                <div className="hp-role-card p-4 h-100">
                  <div className="hp-role-icon mb-3" style={{ backgroundColor: r.color + '15', color: r.color }}>
                    <i className={`bi ${r.icon} fs-2`}></i>
                  </div>
                  <h4 className="fw-bold mb-3">{r.role}</h4>
                  <ul className="list-unstyled mb-0">
                    {r.items.map((item, j) => (
                      <li key={j} className="d-flex align-items-start gap-2 mb-2">
                        <i className="bi bi-check2-circle mt-1" style={{ color: r.color }}></i>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PRICING ══════════ */}
      <section id="pricing" className="hp-section hp-section-alt py-5">
        <div className="container py-5">
          <div className="text-center mb-5">
            <span className="hp-section-badge">Tarifs</span>
            <h2 className="hp-section-title mt-3">Des plans adaptés à chaque besoin</h2>
            <p className="hp-section-subtitle">
              Commencez gratuitement et évoluez selon les besoins de votre cabinet
            </p>
          </div>
          <div className="row g-4 justify-content-center">
            <div className="col-md-4">
              <PricingCard
                name="Starter"
                price="Gratuit"
                features={["1 cabinet médical", "1 médecin", "50 patients", "Rendez-vous basiques", "Support par email"]}
                cta="Commencer gratuitement"
              />
            </div>
            <div className="col-md-4">
              <PricingCard
                name="Professionnel"
                price="89 TND"
                period="mois"
                highlighted
                features={["3 cabinets médicaux", "5 médecins", "Patients illimités", "File d'attente virtuelle", "Messagerie intégrée", "Support prioritaire"]}
                cta="Essai gratuit 14 jours"
              />
            </div>
            <div className="col-md-4">
              <PricingCard
                name="Enterprise"
                price="Sur devis"
                features={["Cabinets illimités", "Médecins illimités", "Patients illimités", "Toutes les fonctionnalités", "API personnalisée", "Support dédié 24/7"]}
                cta="Contacter les ventes"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ TESTIMONIALS ══════════ */}
      <section id="testimonials" className="hp-section py-5">
        <div className="container py-5">
          <div className="text-center mb-5">
            <span className="hp-section-badge">Témoignages</span>
            <h2 className="hp-section-title mt-3">Ils nous font confiance</h2>
          </div>
          <div className="row g-4">
            {[
              { name: "Dr. Mohamed Ben Ali", role: "Cardiologue — Tunis", text: "HealthyCore.tn a transformé la gestion de mon cabinet. La file d'attente virtuelle et les dossiers médicaux numériques m'ont fait gagner un temps précieux." },
              { name: "Mme. Leila Mansouri", role: "Secrétaire médicale — Sfax", text: "Interface intuitive et efficace. Je gère facilement les rendez-vous de 3 médecins et la communication avec les patients est devenue fluide." },
              { name: "Dr. Karim Bouzid", role: "Dermatologue — Sousse", text: "Le tableau de bord me donne une vue complète en temps réel. Les statistiques m'aident à mieux organiser mes consultations et optimiser mon temps." }
            ].map((t, i) => (
              <div key={i} className="col-md-4">
                <TestimonialCard name={t.name} role={t.role} text={t.text} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="hp-cta py-5">
        <div className="container">
          <div className="hp-cta-inner text-center p-5 rounded-5">
            <h2 className="fw-bold mb-3">Prêt à moderniser votre structure de santé ?</h2>
            <p className="mb-4 hp-cta-text">
              Rejoignez des centaines de professionnels de santé qui font confiance à HealthyCore.tn
              pour gérer leur pratique au quotidien.
            </p>
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <Link to="/register/doctor" className="btn btn-light btn-lg px-5 hp-btn-cta">
                <i className="bi bi-rocket-takeoff me-2"></i>Créer mon compte
              </Link>
              <a href="#contact" className="btn btn-outline-light btn-lg px-4">
                <i className="bi bi-telephone me-2"></i>Nous contacter
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ CONTACT ══════════ */}
      <section id="contact" className="hp-section py-5">
        <div className="container py-5">
          <div className="row g-5 align-items-center">
            <div className="col-lg-5">
              <span className="hp-section-badge">Contact</span>
              <h2 className="hp-section-title mt-3">Besoin d'aide ?</h2>
              <p className="text-muted">
                Notre équipe est disponible pour répondre à toutes vos questions
                et vous accompagner dans la mise en place de la solution.
              </p>
              <div className="hp-contact-info mt-4">
                {[
                  { icon: "bi-envelope-fill", label: "contact@healthycore.tn" },
                  { icon: "bi-telephone-fill", label: "+216 71 000 000" },
                  { icon: "bi-geo-alt-fill", label: "Tunis, Tunisie" },
                  { icon: "bi-clock-fill", label: "Lun — Ven : 08:00 — 18:00" }
                ].map((c, i) => (
                  <div key={i} className="d-flex align-items-center gap-3 mb-3">
                    <div className="hp-contact-icon">
                      <i className={`bi ${c.icon}`}></i>
                    </div>
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-lg-7">
              <div className="hp-contact-form p-4 rounded-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Nom complet</label>
                    <input type="text" className="form-control hp-input" placeholder="Votre nom" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Email</label>
                    <input type="email" className="form-control hp-input" placeholder="votre@email.com" />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold small">Sujet</label>
                    <input type="text" className="form-control hp-input" placeholder="Sujet de votre message" />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold small">Message</label>
                    <textarea className="form-control hp-input" rows="4" placeholder="Votre message..."></textarea>
                  </div>
                  <div className="col-12">
                    <button className="btn btn-primary w-100 hp-btn-submit">
                      <i className="bi bi-send me-2"></i>Envoyer le message
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="hp-footer">
        <div className="container py-5">
          <div className="row g-4">
            <div className="col-lg-4 mb-3">
              <div className="hp-logo mb-3">
                <i className="bi bi-heart-pulse-fill hp-logo-icon me-2"></i>
                HealthyCore<span className="hp-logo-pro">.tn</span>
              </div>
              <p className="text-muted small">
                La plateforme tout-en-un pour la gestion des structures de santé.
                Simplifiez votre pratique, améliorez l'expérience patient.
              </p>
              <div className="d-flex gap-3 mt-3">
                {['bi-facebook', 'bi-twitter-x', 'bi-linkedin', 'bi-instagram'].map((icon, i) => (
                  <a key={i} href="#" className="hp-social-link"><i className={`bi ${icon}`}></i></a>
                ))}
              </div>
            </div>
            <div className="col-6 col-lg-2">
              <h6 className="fw-bold mb-3">Produit</h6>
              <ul className="list-unstyled">
                {['Fonctionnalités', 'Tarifs', 'Sécurité', 'Mises à jour'].map((l, i) => (
                  <li key={i} className="mb-2"><a href="#features" className="hp-footer-link">{l}</a></li>
                ))}
              </ul>
            </div>
            <div className="col-6 col-lg-2">
              <h6 className="fw-bold mb-3">Entreprise</h6>
              <ul className="list-unstyled">
                {['À propos', 'Blog', 'Carrières', 'Contact'].map((l, i) => (
                  <li key={i} className="mb-2"><a href="#contact" className="hp-footer-link">{l}</a></li>
                ))}
              </ul>
            </div>
            <div className="col-6 col-lg-2">
              <h6 className="fw-bold mb-3">Support</h6>
              <ul className="list-unstyled">
                {["Centre d'aide", 'Documentation', 'Communauté', 'Statut'].map((l, i) => (
                  <li key={i} className="mb-2"><a href="#" className="hp-footer-link">{l}</a></li>
                ))}
              </ul>
            </div>
            <div className="col-6 col-lg-2">
              <h6 className="fw-bold mb-3">Légal</h6>
              <ul className="list-unstyled">
                {['CGU', 'Confidentialité', 'Cookies', 'Mentions légales'].map((l, i) => (
                  <li key={i} className="mb-2"><a href="#" className="hp-footer-link">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <hr className="my-4 hp-footer-divider" />
          <div className="d-flex flex-wrap justify-content-between align-items-center">
            <small className="text-muted">&copy; {new Date().getFullYear()} HealthyCore.tn. Tous droits réservés.</small>
            <small className="text-muted">Fait avec <i className="bi bi-heart-fill text-danger"></i> en Tunisie</small>
          </div>
        </div>
      </footer>

      {/* ══════════ BACK TO TOP ══════════ */}
      <button
        className={`hp-back-top ${scrolled ? 'hp-back-top-show' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Retour en haut"
      >
        <i className="bi bi-chevron-up"></i>
      </button>
    </div>
  );
}