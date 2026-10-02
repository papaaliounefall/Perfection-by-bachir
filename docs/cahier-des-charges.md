PERFECTION BY BACHIR NDOUR
CAHIER DES CHARGES FONCTIONNEL & TECHNIQUE
Plateforme web de detailing, préparation esthétique, nettoyage, polissage et protection automobile
« L’excellence automobile, jusque dans les détails. »
Projet	PERFECTION BY BACHIR NDOUR
Type	Application web responsive
Zone principale	Dakar, Sénégal
Devise	FCFA
Version	1.0 — 2026
 
Sommaire
01.	Présentation & objectifs
02.	Périmètre et acteurs
03.	Site public
04.	Catalogue des prestations
05.	Réalisations
06.	Réservation en ligne
07.	Espace client
08.	Gestion des véhicules & historique
09.	Dashboard professionnel
10.	CRM & gestion atelier
11.	Équipe
12.	Paiements & facturation
13.	Galerie & statistiques
14.	Authentification, rôles & sécurité
15.	Architecture technique
16.	Modèle de données & API
17.	Médias & temps réel
18.	Responsive, design & performance
19.	SEO, sauvegarde & déploiement
20.	MVP & phases de réalisation
21.	Critères d’acceptation
1. Présentation du projet
PERFECTION BY BACHIR NDOUR est une plateforme web destinée à digitaliser l’expérience client et la gestion quotidienne d’un centre spécialisé dans la préparation et l’entretien esthétique automobile.
La solution réunit trois espaces interconnectés : un site public avec réservation en ligne, un espace client faisant office de carnet automobile digital, et un dashboard professionnel pour le pilotage de l’atelier.
Vision
La plateforme ne doit pas être un simple site vitrine. Elle doit devenir progressivement le système de gestion numérique de l’atelier, depuis la découverte des prestations jusqu’à la livraison du véhicule, au paiement et à la conservation de son historique.
2. Objectifs
•	Présenter professionnellement l’entreprise, ses services et son savoir-faire. •	Mettre en valeur les transformations Avant / Après et les réalisations.
•	Permettre la prise de rendez-vous en ligne avec contrôle des disponibilités.
•	Centraliser les clients, véhicules, rendez-vous, prestations et documents.
•	Organiser le planning de l’atelier et l’affectation des techniciens.
•	Suivre l’avancement réel des véhicules et informer les clients.
•	Gérer paiements, factures, galerie et statistiques.
•	Créer pour chaque véhicule un carnet d’entretien esthétique digital durable.
3. Périmètre
La V1 est une application web responsive utilisable sur ordinateur, tablette et smartphone. Une application mobile native n’est pas incluse dans le périmètre initial, mais l’API devra permettre son développement ultérieur.
Module	Accès
Site public	Tout visiteur
Réservation	Visiteur / Client
Espace client	Client authentifié
Dashboard professionnel	Personnel autorisé
Administration	Administrateur
4. Acteurs et rôles	
Acteur	Responsabilités principales
Visiteur	Consulter le site, services, réalisations, contact et démarrer une réservation.
Client	Gérer profil et véhicules, réserver, suivre les prestations, consulter historique, photos, factures et notifications.
Technicien	Consulter ses prestations, démarrer/mettre à jour/terminer un traitement, ajouter notes et photos.
Manager	Gérer planning, clients, véhicules, affectations, 
	Opérations et certaines fonctions financières.
Administrateur	Gérer l’ensemble des données, utilisateurs, rôles, services, finances, contenus, statistiques et paramètres.
5. Site public
5.1 Accueil
•	Header : logo, Accueil, Services, Réalisations, À propos, Contact, Connexion, Prendre rendezvous.
•	Hero avec l’accroche « L’excellence automobile, jusque dans les détails. » et deux CTA : Prendre rendez-vous / Découvrir nos services.
•	Présentation de l’entreprise et de ses engagements.
•	Services principaux, réalisations sélectionnées et comparateur Avant / Après. •	Processus de prise en charge, témoignages, appel à l’action et footer.
Les chiffres marketing (nombre de véhicules, taux de satisfaction, garanties, etc.) doivent être administrables et ne doivent être publiés comme données réelles qu’après validation par l’entreprise.
5.2 À propos et Contact
•	Histoire, vision, valeurs, expertise, équipe et photos de l’atelier.
•	Coordonnées, téléphone, WhatsApp, adresse, horaires et réseaux sociaux.
•	Formulaire de contact validé côté frontend et backend.
•	Carte de localisation interactive lorsque les coordonnées officielles sont confirmées.
6. Catalogue des prestations
Les services sont entièrement administrables depuis le dashboard. Les tarifs de la maquette sont des données de démonstration jusqu’à validation officielle.
Champ	Description
Nom	Nom commercial de la prestation
Catégorie	Detailing, Nettoyage, Polissage, Protection, Préparation…
Description	Résumé et description détaillée
Média	Image principale et galerie éventuelle
Tarification	Prix fixe, prix à partir de, ou sur devis
Durée	Durée estimée
Disponibilité	Actif / suspendu
Contenu	Bénéfices, protocole, conditions
Une prestation désactivée ne doit plus être réservable, tout en restant conservée dans les historiques existants.
7. Réalisations & galerie publique
•	Portfolio filtrable par type de soin.
•	Projet avec titre, véhicule, description, prestations, durée, date et médias.
•	Comparateur Avant / Après compatible souris, tactile et clavier.
•	Vue détaillée d’une réalisation.
•	Publication/dépublication depuis le dashboard avec synchronisation immédiate du site public.
8. Tunnel de réservation
Le parcours de réservation est conçu en sept étapes.
Étape	Fonction
1 — Service	Choix d’une prestation active, avec tarif et durée.
2 — Véhicule	Sélection d’un véhicule existant ou ajout d’un nouveau.
3 — Date	Sélection d’une date autorisée.
4 — Horaire	Affichage des créneaux réellement disponibles.
5 — Informations	Nom, téléphone/WhatsApp, email et instructions.
6 — Récapitulatif	Service, véhicule, date, heure, prix estimé et informations client.
7 — Confirmation	Création d’une référence unique RDV-AAAAXXXX et notification.
8.1 Calcul des disponibilités
•	Horaires d’ouverture.
•	Durée de la prestation.
•	Capacité de l’atelier.
•	Rendez-vous déjà enregistrés.
•	Indisponibilités, fermetures et blocages administratifs.
•	Marge éventuelle entre deux prestations.
8.2 Cycle de vie
Workflow principal : À confirmer → Confirmé → Véhicule reçu → En cours → Contrôle final → Terminé → Livré.
États alternatifs : Annulé, Refusé, Absent, Reporté. Chaque changement doit être historisé avec date, utilisateur et ancienne/nouvelle valeur.
9. Espace client
L’espace client agit comme un carnet d’entretien esthétique numérique.
•	Dashboard
•	Mes véhicules
•	Mes rendez-vous
•	Historique
•	Factures
•	Notifications •	Profil
9.1 Dashboard client
•	Prochain rendez-vous avec statut.
•	Véhicule principal.
•	Dernière prestation terminée.
•	Suivi du véhicule actuellement à l’atelier.
•	Actions rapides : réserver, ajouter un véhicule, voir les rendez-vous. •	Journal d’activité récent.
Le pourcentage d’avancement doit correspondre à des étapes de travail réellement validées, et non à une simple estimation basée sur le temps écoulé.
10. Véhicules et carnet digital
Donnée véhicule	Exemple
Marque / Modèle	Toyota Land Cruiser
Année	2024
Immatriculation	Format sénégalais
Couleur	Noir
Motorisation	Diesel / Essence / Hybride…
Photo	Média principal
Notes	Informations utiles atelier
La fiche véhicule comprend : Profil, Historique, Rendez-vous, Photos Avant/Après et Factures.
10.1 Historique • Date et prestation.
•	Technicien responsable.
•	Durée et observations.
•	Points de contrôle / étapes réalisées.
•	Produits utilisés si pertinent.
•	Photos Avant / Après.
 
Prix, paiement et facture associée.
11. Rendez-vous & notifications client
Les rendez-vous sont classés en À venir, Terminés et Annulés. Les règles d’annulation/report sont configurables par l’entreprise.
•	Confirmation de réservation.
•	Rendez-vous confirmé ou reporté.
•	Rappel de rendez-vous.
•	Véhicule reçu.
•	Prestation commencée / terminée.
•	Facture disponible. •	Paiement reçu.
Canaux progressifs : notifications in-app et email en V1 ; WhatsApp/SMS pourront être intégrés ensuite.
12. Dashboard professionnel
Navigation recommandée : Dashboard ; Activité (Rendez-vous, Clients, Véhicules) ; Atelier 
(Prestations en cours, Services, Équipe) ; Finances (Paiements, Factures) ; Contenu (Galerie) ; Analyse (Statistiques) ; Système (Utilisateurs, Paramètres).
12.1 Indicateurs
•	Rendez-vous du jour.
•	Rendez-vous à confirmer.
•	Véhicules à l’atelier.
•	Prestations en cours.
•	Prestations terminées.
•	Nouveaux clients.
•	Chiffre d’affaires selon les droits de l’utilisateur.
12.2 Planning
•	Vue calendrier et vue liste.
•	Filtres date, statut, service, employé, client et véhicule.
•	Actions : confirmer, reporter, affecter, réceptionner, démarrer, terminer, annuler, ajouter une note.
•	Synchronisation des changements avec l’espace client.
13. CRM clients
•	Recherche par nom, téléphone, email ou immatriculation.
•	Création et édition de fiches clients.
Vue des véhicules, rendez-vous, historique, factures et paiements.
•	Total dépensé et indicateurs relationnels.
•	Notes internes strictement invisibles au client.
14. Gestion opérationnelle de l’atelier
Étape	Action
Réception	Confirmer l’arrivée du véhicule.
Inspection	État général, observations, dommages existants et photos.
Affectation	Attribuer un ou plusieurs techniciens.
Traitement	Valider progressivement les étapes de la prestation.
Contrôle qualité	Validation finale avant clôture.
Médias finaux	Ajouter les photos après traitement.
Livraison	Marquer le véhicule comme livré.
15. Gestion de l’équipe
•	Nom, photo, téléphone, email, rôle et spécialité.
•	Compte utilisateur lié.
•	Statut : Disponible, Occupé, En pause, Absent.
•	Charge de travail quotidienne.
•	Prestations affectées et historique opérationnel.
16. Paiements
Méthodes prévues : Wave, Orange Money, carte bancaire, espèces et virement. La V1 peut enregistrer manuellement les encaissements ; une intégration API réelle pourra être ajoutée ultérieurement via un prestataire adapté.
Statuts : En attente, Partiellement payé, Payé, Échoué, Remboursé, Annulé.
17. Facturation
•	Référence INV-AAAA-XXXX.
•	Identité de l’entreprise et du client.
•	Véhicule et immatriculation.
•	Détail des prestations et prix.
•	Sous-total, remise éventuelle, total, payé et reste à payer.
•	Méthode et statut du paiement.
Génération et téléchargement PDF.
18. Galerie & statistiques
•	Création, publication, dépublication et suppression contrôlée de projets Avant/Après.
•	Seuls les projets publiés apparaissent sur le site public.
•	Statistiques : CA quotidien/hebdomadaire/mensuel/annuel, rendez-vous, annulations, services populaires, nouveaux clients, clients récurrents et véhicules traités.
•	Exports CSV ; rapports PDF en évolution ultérieure.
19. Authentification et RBAC
Pour une application web first-party, privilégier une authentification sécurisée utilisant des cookies HttpOnly lorsque l’architecture le permet. Prévoir connexion, déconnexion, mot de passe oublié, réinitialisation et changement de mot de passe.
Fonction	Client	Technicien	Manager	Admin
Ses véhicules	Oui	—	Oui	Oui
Ses rendez-vous	Oui	—	Oui	Oui
Prestations assignées	—	Oui	Oui	Oui
CRM clients	—	Limité	Oui	Oui
Services	—	Lecture	Oui	Oui
Paiements	Propres	—	Oui	Oui
Statistiques	—	—	Oui	Oui
Utilisateurs / paramètres	—	—	—	Oui
Les autorisations doivent toujours être contrôlées côté backend ; masquer un bouton dans React ne constitue pas une mesure de sécurité.
20. Architecture technique
Architecture cible : React + TypeScript → API REST Django REST Framework → PostgreSQL, avec stockage objet pour les médias et Redis/Celery lorsque des traitements asynchrones sont nécessaires.
Couche	Technologies recommandées
Frontend	React, TypeScript, Vite, Tailwind CSS, React 
Router, TanStack Query, React Hook Form, Zod
Backend	Python, Django, Django REST Framework
Données	PostgreSQL
Asynchrone	Redis + Celery selon besoin
 
 
Médias	Stockage S3 compatible / Cloudflare R2
Déploiement	Docker, Nginx, Gunicorn
21. Organisation du backend
Découpage Django recommandé : accounts, customers, employees, vehicles, services, appointments, workshop, payments, invoices, gallery, notifications, analytics et core.
Chaque domaine possède ses modèles, serializers, vues, permissions, services métier et tests. Les règles métier critiques ne doivent pas être dispersées dans les composants frontend.
22. Organisation du frontend
Le frontend est organisé par domaines : app, assets, components, features, public, customer, admin, services, hooks, types, utils et layouts.
Les trois espaces peuvent partager un même projet React avec des layouts et routes séparés, tout en réutilisant le même design system.
23. Modèle de données
Relations centrales : User → Customer → Vehicle → Appointment → Service / Employee / WorkshopJob. Appointment est relié aux paiements et factures.
•	users, roles, permissions
•	customers, employees
•	vehicles, vehicle_images
•	service_categories, services
•	appointments, appointment_services, appointment_status_history
•	workshop_jobs, workshop_steps, workshop_notes
•	payments, invoices, invoice_items
•	gallery_projects, gallery_images
•	notifications, reviews, business_settings, audit_logs
24. API REST
Versionner l’API sous /api/v1/. Exemples : /auth/, /customers/, /vehicles/, /services/, /appointments/, /workshop/, /employees/, /payments/, /invoices/, /gallery/, /notifications/, /analytics/.
Les transitions importantes doivent utiliser des actions métier contrôlées : confirmer, check-in, démarrer, terminer, annuler. Un client ne doit pas pouvoir modifier arbitrairement le champ status.
25. Médias
Les photos et PDF ne doivent pas être stockés directement dans PostgreSQL. Les fichiers sont placés dans un stockage objet ; la base conserve leurs métadonnées et références.
•	Compression et miniatures.
•	Validation MIME et taille maximale.
•	Suppression contrôlée.
•	URLs signées pour les contenus privés.
•	Séparation stricte entre galerie publique et photos privées des véhicules.
26. Temps réel
La V1 peut utiliser TanStack Query avec invalidation et rafraîchissement contrôlé. Django Channels + Redis pourra être ajouté si le besoin de WebSocket temps réel est confirmé.
27. Sécurité
•	HTTPS obligatoire.
•	Validation systématique côté backend.
•	RBAC et contrôle de propriété des ressources.
•	CSRF/CORS configurés selon l’architecture.
•	Rate limiting sur les endpoints sensibles.
•	Contrôle strict des uploads.
•	Journalisation des opérations critiques.
•	Secrets uniquement en variables d’environnement.
•	Sauvegardes PostgreSQL et médias.
•	Aucun secret dans le frontend ou un dépôt Git public.
28. Audit
Les actions sensibles doivent conserver l’utilisateur, la date, l’objet concerné, l’ancienne valeur et la nouvelle valeur : changement de statut, prix, suppression, paiement, facture, rôle et publication.
29. Responsive & UX
•	Desktop : sidebar et tableaux complets.
•	Tablette : sidebar rétractable et grilles adaptées.
•	Mobile : cartes, navigation simplifiée, formulaires adaptés, gros touch targets et galerie tactile.
•	Ne pas simplement réduire la version desktop.
30. Direction artistique
Style premium automobile, élégant, sombre, minimal et photographique. Palette : noir, charbon, blanc, gris métallique avec accent or discret ou orange chaud.
À éviter : néon, glassmorphism excessif, gradients omniprésents, 3D décorative, animations permanentes et esthétique générique « IA ».
Animations
Micro-interactions sobres de 150 à 400 ms : hover, transitions, changement de statut, comparateur Avant/Après et apparitions légères au scroll.
31. Performance & accessibilité
•	Lazy loading et formats WebP/AVIF.
•	Pagination API et requêtes Django optimisées.
•	Indexes PostgreSQL.
•	Code splitting React.
•	CDN pour les médias.
•	Navigation clavier et contrastes suffisants.
•	Labels de formulaires, alt images et messages d’erreur accessibles.
Cible indicative des pages publiques : scores Lighthouse ≥ 90 pour Performance, Accessibilité, Best Practices et SEO, sous réserve du contenu média final.
32. SEO
•	Titres et meta descriptions.
•	OpenGraph.
•	sitemap.xml et robots.txt.
•	URLs lisibles et canonical.
•	Alt des images.
•	Données structurées lorsque pertinentes.
Exemples : /services/polissage-correction, /services/protection-ceramique, /realisations.
33. Sauvegarde & environnements
•	Sauvegarde automatique PostgreSQL.
•	Sauvegarde des médias.
•	Politique de rétention.
•	Tests périodiques de restauration.
•	Environnements séparés : Development, Staging, Production.
34. Déploiement
Schéma cible : domaine/CDN → frontend React et backend Django → PostgreSQL ; stockage R2 pour les médias ; Redis/Celery si nécessaire. Docker doit permettre de reproduire l’environnement de manière fiable.
35. MVP recommandé
Phase	Contenu
Phase 1 — Socle	Authentification, rôles, services, clients, véhicules, rendez-vous, site public, réservation et dashboard de base.
Phase 2 — Atelier	Workflow réception → traitement → contrôle → livraison, affectations, notes et photos Avant/Après.
Phase 3 — Finances	Paiements enregistrés, factures PDF et historique financier.
Phase 4 — Contenu & analyse	Galerie administrable, statistiques, exports et notifications avancées.
Phase 5 — Évolutions	Paiement API, WhatsApp/SMS, WebSocket si utile, application mobile React Native.
36. Critères d’acceptation
•	Un visiteur peut consulter les services et soumettre une réservation complète.
•	Le système empêche les réservations sur un créneau indisponible.
•	Un client authentifié ne voit que ses propres véhicules, rendez-vous, factures et médias privés.
•	Le personnel peut faire progresser un rendez-vous uniquement selon les transitions autorisées.
•	Une prestation désactivée disparaît des nouvelles réservations sans casser les historiques.
•	Une réalisation publiée dans le dashboard apparaît sur le site public.
•	Les paiements et factures restent cohérents avec le montant dû.
•	Les actions sensibles sont protégées par permissions et journalisées.
•	L’interface reste utilisable sur desktop, tablette et mobile.
•	Les données de démonstration ne sont pas présentées comme des données officielles sans validation.
37. Livrables attendus
•	Code source frontend.
•	Code source backend.
•	Base de données et migrations.
•	Documentation d’installation et déploiement.
•	Documentation API.
•	Jeu de données de démonstration séparé des données de production.
•	Tests essentiels backend/frontend.
•	Configuration Docker.
•	Guide administrateur succinct.
38. Conclusion
PERFECTION BY BACHIR NDOUR doit être conçu comme un produit métier évolutif : une vitrine premium côté public, une expérience transparente côté client et un véritable outil de pilotage côté atelier. L’architecture API-first permettra d’ajouter ultérieurement une application mobile sans reconstruire la logique métier.
