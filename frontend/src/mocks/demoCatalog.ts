// DONNÉES DE DÉMONSTRATION — contenu rédactionnel issu de la maquette AI Studio.
// Tarifs, durées et textes NON validés par l'entreprise. Utilisé uniquement
// en mode démo (VITE_USE_MOCKS=true) via mocks/mockApi.ts.

import { IMAGES } from '../config/business';

export interface DemoService {
  name: string;
  category: 'Detailing' | 'Nettoyage' | 'Polissage' | 'Protection' | 'Préparation';
  shortDescription: string;
  fullDescription: string;
  duration: string;
  price: number | null;
  image: string;
  benefits: string[];
  processSteps: { step: string; title: string; description: string }[];
}

export const DEMO_SERVICES: DemoService[] = [
  {
    name: 'Detailing automobile',
    category: 'Detailing',
    shortDescription: 'Restauration intégrale de l’éclat, décontamination et soin méticuleux intérieur & extérieur.',
    fullDescription:
      'Notre prestation signature de detailing automobile combine une décontamination chimique et mécanique complète de la carrosserie, une correction minutieuse des défauts de surface et une remise à neuf intégrale de l’habitacle pour redonner à votre véhicule son état de sortie d’usine.',
    duration: '2h - 4h',
    price: 50000,
    image: IMAGES.heroSedan,
    benefits: [
      'Élimination complète du film routier, du goudron et des poussières de frein',
      'Rénovation profonde des cuirs, plastiques nobles et boiseries intérieures',
      'Brillance miroir durable et toucher ultra-lisse de la carrosserie',
      'Valorisation immédiate du véhicule et préservation de sa valeur de revente',
    ],
    processSteps: [
      {
        step: '01',
        title: 'Inspection & Prélavage au canon à mousse',
        description: 'Diagnostic sous rampes LED et application d’une mousse active au pH neutre pour ramollir les contaminants sans action mécanique.',
      },
      {
        step: '02',
        title: 'Lavage manuel deux seaux & Décontamination',
        description: 'Nettoyage des jantes, passages de roues, joints et décontamination ferreuse + barre d’argile (Clay Bar).',
      },
      {
        step: '03',
        title: 'Soin habitacle & Extraction vapeur',
        description: 'Aspiration haute précision, nettoyage vapeur des conduits, nourrissage des cuirs Nappa et dressing antistatique.',
      },
      {
        step: '04',
        title: 'Finition lustrante & Scellant hydrophobe',
        description: 'Séchage par souffleur d’air chaud filtré, pose d’une cire hybride céramique et contrôle qualité final sous lampes d’inspection.',
      },
    ],
  },
  {
    name: 'Nettoyage intérieur',
    category: 'Nettoyage',
    shortDescription: 'Un habitacle sain, assaini à la vapeur sèche et un soin haute couture pour vos cuirs.',
    fullDescription:
      'Conçu pour les conducteurs exigeants, notre nettoyage intérieur approfondi purifie l’ensemble de l’habitacle. Chaque recoin, couture de siège, grille d’aération et moquette est traité avec des produits dédiés respectueux des matériaux nobles.',
    duration: '1h - 2h',
    price: 25000,
    image: IMAGES.interiorLeather,
    benefits: [
      'Désinfection complète par vapeur sèche et traitement antibactérien',
      'Nettoyage et hydratation mate des selleries en cuir et Alcantara',
      'Détachage par injection-extraction des tapis et moquettes',
      'Neutralisation définitive des odeurs d’humidité, de tabac ou de poussière',
    ],
    processSteps: [
      {
        step: '01',
        title: 'Dépoussiérage pneumatique & Aspiration',
        description: 'Soufflage des glissières, coutures et interstices suivi d’une aspiration haute dépression.',
      },
      {
        step: '02',
        title: 'Shampouinage & Injection-extraction',
        description: 'Traitement enzymatique des tissus et moquettes pour extraire les salissures incrustées.',
      },
      {
        step: '03',
        title: 'Soin des selleries cuir & Garnitures',
        description: 'Brossage doux au savon glycériné suivi d’un lait nourrissant anti-UV au fini mat d’origine.',
      },
      {
        step: '04',
        title: 'Vitrages & Parfum d’ambiance signature',
        description: 'Nettoyage sans traces des surfaces vitrées et écrans tactiles, finition parfumée discrète.',
      },
    ],
  },
  {
    name: 'Nettoyage extérieur',
    category: 'Nettoyage',
    shortDescription: 'Lavage haute précision sans micro-rayures, soin des jantes et brillance hydrophobe.',
    fullDescription:
      'Bien plus qu’un simple lavage, notre protocole extérieur utilise exclusivement la méthode des deux seaux avec grilles anti-sable et gants en microfibre haute densité pour préserver le vernis contre les tourbillons.',
    duration: '1h - 2h',
    price: 15000,
    image: IMAGES.landCruiser,
    benefits: [
      'Zéro risque de micro-rayures grâce aux gants microfibres dédiés',
      'Décrassage complet des étriers de frein, jantes et flancs de pneus',
      'Élimination des traces de calcaire, insectes et poussière latéritique',
      'Protection brillante instantanée repoussant l’eau et la poussière',
    ],
    processSteps: [
      {
        step: '01',
        title: 'Décontamination des roues & Passages d’ailes',
        description: 'Application d’un décontaminant ferreux au pH neutre sur les jantes et brossage doux des étriers.',
      },
      {
        step: '02',
        title: 'Mousse active de prélavage',
        description: 'Enveloppement complet du véhicule pour décoller le sable et la poussière de Dakar avant tout contact.',
      },
      {
        step: '03',
        title: 'Lavage manuel & Rinçage osmosé',
        description: 'Lavage méthodique de haut en bas et rinçage à l’eau déminéralisée.',
      },
      {
        step: '04',
        title: 'Séchage sans contact & Dressing pneus',
        description: 'Séchage par air pulsé, application d’un Quick Detailer céramique et satinage des flancs de pneus.',
      },
    ],
  },
  {
    name: 'Polissage & Correction',
    category: 'Polissage',
    shortDescription: 'Élimination des micro-rayures, tourbillons et oxydation pour une profondeur de teinte absolue.',
    fullDescription:
      'Le climat ensoleillé et sablonneux ternit progressivement le vernis automobile. Notre polissage multi-étapes corrige jusqu’à 95 % des défauts visuels (swirls, hologrammes, rayures fines) afin de révéler une clarté optique incomparable.',
    duration: '2h - 4h',
    price: 40000,
    image: IMAGES.polishingDetail,
    benefits: [
      'Suppression de 85 % à 95 % des micro-rayures et tourbillons de lavage',
      'Restauration de la profondeur et de la saturation des peintures noires et métallisées',
      'Mesure systématique de l’épaisseur du vernis par micromètre électronique',
      'Préparation idéale avant la pose d’un traitement céramique',
    ],
    processSteps: [
      {
        step: '01',
        title: 'Relevé micrométrique & Masquage',
        description: 'Contrôle électronique de l’épaisseur de la peinture et protection des joints et plastiques sensibles.',
      },
      {
        step: '02',
        title: 'Passe de coupe (Cutting)',
        description: 'Correction des rayures marquées et de l’oxydation à l’aide d’une polisseuse orbitale et de pads microfibres.',
      },
      {
        step: '03',
        title: 'Passe de finition (Jeweling)',
        description: 'Affinage du vernis pour éliminer tout voile et obtenir une réflexion miroir cristalline.',
      },
      {
        step: '04',
        title: 'Dégraissage IPA & Scellement',
        description: 'Inspection sous lampes scialytiques et pose d’un scellant synthétique haute brillance.',
      },
    ],
  },
  {
    name: 'Protection carrosserie',
    category: 'Protection',
    shortDescription: 'Traitement céramique 9H et film de protection longue durée contre les UV, le sel et les rayures.',
    fullDescription:
      'Bouclier moléculaire de haute technologie, notre traitement céramique 9H fusionne avec le vernis d’origine pour créer une barrière hydrophobe, anti-UV et résistante aux agressions climatiques côtières de Dakar.',
    duration: '3h - 6h',
    price: 80000,
    image: IMAGES.paintCorrection,
    benefits: [
      'Protection certifiée contre les rayons UV intenses, l’air marin salin et les fientes',
      'Effet hydrophobe extrême facilitant chaque lavage futur (effet lotus)',
      'Dureté 9H limitant l’apparition des micro-rayures d’usage',
      'Éclat vitrifié profond garanti jusqu’à 36 mois',
    ],
    processSteps: [
      {
        step: '01',
        title: 'Décontamination totale & Polissage préparatoire',
        description: 'Mise à nu parfaite du vernis pour garantir la liaison chimique du revêtement céramique.',
      },
      {
        step: '02',
        title: 'Dégraissage intégral de la carrosserie',
        description: 'Stérilisation de surface à l’alcool isopropylique pour éliminer toute huile de polissage.',
      },
      {
        step: '03',
        title: 'Application de la matrice Céramique 9H',
        description: 'Pose croisée élément par élément en cabine à hygrométrie contrôlée.',
      },
      {
        step: '04',
        title: 'Polymérisation infrarouge',
        description: 'Durcissement thermique sous lampes IR et application d’un Top Coat hydrophobe.',
      },
    ],
  },
  {
    name: 'Traitement antirouille',
    category: 'Protection',
    shortDescription: 'Protection intégrale du châssis et des soubassements contre la corrosion marine.',
    fullDescription:
      'Indispensable sur la presqu’île du Cap-Vert, notre traitement antirouille protège durablement le châssis, les bras de suspension et les corps creux contre le sel marin et l’humidité hivernale.',
    duration: '2h - 3h',
    price: 35000,
    image: IMAGES.polishingDetail,
    benefits: [
      'Stoppe l’oxydation existante par convertisseur chimique actif',
      'Barrière isolante souple ne se fissurant pas face aux gravillons',
      'Allonge la durée de vie mécanique du châssis et de la boulonnerie',
      'Inspection vidéo du soubassement avant et après intervention',
    ],
    processSteps: [
      {
        step: '01',
        title: 'Lavage châssis haute pression sur pont',
        description: 'Dessalage complet du soubassement, des passages de roues et des longerons.',
      },
      {
        step: '02',
        title: 'Décapage & Convertisseur de rouille',
        description: 'Brossage des points d’oxydation superficiels et stabilisation chimique.',
      },
      {
        step: '03',
        title: 'Pulvérisation cire corps creux & Bitume élastomère',
        description: 'Application haute pression d’un revêtement anticorrosion hydrophobe.',
      },
      {
        step: '04',
        title: 'Séchage & Certificat de contrôle',
        description: 'Vérification des organes de freinage et d’échappement avant restitution.',
      },
    ],
  },
  {
    name: 'Préparation automobile',
    category: 'Préparation',
    shortDescription: 'Remise à neuf esthétique complète avant vente, livraison VIP ou événement officiel.',
    fullDescription:
      'Destinée aux particuliers souhaitant vendre leur véhicule au meilleur prix ainsi qu’aux concessions et flottes diplomatiques, notre préparation esthétique couvre le compartiment moteur, l’habitacle, les optiques et la carrosserie.',
    duration: '4h - 8h',
    price: 100000,
    image: IMAGES.landCruiser,
    benefits: [
      'Augmente la valeur perçue et accélère la revente du véhicule',
      'Dégraissage et dressing sécurisé du compartiment moteur',
      'Rénovation des optiques de phares ternis ou jaunis',
      'Dossier photographique studio remis au propriétaire après préparation',
    ],
    processSteps: [
      {
        step: '01',
        title: 'Soin du compartiment moteur',
        description: 'Dégraissage vapeur basse pression, protection des connectiques et satinage des durites.',
      },
      {
        step: '02',
        title: 'Remise à neuf intérieure & Sellerie',
        description: 'Pressing complet des sièges, ciel de toit, coffre et rénovation des plastiques.',
      },
      {
        step: '03',
        title: 'Polissage 1-Step & Rénovation optiques',
        description: 'Correction d’éclat sur l’ensemble de la carrosserie et resurfaçage des phares.',
      },
      {
        step: '04',
        title: 'Protection cire & Shooting photo studio',
        description: 'Finition showroom et prise de vues haute définition dans notre atelier.',
      },
    ],
  },
];

export const DEMO_PORTFOLIO_RAW = [
  {
    id: 'proj-1',
    title: 'Mercedes-Benz Classe C Coupé AMG',
    vehicle: 'Mercedes Classe C',
    category: 'Detailing',
    servicesPerformed: ['Detailing', 'Polissage', 'Protection'],
    description:
      'Restauration complète de l’éclat sur peinture Noir Obsidienne fortement micro-rayée, suivie d’une protection céramique 9H bi-couche.',
    duration: '6 heures',
    completionDate: 'Septembre 2026',
    beforeImage: IMAGES.polishingDetail,
    afterImage: IMAGES.paintCorrection,
    galleryImages: [IMAGES.paintCorrection, IMAGES.polishingDetail, IMAGES.interiorLeather],
    featured: true,
  },
  {
    id: 'proj-2',
    title: 'Toyota Land Cruiser 300 VXR',
    vehicle: 'Toyota Land Cruiser',
    category: 'Protection',
    servicesPerformed: ['Protection', 'Traitement antirouille', 'Detailing'],
    description:
      'Préparation intégrale d’un Land Cruiser 300 neuf à Dakar : blindage céramique carrosserie, protection châssis anti-sel marin et soin cuir.',
    duration: '8 heures',
    completionDate: 'Septembre 2026',
    beforeImage: IMAGES.polishingDetail,
    afterImage: IMAGES.landCruiser,
    galleryImages: [IMAGES.landCruiser, IMAGES.interiorLeather],
    featured: true,
  },
  {
    id: 'proj-3',
    title: 'Mercedes-Benz Classe S 500 Executive',
    vehicle: 'Mercedes Classe S',
    category: 'Polissage',
    servicesPerformed: ['Polissage', 'Nettoyage intérieur'],
    description:
      'Correction miroiterie multi-étapes pour supprimer le voile terne lié au sable et remise à neuf du salon arrière en cuir Nappa perforé.',
    duration: '5 heures',
    completionDate: 'Août 2026',
    beforeImage: IMAGES.polishingDetail,
    afterImage: IMAGES.heroSedan,
    galleryImages: [IMAGES.heroSedan, IMAGES.interiorLeather],
    featured: false,
  },
  {
    id: 'proj-4',
    title: 'Range Rover Autobiography LWB',
    vehicle: 'Range Rover Autobiography',
    category: 'Nettoyage',
    servicesPerformed: ['Nettoyage intérieur', 'Detailing'],
    description:
      'Pressing haute couture de l’habitacle, décontamination vapeur sèche des conduits et traitement hydrophobe des surfaces vitrées.',
    duration: '4 heures',
    completionDate: 'Août 2026',
    beforeImage: IMAGES.polishingDetail,
    afterImage: IMAGES.interiorLeather,
    galleryImages: [IMAGES.interiorLeather, IMAGES.landCruiser],
    featured: false,
  },
];

