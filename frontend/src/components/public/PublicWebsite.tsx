import React, { useState } from 'react';
import {
  ArrowRight,
  Clock,
  Phone,
  MapPin,
  MessageSquare,
  CheckCircle2,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { api, DEMO_MODE, errorMessage } from '../../api';
import { BUSINESS, IMAGES } from '../../config/business';
import { useApp } from '../../context/AppContext';
import { CATEGORY_LABELS, priceLabel } from '../../lib/labels';
import { useApiData } from '../../lib/useApiData';
import { Highlight, OpeningHoursEntry, PortfolioProject, Testimonial } from '../../types';
import { SmartImage, BeforeAfterSlider, Modal, EmptyState } from '../ui/DesignSystem';
import { BookingFlow } from './BookingFlow';

/** Marque tout contenu fictif affiché en mode démo. */
const DemoTag: React.FC = () =>
  DEMO_MODE ? (
    <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500 text-[#0B0C0E]">
      Démo
    </span>
  ) : null;

const NAV_ITEMS = [
  { id: 'home', label: 'Accueil' },
  { id: 'services', label: 'Services' },
  { id: 'realisations', label: 'Réalisations' },
  { id: 'about', label: 'À propos' },
  { id: 'contact', label: 'Contact' },
] as const;

export const PublicWebsite: React.FC = () => {
  const {
    publicPage,
    setPublicPage,
    setPortalMode,
    services,
    selectedServiceId,
    setSelectedServiceId,
    startBookingWithService,
    addToast,
    user,
    logout,
  } = useApp();

  // Contenu éditorial : vide tant que le module galerie/avis (phase 4) n'existe pas côté API
  const { data: portfolio } = useApiData<PortfolioProject[]>(() => api.content.portfolio(), [], []);
  const { data: testimonials } = useApiData<Testimonial[]>(() => api.content.testimonials(), [], []);
  const { data: highlights } = useApiData<Highlight[]>(() => api.content.highlights(), [], []);
  const { data: openingHours } = useApiData<OpeningHoursEntry[]>(() => api.availability.openingHours(), [], []);


  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [serviceFilter, setServiceFilter] = useState<string>('Tous');
  const [portfolioFilter, setPortfolioFilter] = useState<string>('Tous');
  const [activePortfolioIndex, setActivePortfolioIndex] = useState<number>(0);
  const [inspectedProject, setInspectedProject] = useState<PortfolioProject | null>(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSending, setContactSending] = useState(false);

  const publicServices = services.filter((s) => s.available);
  const selectedService =
    publicServices.find((s) => s.id === selectedServiceId) || publicServices[0];

  const filteredServices =
    serviceFilter === 'Tous'
      ? publicServices
      : publicServices.filter((s) => CATEGORY_LABELS[s.category] === serviceFilter);
  const portfolioCategories = ['Tous', ...Array.from(new Set(portfolio.map((p) => p.category)))];

  const filteredPortfolio =
    portfolioFilter === 'Tous'
      ? portfolio
      : portfolio.filter((p) => p.category === portfolioFilter);

  const featuredProject =
    filteredPortfolio[activePortfolioIndex % Math.max(1, filteredPortfolio.length)] ||
    portfolio[0];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.phone.trim() || !contactForm.message.trim()) {
      addToast('Champs requis', 'Veuillez renseigner votre nom, téléphone et message.', 'warning');
      return;
    }
    setContactSending(true);
    try {
      await api.contact.send({
        fullName: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone,
        message: contactForm.message,
      });
      setContactSubmitted(true);
      setContactForm({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      addToast('Envoi impossible', errorMessage(err), 'warning');
    } finally {
      setContactSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0C0E] text-[#F4F4F6]">
      {/* TOP BAR CONTRACT: Strictly 3 zones (Brand Wordmark | 5 Nav Links | Primary Actions) */}
      <header className="sticky top-0 z-40 h-16 bg-[#0B0C0E]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#accueil"
          onClick={(e) => {
            e.preventDefault();
            setPublicPage('home');
          }}
          className="text-sm sm:text-base font-extrabold tracking-wider text-white font-display whitespace-nowrap"
        >
          PERFECTION <span className="text-[#D49A3D] font-normal">BY BACHIR NDOUR</span>
        </a>

        {/* Zone 2: 5 clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-medium">
          {NAV_ITEMS.map((item) => {
            const active =
              publicPage === item.id ||
              (publicPage === 'service-detail' && item.id === 'services');
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setPublicPage(item.id as any);
                }}
                className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
                  active
                    ? 'text-[#D49A3D] border-[#D49A3D]'
                    : 'text-neutral-300 border-transparent hover:text-white'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Primary actions (1-2 actions + mobile menu trigger) */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => setPortalMode('space')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
              >
                <User className="w-3.5 h-3.5 text-[#D49A3D]" />
                <span>Mon espace</span>
              </button>
              <button
                type="button"
                onClick={logout}
                aria-label="Se déconnecter"
                className="hidden md:inline-flex p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setPortalMode('space')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              <User className="w-3.5 h-3.5 text-[#D49A3D]" />
              <span>Connexion</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => startBookingWithService()}
            className="px-4 py-2 rounded-lg border border-[#D49A3D] bg-[#D49A3D]/10 hover:bg-[#D49A3D] text-[#D49A3D] hover:text-[#0B0C0E] text-xs font-semibold transition-colors whitespace-nowrap"
          >
            Prendre rendez-vous
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg border border-white/10 text-neutral-300 hover:text-white"
            aria-label="Menu principal"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#121418] border-b border-white/10 px-6 py-5 space-y-4">
          <div className="flex flex-col space-y-2.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPublicPage(item.id as any);
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1.5 text-sm font-medium text-neutral-200 hover:text-[#D49A3D]"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="pt-3 border-t border-white/10 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setPortalMode('space');
                setMobileMenuOpen(false);
              }}
              className="flex-1 py-2 px-3 rounded-lg bg-white/5 text-xs font-medium text-white text-center"
            >
              {user ? 'Mon espace' : 'Connexion'}
            </button>
            {user && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 py-2 px-3 rounded-lg bg-white/5 text-xs font-medium text-neutral-300 text-center"
              >
                Déconnexion
              </button>
            )}
          </div>
        </div>
      )}

      {/* MAIN CONTENT VIEWPORT */}
      <main className="flex-1">
        {/* ==========================================
            PAGE 1: HOME (ACCUEIL)
        ========================================== */}
        {publicPage === 'home' && (
          <div>
            {/* HERO SECTION (matches 01_accueil_home.png) */}
            <section className="relative min-h-[620px] lg:min-h-[680px] flex items-center overflow-hidden border-b border-white/10">
              <div className="absolute inset-0">
                <SmartImage
                  src={IMAGES.heroSedan}
                  alt="Berline de prestige dans l'atelier Perfection By Bachir Ndour"
                  className="w-full h-full object-cover object-center"
                />
                {/* Measured Scrim for Media Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0B0C0E] via-[#0B0C0E]/80 to-[#0B0C0E]/25" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E] via-transparent to-[#0B0C0E]/40" />
              </div>

              <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full">
                <div className="max-w-2xl">
                  <p className="text-xs uppercase tracking-widest text-[#D49A3D] font-semibold mb-3">
                    Atelier de Detailing & Protection Automobile · Dakar, Sénégal
                  </p>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-white font-display">
                    L’excellence automobile,{' '}
                    <span className="text-[#D49A3D] block mt-1">
                      jusque dans les détails.
                    </span>
                  </h1>
                  <p className="mt-5 text-base sm:text-lg text-neutral-300 leading-relaxed max-w-xl">
                    Perfection By Bachir Ndour vous propose des services professionnels de préparation esthétique, de detailing, de polissage et de protection céramique haute durabilité.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => startBookingWithService()}
                      className="px-6 py-3.5 rounded-lg bg-[#D49A3D] hover:bg-[#e2a94c] text-[#0B0C0E] font-semibold text-sm transition-colors whitespace-nowrap"
                    >
                      Prendre rendez-vous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublicPage('services')}
                      className="px-6 py-3.5 rounded-lg border border-white/25 bg-black/40 hover:bg-white/10 text-white font-medium text-sm transition-colors whitespace-nowrap"
                    >
                      Découvrir nos services
                    </button>
                  </div>
                </div>

                {/* 4 Studio Pillars Bar (bottom of Hero in 01_accueil_home.png) */}
                <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      title: 'Service premium',
                      desc: 'Protocoles sur-mesure en cabine éclairée LED',
                    },
                    {
                      title: 'Équipe experte',
                      desc: 'Artisans detailers formés aux vernis de luxe',
                    },
                    {
                      title: 'Produits haut de gamme',
                      desc: 'Matrices céramiques 9H & soins cuir au pH neutre',
                    },
                    {
                      title: 'Satisfaction garantie',
                      desc: 'Inspection finale scialytique avec chaque client',
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#121418]/90 border border-white/10 rounded-xl p-4"
                    >
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-neutral-400 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* INTRODUCTION TO PERFECTION (Light editorial contrast section as shown in 01_accueil_home.png) */}
            <section className="bg-[#F7F7F5] text-[#111317] py-16 md:py-24 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-6 space-y-5">
                  <p className="text-xs uppercase tracking-widest text-[#B87D24] font-semibold">
                    À propos de nous
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111317] font-display">
                    Une passion, un savoir-faire, une exigence.
                  </h2>
                  <p className="text-base text-neutral-700 leading-relaxed">
                    <strong>Perfection By Bachir Ndour</strong> est la référence sénégalaise spécialisée dans la préparation esthétique, le detailing, le nettoyage haute précision et la protection de véhicules à Dakar. Nous mettons notre expertise au service de votre automobile pour lui offrir un éclat durable et une protection optimale face au climat côtier.
                  </p>

                  {/* Chiffres clés : affichés uniquement s'ils sont fournis (et validés) */}
                  {highlights.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 pt-3 pb-2 border-y border-neutral-200">
                      {highlights.map((h) => (
                        <div key={h.label}>
                          <span className="block text-2xl font-bold font-mono text-[#111317]">
                            {h.value}
                            <DemoTag />
                          </span>
                          <span className="text-xs text-neutral-600">{h.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setPublicPage('about')}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#D49A3D] hover:bg-[#c38a30] text-[#0B0C0E] font-semibold text-xs transition-colors whitespace-nowrap"
                    >
                      <span>Découvrir notre histoire</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="rounded-xl overflow-hidden border border-neutral-200 shadow-xl aspect-[4/3]">
                    <SmartImage
                      src={IMAGES.polishingDetail}
                      alt="Artisan Perfection réalisant un polissage de précision"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* SERVICES PRINCIPAUX */}
            <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#D49A3D] font-semibold mb-2">
                    Savoir-faire technique
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white font-display">
                    Nos prestations principales
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPublicPage('services')}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#D49A3D] hover:underline whitespace-nowrap"
                >
                  <span>Explorer tout le catalogue ({publicServices.length} services)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicServices.slice(0, 6).map((srv, idx) => (
                  <div
                    key={srv.id}
                    className="group bg-[#121418] border border-white/10 hover:border-[#D49A3D]/50 rounded-xl overflow-hidden flex flex-col transition-colors"
                  >
                    <div className="h-48 overflow-hidden relative">
                      <SmartImage
                        src={srv.image}
                        alt={srv.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121418] via-transparent to-transparent" />
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-neutral-400 font-mono mb-1">
                          0{idx + 1}. {CATEGORY_LABELS[srv.category]} · {srv.durationLabel}
                        </p>
                        <h3 className="text-lg font-bold text-white font-display">
                          {srv.name}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-2 leading-relaxed line-clamp-2">
                          {srv.shortDescription}
                        </p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-[#D49A3D] font-mono">
                          {priceLabel(srv)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedServiceId(srv.id);
                            setPublicPage('service-detail');
                          }}
                          className="px-3.5 py-2 rounded-lg border border-[#D49A3D]/50 text-xs font-medium text-white hover:bg-[#D49A3D] hover:text-[#0B0C0E] transition-colors whitespace-nowrap"
                        >
                          Voir le service
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* AVANT / APRÈS & RÉALISATIONS (uniquement si la galerie contient des projets) */}
            {portfolio.length > 0 && (
            <section className="py-16 md:py-24 bg-[#101216] border-y border-white/10 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#D49A3D] font-semibold mb-2">
                      Transformation Avant / Après
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white font-display">
                      La preuve par l’image
                    </h2>
                    <p className="text-sm text-neutral-400 mt-2 max-w-xl">
                      Faites glisser le curseur central pour observer la correction des micro-rayures et la profondeur obtenue après notre traitement céramique.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPublicPage('realisations')}
                    className="px-4 py-2.5 rounded-lg border border-white/15 hover:border-[#D49A3D] text-xs font-semibold text-white transition-colors whitespace-nowrap"
                  >
                    Voir toutes nos réalisations
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-8">
                    <BeforeAfterSlider
                      beforeImage={portfolio[0].beforeImage}
                      afterImage={portfolio[0].afterImage}
                      altTitle={portfolio[0].title}
                    />
                  </div>
                  <div className="lg:col-span-4 bg-[#14171D] border border-white/10 rounded-xl p-6 space-y-5">
                    <div className="text-xs text-neutral-400 font-mono">
                      Projet vedette · {portfolio[0].completionDate}
                      <DemoTag />
                    </div>
                    <h3 className="text-2xl font-bold text-white font-display">
                      {portfolio[0].title}
                    </h3>
                    <p className="text-xs text-[#D49A3D]">
                      {portfolio[0].servicesPerformed.join(' · ')} · Durée : {portfolio[0].duration}
                    </p>
                    <p className="text-sm text-neutral-300 leading-relaxed">
                      {portfolio[0].description}
                    </p>
                    <div className="pt-2 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => startBookingWithService()}
                        className="px-4 py-2.5 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold text-xs hover:bg-[#e0a84b] transition-colors whitespace-nowrap"
                      >
                        Réserver ce traitement
                      </button>
                      <button
                        type="button"
                        onClick={() => setPublicPage('realisations')}
                        className="px-4 py-2.5 rounded-lg border border-white/15 text-white text-xs font-medium hover:bg-white/5 transition-colors whitespace-nowrap"
                      >
                        Galerie complète
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            )}

            {/* PROCESSUS DE RÉSERVATION & TÉMOIGNAGES */}
            <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-20">
              {/* Processus */}
              <div>
                <div className="max-w-xl mb-10">
                  <p className="text-xs uppercase tracking-widest text-[#D49A3D] font-semibold mb-2">
                    Parcours simplifié
                  </p>
                  <h2 className="text-3xl font-bold text-white font-display">
                    Comment fonctionne votre prise en charge
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    {
                      num: '01',
                      title: 'Choix de la prestation',
                      desc: 'Sélectionnez en ligne le soin adapté et renseignez votre véhicule en moins de 2 minutes.',
                    },
                    {
                      num: '02',
                      title: 'Accueil & Diagnostic LED',
                      desc: 'Inspection contradictoire sous rampes scialytiques à notre atelier Route de l’Aéroport.',
                    },
                    {
                      num: '03',
                      title: 'Suivi en direct sur votre portail',
                      desc: 'Suivez l’avancement étape par étape depuis votre Espace Client digital.',
                    },
                    {
                      num: '04',
                      title: 'Restitution & Carnet Digital',
                      desc: 'Remise du véhicule avec photos Avant/Après et historique certifié.',
                    },
                  ].map((step) => (
                    <div
                      key={step.num}
                      className="bg-[#121418] border border-white/10 rounded-xl p-6"
                    >
                      <span className="text-sm font-mono font-bold text-[#D49A3D]">
                        {step.num}.
                      </span>
                      <h3 className="text-base font-bold text-white font-display mt-2">
                        {step.title}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Avis clients : uniquement ceux fournis par l'API */}
              {testimonials.length > 0 && (
                <div>
                  <div className="max-w-xl mb-10">
                    <p className="text-xs uppercase tracking-widest text-[#D49A3D] font-semibold mb-2">
                      Avis clients
                      <DemoTag />
                    </p>
                    <h2 className="text-3xl font-bold text-white font-display">
                      Ils nous confient leurs véhicules
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {testimonials.map((t, idx) => (
                      <div
                        key={idx}
                        className="bg-[#121418] border border-white/10 rounded-xl p-6 flex flex-col justify-between"
                      >
                        <p className="text-sm text-neutral-300 leading-relaxed">« {t.quote} »</p>
                        <div className="mt-6 pt-4 border-t border-white/10">
                          <p className="text-sm font-bold text-white">{t.author}</p>
                          <p className="text-xs text-neutral-400 mt-0.5">{t.role}</p>
                          <p className="text-xs text-[#D49A3D] font-mono mt-1">{t.vehicle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* FINAL CTA */}
            <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-gradient-to-b from-[#121418] to-[#0B0C0E]">
              <div className="max-w-4xl mx-auto text-center space-y-5">
                <h2 className="text-3xl sm:text-4xl font-bold text-white font-display">
                  Prêt à redonner à votre véhicule son éclat d’origine ?
                </h2>
                <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto">
                  Réservez votre créneau en ligne en moins de deux minutes ou contactez directement notre atelier à Dakar.
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => startBookingWithService()}
                    className="px-7 py-3.5 rounded-lg bg-[#D49A3D] hover:bg-[#e2a94c] text-[#0B0C0E] font-semibold text-sm transition-colors whitespace-nowrap"
                  >
                    Prendre rendez-vous maintenant
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublicPage('contact')}
                    className="px-7 py-3.5 rounded-lg border border-white/20 hover:bg-white/5 text-white font-medium text-sm transition-colors whitespace-nowrap"
                  >
                    Contacter l’atelier{BUSINESS.phone ? ` (${BUSINESS.phone})` : ''}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ==========================================
            PAGE 2: SERVICES CATALOGUE (matches 02_services.png)
        ========================================== */}
        {publicPage === 'services' && (
          <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="mb-10">
              <p className="text-xs uppercase tracking-widest text-[#D49A3D] font-semibold mb-2">
                Catalogue des prestations
              </p>
              <h1 className="text-3xl sm:text-5xl font-bold text-white font-display">
                Nos services
              </h1>
              <p className="text-neutral-400 text-sm sm:text-base mt-2 max-w-2xl">
                Une gamme complète de prestations pour sublimer et protéger votre véhicule dans les règles de l’art.
              </p>
            </div>

            {/* Interactive Category Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
              {['Tous', 'Detailing', 'Nettoyage', 'Polissage', 'Protection', 'Préparation'].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setServiceFilter(cat)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      serviceFilter === cat
                        ? 'bg-[#D49A3D] text-[#0B0C0E] font-semibold'
                        : 'bg-[#121418] border border-white/10 text-neutral-300 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            {/* Services Grid (6 cards + full-width horizontal featured 7th card matching 02_services.png!) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.slice(0, 6).map((srv) => (
                <div
                  key={srv.id}
                  className="bg-[#121418] border border-white/10 hover:border-[#D49A3D]/50 rounded-xl overflow-hidden flex flex-col transition-all"
                >
                  <div className="h-48 overflow-hidden relative">
                    <SmartImage
                      src={srv.image}
                      alt={srv.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white font-display">
                        {srv.name}
                      </h2>
                      <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                        {srv.shortDescription}
                      </p>
                    </div>
                    <div className="mt-5 space-y-4">
                      <div className="flex items-center justify-between text-xs text-neutral-300 font-mono">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#D49A3D]" />
                          {srv.durationLabel}
                        </span>
                        <span className="text-[#D49A3D] font-semibold">
                          {priceLabel(srv)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedServiceId(srv.id);
                          setPublicPage('service-detail');
                        }}
                        className="w-full py-2.5 px-4 rounded-lg border border-[#D49A3D]/60 text-xs font-semibold text-[#D49A3D] hover:bg-[#D49A3D] hover:text-[#0B0C0E] transition-colors whitespace-nowrap"
                      >
                        Voir le service
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 7th Service Banner Card (Préparation automobile — exact layout from bottom of 02_services.png) */}
            {filteredServices.length > 6 && (
              <div className="mt-6 bg-[#121418] border border-white/10 hover:border-[#D49A3D]/50 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-center">
                <div className="lg:col-span-5 h-56 lg:h-full overflow-hidden">
                  <SmartImage
                    src={filteredServices[6].image}
                    alt={filteredServices[6].name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="lg:col-span-7 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <h2 className="text-xl font-bold text-white font-display">
                      {filteredServices[6].name}
                    </h2>
                    <p className="text-sm text-neutral-300">
                      {filteredServices[6].shortDescription}
                    </p>
                    <div className="pt-1 flex items-center gap-4 text-xs font-mono text-neutral-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#D49A3D]" />
                        {filteredServices[6].durationLabel}
                      </span>
                      <span>·</span>
                      <span className="text-[#D49A3D] font-semibold">
                        {priceLabel(filteredServices[6])}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedServiceId(filteredServices[6].id);
                      setPublicPage('service-detail');
                    }}
                    className="px-6 py-3 rounded-lg border border-[#D49A3D]/60 text-xs font-semibold text-[#D49A3D] hover:bg-[#D49A3D] hover:text-[#0B0C0E] transition-colors whitespace-nowrap shrink-0"
                  >
                    Voir le service
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ==========================================
            PAGE 2B: SERVICE DETAIL PAGE
        ========================================== */}
        {publicPage === 'service-detail' && selectedService && (
          <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
            <button
              type="button"
              onClick={() => setPublicPage('services')}
              className="text-xs text-neutral-400 hover:text-white mb-6 inline-flex items-center gap-2"
            >
              ← Retour au catalogue des services
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-xl overflow-hidden border border-white/10 aspect-[16/10]">
                  <SmartImage
                    src={selectedService.image}
                    alt={selectedService.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <p className="text-xs text-[#D49A3D] font-mono mb-1">
                    {CATEGORY_LABELS[selectedService.category]} · Durée d’immobilisation : {selectedService.durationLabel}
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white font-display">
                    {selectedService.name}
                  </h1>
                  <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mt-4">
                    {selectedService.description || selectedService.shortDescription}
                  </p>
                </div>

                {/* Process Steps */}
                {selectedService.processSteps.length > 0 && (
                <div className="pt-4">
                  <h2 className="text-xl font-bold text-white font-display mb-4">
                    Protocole d’intervention en {selectedService.processSteps.length} étapes
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedService.processSteps.map((p) => (
                      <div
                        key={p.step}
                        className="bg-[#121418] border border-white/10 rounded-xl p-5"
                      >
                        <span className="text-xs font-mono font-bold text-[#D49A3D]">
                          Étape {p.step}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1">{p.title}</h3>
                        <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                          {p.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </div>

              {/* Right Column: Pricing, Benefits & Direct Booking CTA */}
              <div className="lg:col-span-5 bg-[#121418] border border-white/10 rounded-xl p-6 md:p-8 space-y-6 sticky top-24">
                <div className="pb-5 border-b border-white/10 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-neutral-400 block">Tarif atelier</span>
                    <span className="text-2xl font-bold text-[#D49A3D] font-mono">
                      {priceLabel(selectedService)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-neutral-400 block">Durée estimée</span>
                    <span className="text-sm font-mono text-white font-semibold">
                      {selectedService.durationLabel}
                    </span>
                  </div>
                </div>

                {selectedService.benefits.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-white mb-3">
                    Bénéfices pour votre véhicule
                  </h3>
                  <ul className="space-y-2.5">
                    {selectedService.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-neutral-300">
                        <CheckCircle2 className="w-4 h-4 text-[#D49A3D] shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                )}

                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={() => startBookingWithService(selectedService.id)}
                    className="w-full py-3.5 px-6 rounded-lg bg-[#D49A3D] hover:bg-[#e2a94c] text-[#0B0C0E] font-semibold text-sm transition-colors"
                  >
                    Prendre rendez-vous pour ce service
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublicPage('contact')}
                    className="w-full py-3 px-6 rounded-lg border border-white/15 hover:bg-white/5 text-white text-xs font-medium transition-colors"
                  >
                    Demander un devis personnalisé Flotte / VIP
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==========================================
            PAGE 3: RÉALISATIONS (PORTFOLIO BEFORE/AFTER, matches 03_realisations.png)
        ========================================== */}
        {publicPage === 'realisations' && (
          <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-5xl font-bold text-white font-display">
                Des véhicules transformés,{' '}
                <span className="text-[#D49A3D] block mt-1">
                  une exigence constante.
                </span>
              </h1>
              <p className="text-neutral-400 text-sm sm:text-base mt-3 max-w-xl">
                Découvrez nos réalisations et la qualité de notre travail à travers des transformations avant/après réalisées dans notre atelier de Dakar.
              </p>
            </div>

            {/* Category Filter Buttons (matching 03_realisations.png: Tous, Detailing, Polissage, Protection, Nettoyage) */}
            <div className="flex flex-wrap items-center gap-2.5 mb-8">
              {portfolio.length > 0 && portfolioCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setPortfolioFilter(cat);
                    setActivePortfolioIndex(0);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    portfolioFilter === cat
                      ? 'bg-[#D49A3D] text-[#0B0C0E] font-semibold'
                      : 'bg-[#121418] border border-white/15 text-neutral-300 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {portfolio.length === 0 && (
              <EmptyState message="La galerie de réalisations sera publiée prochainement." />
            )}

            {/* Featured Before/After Interactive Showcase Card */}
            {featuredProject && (
              <div className="bg-[#121418] border border-white/10 rounded-2xl p-5 md:p-7 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-14">
                <div className="lg:col-span-7">
                  <BeforeAfterSlider
                    beforeImage={featuredProject.beforeImage}
                    afterImage={featuredProject.afterImage}
                    altTitle={featuredProject.title}
                  />
                </div>
                <div className="lg:col-span-5 space-y-4">
                  <div className="text-xs text-neutral-400 font-mono">
                    {featuredProject.completionDate} · Durée : {featuredProject.duration}
                    <DemoTag />
                  </div>
                  <h2 className="text-2xl font-bold text-white font-display">
                    {featuredProject.vehicle}
                  </h2>
                  <p className="text-xs text-[#D49A3D] font-medium">
                    {featuredProject.servicesPerformed.join(' · ')}
                  </p>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {featuredProject.description}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setInspectedProject(featuredProject)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D49A3D] text-[#0B0C0E] text-xs font-semibold hover:bg-[#e0a84b] transition-colors whitespace-nowrap"
                    >
                      <span>Voir le projet</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startBookingWithService()}
                      className="px-4 py-2.5 rounded-lg border border-white/15 text-xs font-medium text-white hover:bg-white/5 transition-colors whitespace-nowrap"
                    >
                      Réserver ce soin
                    </button>
                  </div>

                  {/* Mini Avant/Après preview thumbnails */}
                  <div className="pt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg overflow-hidden border border-white/10 h-24 relative">
                      <SmartImage
                        src={featuredProject.beforeImage}
                        alt="Aperçu avant"
                        className="w-full h-full object-cover brightness-75 saturate-50"
                      />
                      <span className="absolute bottom-1.5 left-2 text-[10px] bg-black/70 px-1.5 py-0.5 rounded text-neutral-300">
                        État initial
                      </span>
                    </div>
                    <div className="rounded-lg overflow-hidden border border-[#D49A3D]/40 h-24 relative">
                      <SmartImage
                        src={featuredProject.afterImage}
                        alt="Aperçu après"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1.5 left-2 text-[10px] bg-black/70 px-1.5 py-0.5 rounded text-[#D49A3D]">
                        Résultat final
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gallery Grid: Nos projets en images */}
            {portfolio.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white font-display mb-6">
                Nos projets en images ({filteredPortfolio.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredPortfolio.map((proj, idx) => (
                  <button
                    type="button"
                    key={proj.id}
                    onClick={() => {
                      setActivePortfolioIndex(idx);
                      setInspectedProject(proj);
                    }}
                    className="group text-left bg-[#121418] border border-white/10 hover:border-[#D49A3D]/60 rounded-xl overflow-hidden transition-all"
                  >
                    <div className="aspect-[4/3] overflow-hidden relative">
                      <SmartImage
                        src={proj.afterImage}
                        alt={proj.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-xs text-[#D49A3D] font-mono">
                          {proj.category}
                        </p>
                        <h3 className="text-sm font-bold text-white truncate">
                          {proj.title}
                        </h3>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between text-xs text-neutral-400">
                      <span className="truncate">{proj.servicesPerformed.join(' · ')}</span>
                      <span className="text-white font-medium shrink-0 ml-2">Inspecter →</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Project Inspection Modal */}
            <Modal
              isOpen={!!inspectedProject}
              onClose={() => setInspectedProject(null)}
              title={inspectedProject?.title || ''}
              subtitle={`${inspectedProject?.servicesPerformed.join(' · ')} — ${inspectedProject?.completionDate}`}
              maxWidth="max-w-3xl"
            >
              {inspectedProject && (
                <div className="space-y-6">
                  <BeforeAfterSlider
                    beforeImage={inspectedProject.beforeImage}
                    afterImage={inspectedProject.afterImage}
                    altTitle={inspectedProject.title}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#0B0C0E] p-4 rounded-xl border border-white/10 text-xs">
                    <div>
                      <span className="text-neutral-400 block">Véhicule</span>
                      <span className="text-white font-semibold mt-0.5 block">
                        {inspectedProject.vehicle}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Prestations exécutées</span>
                      <span className="text-[#D49A3D] font-medium mt-0.5 block">
                        {inspectedProject.servicesPerformed.join(' · ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Temps d’atelier</span>
                      <span className="text-white font-mono mt-0.5 block">
                        {inspectedProject.duration}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {inspectedProject.description}
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInspectedProject(null);
                        startBookingWithService();
                      }}
                      className="px-5 py-2.5 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold text-xs"
                    >
                      Prendre rendez-vous pour mon véhicule
                    </button>
                  </div>
                </div>
              )}
            </Modal>
          </section>
        )}

        {/* ==========================================
            PAGE 4: À PROPOS (BRAND STORY, WORKSHOP & TEAM)
        ========================================== */}
        {publicPage === 'about' && (
          <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
            {/* Hero Story */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 space-y-5">
                <p className="text-xs uppercase tracking-widest text-[#D49A3D] font-semibold">
                  L’Atelier Perfection · Dakar
                </p>
                <h1 className="text-3xl sm:text-5xl font-bold text-white font-display">
                  L’art de sublimer et protéger l’automobile au Sénégal.
                </h1>
                <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
                  Fondé par <strong>Bachir Ndour</strong>, passionné d’esthétique automobile et de mécanique de précision, notre centre de detailing est né d’un constat simple : les véhicules circulant à Dakar sont soumis à des conditions climatiques exigeantes (air marin salin, rayons UV intenses, poussière latéritique) qui nécessitent bien plus qu’un lavage classique.
                </p>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Notre studio sur la Route de l’Aéroport réunit des cabines à éclairage scialytique, des systèmes d’eau osmosée et des revêtements céramiques 9H certifiés pour offrir aux propriétaires exigeants un standard digne des meilleurs ateliers internationaux.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => startBookingWithService()}
                    className="px-6 py-3 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold text-xs hover:bg-[#e0a84b] transition-colors"
                  >
                    Planifier une visite à l’atelier
                  </button>
                </div>
              </div>
              <div className="lg:col-span-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden border border-white/10 aspect-[3/4]">
                  <SmartImage
                    src={IMAGES.polishingDetail}
                    alt="Polissage haute précision"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="rounded-xl overflow-hidden border border-white/10 aspect-[3/4] mt-6">
                  <SmartImage
                    src={IMAGES.interiorLeather}
                    alt="Soin sellerie cuir Nappa"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Vision & Values */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: '01. Précision Chirurgicale',
                  desc: 'Chaque intervention débute par un relevé micrométrique de l’épaisseur du vernis et un diagnostic sous rampes LED.',
                },
                {
                  title: '02. Transparence & Traçabilité',
                  desc: 'Grâce à notre carnet d’entretien digital, chaque client conserve l’historique complet, les photos Avant/Après et les factures de son parc.',
                },
                {
                  title: '03. Protection Climatique Durable',
                  desc: 'Nos traitements céramiques et antirouille sont formulés pour résister durablement à l’humidité saline de la presqu’île du Cap-Vert.',
                },
              ].map((val, i) => (
                <div
                  key={i}
                  className="bg-[#121418] border border-white/10 rounded-xl p-6 space-y-2"
                >
                  <h2 className="text-lg font-bold text-white font-display">{val.title}</h2>
                  <p className="text-xs text-neutral-400 leading-relaxed">{val.desc}</p>
                </div>
              ))}
            </div>

          </section>
        )}

        {/* ==========================================
            PAGE 5: CONTACT (matches 05_contact.png)
        ========================================== */}
        {publicPage === 'contact' && (
          <section className="py-12 md:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-10">
                <p className="text-xs uppercase tracking-widest text-[#D49A3D] font-semibold mb-1">
                  Une question ?
                </p>
                <h1 className="text-3xl sm:text-5xl font-bold text-white font-display">
                  Contactez-nous
                </h1>
                <p className="text-neutral-400 text-sm sm:text-base mt-2 max-w-xl">
                  Notre équipe est à votre disposition pour répondre à toutes vos demandes de devis, partenariats flottes ou conseils d’entretien.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Coordonnées : uniquement les informations validées (config/business.ts) */}
                <div className="lg:col-span-5 space-y-6">
                  {[
                    { icon: Phone, title: 'Téléphone', value: BUSINESS.phone },
                    { icon: MessageSquare, title: 'WhatsApp', value: BUSINESS.whatsapp },
                    { icon: MapPin, title: 'Adresse', value: BUSINESS.address },
                  ]
                    .filter((item) => item.value)
                    .map(({ icon: Icon, title, value }) => (
                      <div key={title} className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-full bg-[#D49A3D]/15 border border-[#D49A3D]/40 text-[#D49A3D] flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-white">{title}</h2>
                          <p className="text-sm text-neutral-300 font-mono mt-0.5">{value}</p>
                        </div>
                      </div>
                    ))}

                  {openingHours.length > 0 && (
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-full bg-[#D49A3D]/15 border border-[#D49A3D]/40 text-[#D49A3D] flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white">Horaires d’ouverture</h2>
                        <ul className="mt-1 space-y-0.5 text-xs font-mono text-neutral-300">
                          {openingHours.map((h) => (
                            <li key={h.weekday}>
                              {h.label} : {h.isClosed ? 'fermé' : `${h.opensAt} – ${h.closesAt}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Contact Form Card */}
                <div className="lg:col-span-7 bg-[#121418] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
                  {contactSubmitted ? (
                    <div className="py-8 text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-white font-display">
                        Merci pour votre message
                      </h3>
                      <p className="text-xs text-neutral-300 max-w-md mx-auto">
                        Votre demande a bien été transmise à l’atelier. Nous vous répondrons par téléphone ou WhatsApp.
                      </p>
                      <button
                        type="button"
                        onClick={() => setContactSubmitted(false)}
                        className="px-5 py-2.5 rounded-lg border border-white/15 text-xs text-white hover:bg-white/5"
                      >
                        Envoyer un autre message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="contact-name" className="sr-only">Nom complet</label>
                        <input
                          type="text"
                          placeholder="Nom complet"
                          id="contact-name"
                          value={contactForm.name}
                          onChange={(e) =>
                            setContactForm({ ...contactForm, name: e.target.value })
                          }
                          className="w-full px-4 py-3 rounded-lg bg-[#0B0C0E] border border-white/15 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D49A3D]"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-email" className="sr-only">Email</label>
                        <input
                          type="email"
                          placeholder="Email"
                          id="contact-email"
                          value={contactForm.email}
                          onChange={(e) =>
                            setContactForm({ ...contactForm, email: e.target.value })
                          }
                          className="w-full px-4 py-3 rounded-lg bg-[#0B0C0E] border border-white/15 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D49A3D]"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-phone" className="sr-only">Téléphone</label>
                        <input
                          type="tel"
                          placeholder="Téléphone (+221...)"
                          id="contact-phone"
                          value={contactForm.phone}
                          onChange={(e) =>
                            setContactForm({ ...contactForm, phone: e.target.value })
                          }
                          className="w-full px-4 py-3 rounded-lg bg-[#0B0C0E] border border-white/15 text-sm text-white font-mono placeholder:text-neutral-500 focus:outline-none focus:border-[#D49A3D]"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-message" className="sr-only">Message</label>
                        <textarea
                          rows={4}
                          placeholder="Message (modèle de votre véhicule, prestation souhaitée...)"
                          id="contact-message"
                          value={contactForm.message}
                          onChange={(e) =>
                            setContactForm({ ...contactForm, message: e.target.value })
                          }
                          className="w-full px-4 py-3 rounded-lg bg-[#0B0C0E] border border-white/15 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D49A3D]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={contactSending}
                        className="w-full py-3.5 px-6 rounded-lg bg-[#D49A3D] hover:bg-[#e2a94c] text-[#0B0C0E] font-semibold text-sm transition-colors disabled:opacity-60"
                      >
                        {contactSending ? 'Envoi…' : 'Envoyer le message'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Carte interactive : à ajouter quand les coordonnées officielles seront confirmées */}
          </section>
        )}

        {/* ==========================================
            PAGE 6: ONLINE BOOKING
        ========================================== */}
        {publicPage === 'booking' && <BookingFlow />}
      </main>

      {/* QUIET FOOTER (matches 05_contact.png footer) */}
      <footer className="bg-[#08090B] border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
          <div className="space-y-3">
            <span className="text-sm font-extrabold tracking-wider text-white font-display block">
              PERFECTION <span className="text-[#D49A3D] font-normal">BY BACHIR NDOUR</span>
            </span>
            <p className="text-neutral-400 leading-relaxed">
              L’excellence automobile, jusque dans les détails. Studio de detailing, polissage et protection céramique à Dakar, Sénégal.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Liens rapides</h3>
            <ul className="space-y-2">
              {NAV_ITEMS.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setPublicPage(l.id as any)}
                    className="hover:text-[#D49A3D] transition-colors"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Nos services</h3>
            <ul className="space-y-2">
              {publicServices.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedServiceId(s.id);
                      setPublicPage('service-detail');
                    }}
                    className="hover:text-[#D49A3D] transition-colors text-left"
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Espace connecté</h3>
            <p className="text-neutral-500 mb-3">Clients et équipe de l’atelier : une seule connexion.</p>
            <button
              type="button"
              onClick={() => setPortalMode('space')}
              className="px-3.5 py-2 rounded-lg bg-[#14161B] border border-white/10 text-white hover:border-[#D49A3D] text-left transition-colors"
            >
              → {user ? 'Mon espace' : 'Connexion'}
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {BUSINESS.name} · {BUSINESS.city}. Tous droits réservés.</p>
          <p className="font-mono text-neutral-500">
            {[BUSINESS.address, BUSINESS.phone].filter(Boolean).join(' · ')}
          </p>
        </div>
      </footer>
    </div>
  );
};
