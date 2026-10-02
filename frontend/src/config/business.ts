// Coordonnées de l'atelier. Tant qu'une valeur n'est pas validée par
// l'entreprise, elle reste vide et le bloc correspondant n'est pas affiché.

export const BUSINESS = {
  name: 'Perfection By Bachir Ndour',
  city: 'Dakar, Sénégal',
  phone: import.meta.env.VITE_BUSINESS_PHONE || '',
  whatsapp: import.meta.env.VITE_BUSINESS_WHATSAPP || '',
  address: import.meta.env.VITE_BUSINESS_ADDRESS || '',
};

export const IMAGES = {
  heroSedan: '/images/hero_luxury_sedan.jpg',
  polishingDetail: '/images/service_polishing_detail.jpg',
  interiorLeather: '/images/service_interior_leather.jpg',
  landCruiser: '/images/vehicle_land_cruiser.jpg',
  paintCorrection: '/images/before_after_paint_correction.jpg',
};
