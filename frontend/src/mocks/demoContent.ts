// CONTENU FICTIF — avis et chiffres inventés par la maquette AI Studio.
// Le cahier des charges interdit de les présenter comme réels sans validation :
// ils ne sont affichés qu'en mode démo, avec un bandeau « Démo ».

import { Highlight, Testimonial } from '../types';

export const DEMO_HIGHLIGHTS: Highlight[] = [
  { value: '1 450+', label: 'Véhicules traités (chiffre fictif)' },
  { value: '36 mois', label: 'Tenue céramique annoncée (à valider)' },
  { value: '98 %', label: 'Satisfaction (chiffre fictif)' },
];

export const DEMO_TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Après le polissage et la céramique, la peinture est plus profonde qu’à la livraison. Le suivi en ligne est très pratique.',
    author: 'Client fictif A',
    role: 'Avis de démonstration',
    vehicle: 'SUV · immatriculation masquée',
  },
  {
    quote: 'Le carnet d’entretien digital me permet de retrouver chaque intervention et chaque facture.',
    author: 'Client fictif B',
    role: 'Avis de démonstration',
    vehicle: 'Berline · immatriculation masquée',
  },
  {
    quote: 'Délais annoncés sur la plateforme respectés, véhicule rendu impeccable.',
    author: 'Client fictif C',
    role: 'Avis de démonstration',
    vehicle: 'Berline · immatriculation masquée',
  },
];
