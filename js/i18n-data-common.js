/* =========================================================================
   WISY SAFETY — Traductions COMMUNES (header · navigation · footer)
   Chargé sur toutes les pages. Fusionne dans window.I18N.
   Pour corriger une phrase : modifiez la valeur correspondante ci-dessous.
   Les noms propres (VCA, BEPS, PEB, CACES, REACH, PEMP, Wisy Safety),
   l'adresse, le téléphone et l'e-mail ne sont pas traduits.
   ========================================================================= */
(function () {
  var I = window.I18N || (window.I18N = {});
  function m(lang, obj) { I[lang] = Object.assign(I[lang] || {}, obj); }

  // Noms des langues (dans leur propre écriture) — pour le sélecteur
  I.__names__ = Object.assign(I.__names__ || {}, {
    fr: "Français", en: "English", nl: "Nederlands", af: "Afrikaans",
    ar: "العربية", bg: "Български", de: "Deutsch", ro: "Română",
    it: "Italiano", sl: "Slovenščina"
  });

  /* ---------------- FRANÇAIS (langue source) ---------------- */
  m("fr", {
    "util.badge": "Organisme de formation agréé · Anderlecht, Belgique",
    "nav.formations": "Formations",
    "nav.all_formations": "Voir toutes les formations",
    "nav.all_formations_desc": "Notre catalogue complet certifié",
    "dd.vca_base": "VCA de base", "dd.vca_base_desc": "Les fondamentaux de la sécurité chantier",
    "dd.vca_hier": "VCA ligne hiérarchique", "dd.vca_hier_desc": "Pour l'encadrement et les responsables",
    "dd.nacelle": "Nacelles élévatrices", "dd.nacelle_desc": "Conduite en sécurité des PEMP",
    "dd.nacelle_full": "Formation Nacelles Élévatrices", "dd.nacelle_dur": "1 jour", "dd.nacelle_fmt": "Théorie + pratique",
    "dd.nacelle_langs": "Français · Néerlandais · Anglais",
    "dd.nacelle_summary": "Développez les compétences nécessaires pour utiliser les nacelles élévatrices de manière sûre, efficace et responsable dans un environnement professionnel.",
    "dd.fibre": "Fibre optique", "dd.fibre_desc": "Installation et raccordement",
    "dd.beps": "BEPS — Premier secours", "dd.beps_desc": "Les gestes qui sauvent",
    "dd.beps_full": "Brevet Européen de Premiers Secours", "dd.beps_dur": "15 heures", "dd.beps_fmt": "Essentiellement pratique",
    "dd.beps_langs": "Français · Néerlandais · Anglais",
    "dd.beps_summary": "Apprendre, en 15 heures, à protéger, alerter le 112 et secourir une victime en attendant les professionnels : réanimation, défibrillation, position latérale de sécurité, hémorragies, étouffement, malaises et brûlures.",
    "dd.diiso": "Diisocyanates & substances dangereuses", "dd.diiso_desc": "Manipulation conforme à la réglementation",
    "nav.vca_entreprise": "VCA Entreprise", "nav.peb": "PEB Wallonie & Bruxelles",
    "nav.coordination": "Coordination", "nav.certificat": "Certificat", "nav.agenda": "Agenda", "nav.avis": "Avis",
    "header.contact": "Contact", "header.register": "S'inscrire",
    "aria.open_menu": "Ouvrir le menu", "aria.close_menu": "Fermer le menu", "aria.choose_lang": "Choisir la langue",
    "footer.cta_eyebrow": "On commence quand vous voulez",
    "footer.cta_title": "Prêt à <span class=\"hl\">sécuriser vos équipes</span> ?",
    "footer.cta_text": "Réservez une session ou demandez un devis sur mesure — réponse rapide, sans engagement.",
    "footer.cta_btn": "S'inscrire à une formation",
    "footer.loc": "Anderlecht · Belgique", "footer.tagline": "Sécurité & certifications VCA",
    "footer.pitch": "La sécurité de vos équipes commence par la <span class=\"hl\">bonne formation.</span>",
    "footer.col_services": "Nos services", "footer.label_phone": "Téléphone", "footer.label_email": "E-mail",
    "footer.label_address": "Adresse", "footer.col_hours": "Heures d'ouverture",
    "footer.mon": "Lundi", "footer.tue": "Mardi", "footer.wed": "Mercredi", "footer.thu": "Jeudi",
    "footer.fri": "Vendredi", "footer.sat": "Samedi", "footer.sun": "Dimanche", "footer.closed": "Fermé",
    "footer.status_open": "ACTUELLEMENT OUVERT", "footer.status_closed": "ACTUELLEMENT FERMÉ",
    "footer.legal_mentions": "Mentions légales", "footer.legal_privacy": "Politique de confidentialité",
    "footer.legal_terms": "Conditions générales", "footer.rights": "Tous droits réservés."
  });

  /* ---------------- ENGLISH ---------------- */
  m("en", {
    "util.badge": "Accredited training centre · Anderlecht, Belgium",
    "nav.formations": "Training",
    "nav.all_formations": "View all courses", "nav.all_formations_desc": "Our full certified catalogue",
    "dd.vca_base": "VCA Basic", "dd.vca_base_desc": "The fundamentals of site safety",
    "dd.vca_hier": "VCA for Supervisors", "dd.vca_hier_desc": "For managers and supervisors",
    "dd.nacelle": "Aerial work platform", "dd.nacelle_desc": "Safe operation of MEWPs",
    "dd.nacelle_full": "Aerial Work Platform Training", "dd.nacelle_dur": "1 day", "dd.nacelle_fmt": "Theory + practice",
    "dd.nacelle_langs": "French · Dutch · English",
    "dd.nacelle_summary": "Develop the skills needed to use aerial work platforms safely, efficiently and responsibly in a professional environment.",
    "dd.fibre": "Optical fibre", "dd.fibre_desc": "Installation and splicing",
    "dd.beps": "BEPS — First aid", "dd.beps_desc": "The gestures that save lives",
    "dd.beps_full": "European First Aid Certificate", "dd.beps_dur": "15 hours", "dd.beps_fmt": "Mostly hands-on practice",
    "dd.beps_langs": "French · Dutch · English",
    "dd.beps_summary": "Learn, in 15 hours, to protect, alert 112 and assist a victim while waiting for professional help: CPR, defibrillation, recovery position, bleeding, choking, sudden illness and burns.",
    "dd.diiso": "Diisocyanates & hazardous substances", "dd.diiso_desc": "Handling in line with regulations",
    "nav.vca_entreprise": "VCA for Companies", "nav.peb": "PEB Wallonia & Brussels",
    "nav.coordination": "Coordination", "nav.certificat": "Certificate", "nav.agenda": "Schedule", "nav.avis": "Reviews",
    "header.contact": "Contact", "header.register": "Register",
    "aria.open_menu": "Open menu", "aria.close_menu": "Close menu", "aria.choose_lang": "Choose language",
    "footer.cta_eyebrow": "We start whenever you're ready",
    "footer.cta_title": "Ready to <span class=\"hl\">keep your teams safe</span>?",
    "footer.cta_text": "Book a session or request a tailored quote — quick reply, no commitment.",
    "footer.cta_btn": "Enrol in a course",
    "footer.loc": "Anderlecht · Belgium", "footer.tagline": "Safety & VCA certifications",
    "footer.pitch": "Your teams' safety starts with the <span class=\"hl\">right training.</span>",
    "footer.col_services": "Our services", "footer.label_phone": "Phone", "footer.label_email": "E-mail",
    "footer.label_address": "Address", "footer.col_hours": "Opening hours",
    "footer.mon": "Monday", "footer.tue": "Tuesday", "footer.wed": "Wednesday", "footer.thu": "Thursday",
    "footer.fri": "Friday", "footer.sat": "Saturday", "footer.sun": "Sunday", "footer.closed": "Closed",
    "footer.status_open": "CURRENTLY OPEN", "footer.status_closed": "CURRENTLY CLOSED",
    "footer.legal_mentions": "Legal notice", "footer.legal_privacy": "Privacy policy",
    "footer.legal_terms": "Terms & conditions", "footer.rights": "All rights reserved."
  });

  /* ---------------- NEDERLANDS ---------------- */
  m("nl", {
    "util.badge": "Erkend opleidingscentrum · Anderlecht, België",
    "nav.formations": "Opleidingen",
    "nav.all_formations": "Alle opleidingen bekijken", "nav.all_formations_desc": "Onze volledige gecertificeerde catalogus",
    "dd.vca_base": "VCA Basis", "dd.vca_base_desc": "De basis van de veiligheid op de werf",
    "dd.vca_hier": "VCA voor Leidinggevenden", "dd.vca_hier_desc": "Voor kaderleden en leidinggevenden",
    "dd.nacelle": "Hoogwerker", "dd.nacelle_desc": "Veilig bedienen van hoogwerkers",
    "dd.nacelle_full": "Opleiding Hoogwerkers", "dd.nacelle_dur": "1 dag", "dd.nacelle_fmt": "Theorie + praktijk",
    "dd.nacelle_langs": "Frans · Nederlands · Engels",
    "dd.nacelle_summary": "Ontwikkel de vaardigheden die nodig zijn om hoogwerkers veilig, efficiënt en verantwoord te gebruiken in een professionele omgeving.",
    "dd.fibre": "Glasvezel", "dd.fibre_desc": "Installatie en aansluiting",
    "dd.beps": "BEPS — Eerste hulp", "dd.beps_desc": "De handelingen die levens redden",
    "dd.beps_full": "Europees Brevet Eerste Hulp", "dd.beps_dur": "15 uur", "dd.beps_fmt": "Overwegend praktijkgericht",
    "dd.beps_langs": "Frans · Nederlands · Engels",
    "dd.beps_summary": "Leer in 15 uur hoe u beschermt, 112 alarmeert en een slachtoffer helpt in afwachting van de hulpdiensten: reanimatie, defibrillatie, stabiele zijligging, bloedingen, verslikking, onwel wording en brandwonden.",
    "dd.diiso": "Di-isocyanaten & gevaarlijke stoffen", "dd.diiso_desc": "Hantering conform de regelgeving",
    "nav.vca_entreprise": "VCA Bedrijven", "nav.peb": "PEB Wallonië & Brussel",
    "nav.coordination": "Coördinatie", "nav.certificat": "Certificaat", "nav.agenda": "Agenda", "nav.avis": "Beoordelingen",
    "header.contact": "Contact", "header.register": "Inschrijven",
    "aria.open_menu": "Menu openen", "aria.close_menu": "Menu sluiten", "aria.choose_lang": "Kies taal",
    "footer.cta_eyebrow": "We beginnen wanneer u wilt",
    "footer.cta_title": "Klaar om <span class=\"hl\">uw teams te beveiligen</span>?",
    "footer.cta_text": "Boek een sessie of vraag een offerte op maat — snel antwoord, vrijblijvend.",
    "footer.cta_btn": "Inschrijven voor een opleiding",
    "footer.loc": "Anderlecht · België", "footer.tagline": "Veiligheid & VCA-certificeringen",
    "footer.pitch": "De veiligheid van uw teams begint met de <span class=\"hl\">juiste opleiding.</span>",
    "footer.col_services": "Onze diensten", "footer.label_phone": "Telefoon", "footer.label_email": "E-mail",
    "footer.label_address": "Adres", "footer.col_hours": "Openingsuren",
    "footer.mon": "Maandag", "footer.tue": "Dinsdag", "footer.wed": "Woensdag", "footer.thu": "Donderdag",
    "footer.fri": "Vrijdag", "footer.sat": "Zaterdag", "footer.sun": "Zondag", "footer.closed": "Gesloten",
    "footer.status_open": "NU GEOPEND", "footer.status_closed": "NU GESLOTEN",
    "footer.legal_mentions": "Wettelijke vermeldingen", "footer.legal_privacy": "Privacybeleid",
    "footer.legal_terms": "Algemene voorwaarden", "footer.rights": "Alle rechten voorbehouden."
  });

  /* ---------------- AFRIKAANS ---------------- */
  m("af", {
    "util.badge": "Geakkrediteerde opleidingsentrum · Anderlecht, België",
    "nav.formations": "Opleidings",
    "nav.all_formations": "Bekyk alle opleidings", "nav.all_formations_desc": "Ons volledige gesertifiseerde katalogus",
    "dd.vca_base": "VCA Basis", "dd.vca_base_desc": "Die grondbeginsels van terreinveiligheid",
    "dd.vca_hier": "VCA vir Toesighouers", "dd.vca_hier_desc": "Vir bestuur en toesighouers",
    "dd.nacelle": "Hoogwerker", "dd.nacelle_desc": "Veilige bediening van hoogwerkers",
    "dd.nacelle_full": "Opleiding Hoogwerkers", "dd.nacelle_dur": "1 dag", "dd.nacelle_fmt": "Teorie + praktyk",
    "dd.nacelle_langs": "Frans · Nederlands · Engels",
    "dd.nacelle_summary": "Ontwikkel die vaardighede wat nodig is om hoogwerkers veilig, doeltreffend en verantwoordelik in 'n professionele omgewing te gebruik.",
    "dd.fibre": "Optiese vesel", "dd.fibre_desc": "Installasie en aansluiting",
    "dd.beps": "BEPS — Noodhulp", "dd.beps_desc": "Die handelinge wat lewens red",
    "dd.beps_full": "Europese Sertifikaat vir Noodhulp", "dd.beps_dur": "15 uur", "dd.beps_fmt": "Grotendeels prakties",
    "dd.beps_langs": "Frans · Nederlands · Engels",
    "dd.beps_summary": "Leer in 15 uur om te beskerm, 112 te bel en 'n slagoffer by te staan terwyl u op professionele hulp wag: hartmassering, defibrillasie, stabiele sylegging, bloeding, verstikking, onwelwording en brandwonde.",
    "dd.diiso": "Di-isosianate & gevaarlike stowwe", "dd.diiso_desc": "Hantering volgens die regulasies",
    "nav.vca_entreprise": "VCA vir Maatskappye", "nav.peb": "PEB Wallonië & Brussel",
    "nav.coordination": "Koördinasie", "nav.certificat": "Sertifikaat", "nav.agenda": "Agenda", "nav.avis": "Resensies",
    "header.contact": "Kontak", "header.register": "Registreer",
    "aria.open_menu": "Maak kieslys oop", "aria.close_menu": "Sluit kieslys", "aria.choose_lang": "Kies taal",
    "footer.cta_eyebrow": "Ons begin wanneer u gereed is",
    "footer.cta_title": "Gereed om <span class=\"hl\">u spanne veilig te hou</span>?",
    "footer.cta_text": "Bespreek 'n sessie of vra 'n pasgemaakte kwotasie — vinnige antwoord, geen verpligting.",
    "footer.cta_btn": "Skryf in vir 'n opleiding",
    "footer.loc": "Anderlecht · België", "footer.tagline": "Veiligheid & VCA-sertifisering",
    "footer.pitch": "U spanne se veiligheid begin met die <span class=\"hl\">regte opleiding.</span>",
    "footer.col_services": "Ons dienste", "footer.label_phone": "Telefoon", "footer.label_email": "E-pos",
    "footer.label_address": "Adres", "footer.col_hours": "Openingsure",
    "footer.mon": "Maandag", "footer.tue": "Dinsdag", "footer.wed": "Woensdag", "footer.thu": "Donderdag",
    "footer.fri": "Vrydag", "footer.sat": "Saterdag", "footer.sun": "Sondag", "footer.closed": "Gesluit",
    "footer.status_open": "TANS OOP", "footer.status_closed": "TANS GESLUIT",
    "footer.legal_mentions": "Regskennisgewing", "footer.legal_privacy": "Privaatheidsbeleid",
    "footer.legal_terms": "Algemene voorwaardes", "footer.rights": "Alle regte voorbehou."
  });

  /* ---------------- العربية (RTL) ---------------- */
  m("ar", {
    "util.badge": "مركز تدريب معتمد · أندرلخت، بلجيكا",
    "nav.formations": "الدورات",
    "nav.all_formations": "عرض جميع الدورات", "nav.all_formations_desc": "كامل الكتالوج المعتمد لدينا",
    "dd.vca_base": "VCA الأساسي", "dd.vca_base_desc": "أساسيات السلامة في موقع العمل",
    "dd.vca_hier": "VCA للمشرفين", "dd.vca_hier_desc": "للإدارة والمسؤولين",
    "dd.nacelle": "منصة العمل المرتفعة", "dd.nacelle_desc": "التشغيل الآمن لمنصات العمل المرتفعة",
    "dd.nacelle_full": "دورة تدريبية: منصات العمل المرتفعة", "dd.nacelle_dur": "يوم واحد", "dd.nacelle_fmt": "نظري + عملي",
    "dd.nacelle_langs": "الفرنسية · الهولندية · الإنجليزية",
    "dd.nacelle_summary": "طوّر المهارات اللازمة لاستخدام منصات العمل المرتفعة بشكل آمن وفعّال ومسؤول في بيئة مهنية.",
    "dd.fibre": "الألياف الضوئية", "dd.fibre_desc": "التركيب والتوصيل",
    "dd.beps": "BEPS — الإسعافات الأولية", "dd.beps_desc": "الإجراءات التي تنقذ الحياة",
    "dd.beps_full": "الشهادة الأوروبية للإسعافات الأولية", "dd.beps_dur": "15 ساعة", "dd.beps_fmt": "عملي في الغالب",
    "dd.beps_langs": "الفرنسية · الهولندية · الإنجليزية",
    "dd.beps_summary": "تعلّم خلال 15 ساعة كيفية الحماية والاتصال بالرقم 112 ومساعدة المصاب في انتظار وصول المختصين: الإنعاش القلبي الرئوي، إزالة الرجفان، وضعية الإفاقة الجانبية، النزيف، الاختناق، الوعكات الصحية والحروق.",
    "dd.diiso": "ثنائي الأيزوسيانات والمواد الخطرة", "dd.diiso_desc": "التعامل وفقًا للوائح",
    "nav.vca_entreprise": "VCA للشركات", "nav.peb": "PEB والونيا وبروكسل",
    "nav.coordination": "التنسيق", "nav.certificat": "الشهادة", "nav.agenda": "المواعيد", "nav.avis": "الآراء",
    "header.contact": "اتصل بنا", "header.register": "سجّل الآن",
    "aria.open_menu": "افتح القائمة", "aria.close_menu": "أغلق القائمة", "aria.choose_lang": "اختر اللغة",
    "footer.cta_eyebrow": "نبدأ متى شئت",
    "footer.cta_title": "هل أنت مستعد <span class=\"hl\">لحماية فرقك</span>؟",
    "footer.cta_text": "احجز جلسة أو اطلب عرض سعر مخصص — رد سريع، دون أي التزام.",
    "footer.cta_btn": "سجّل في دورة تدريبية",
    "footer.loc": "أندرلخت · بلجيكا", "footer.tagline": "السلامة وشهادات VCA",
    "footer.pitch": "تبدأ سلامة فرقك من <span class=\"hl\">التدريب الصحيح.</span>",
    "footer.col_services": "خدماتنا", "footer.label_phone": "الهاتف", "footer.label_email": "البريد الإلكتروني",
    "footer.label_address": "العنوان", "footer.col_hours": "ساعات العمل",
    "footer.mon": "الإثنين", "footer.tue": "الثلاثاء", "footer.wed": "الأربعاء", "footer.thu": "الخميس",
    "footer.fri": "الجمعة", "footer.sat": "السبت", "footer.sun": "الأحد", "footer.closed": "مغلق",
    "footer.status_open": "مفتوح الآن", "footer.status_closed": "مغلق الآن",
    "footer.legal_mentions": "الإشعارات القانونية", "footer.legal_privacy": "سياسة الخصوصية",
    "footer.legal_terms": "الشروط والأحكام", "footer.rights": "جميع الحقوق محفوظة."
  });

  /* ---------------- БЪЛГАРСКИ ---------------- */
  m("bg", {
    "util.badge": "Акредитиран учебен център · Андерлехт, Белгия",
    "nav.formations": "Обучения",
    "nav.all_formations": "Вижте всички обучения", "nav.all_formations_desc": "Нашият пълен сертифициран каталог",
    "dd.vca_base": "VCA основи", "dd.vca_base_desc": "Основите на безопасността на обекта",
    "dd.vca_hier": "VCA за ръководители", "dd.vca_hier_desc": "За ръководния персонал",
    "dd.nacelle": "Автовишка", "dd.nacelle_desc": "Безопасно управление на подвижни платформи",
    "dd.nacelle_full": "Обучение за автовишки", "dd.nacelle_dur": "1 ден", "dd.nacelle_fmt": "Теория + практика",
    "dd.nacelle_langs": "Френски · Нидерландски · Английски",
    "dd.nacelle_summary": "Развийте уменията, необходими за безопасно, ефективно и отговорно използване на автовишки в професионална среда.",
    "dd.fibre": "Оптични влакна", "dd.fibre_desc": "Монтаж и свързване",
    "dd.beps": "BEPS — Първа помощ", "dd.beps_desc": "Действията, които спасяват живот",
    "dd.beps_full": "Европейско удостоверение за първа помощ", "dd.beps_dur": "15 часа", "dd.beps_fmt": "Предимно практическо обучение",
    "dd.beps_langs": "Френски · Нидерландски · Английски",
    "dd.beps_summary": "Научете за 15 часа как да защитите, да подадете сигнал на 112 и да помогнете на пострадал в очакване на професионална помощ: кардио-белодробна реанимация, дефибрилация, стабилно странично положение, кръвоизливи, задавяне, неразположения и изгаряния.",
    "dd.diiso": "Диизоцианати и опасни вещества", "dd.diiso_desc": "Работа в съответствие с нормативите",
    "nav.vca_entreprise": "VCA за фирми", "nav.peb": "PEB Валония и Брюксел",
    "nav.coordination": "Координация", "nav.certificat": "Сертификат", "nav.agenda": "График", "nav.avis": "Отзиви",
    "header.contact": "Контакт", "header.register": "Записване",
    "aria.open_menu": "Отвори менюто", "aria.close_menu": "Затвори менюто", "aria.choose_lang": "Изберете език",
    "footer.cta_eyebrow": "Започваме, когато пожелаете",
    "footer.cta_title": "Готови ли сте да <span class=\"hl\">осигурите безопасността на екипите си</span>?",
    "footer.cta_text": "Резервирайте сесия или поискайте персонална оферта — бърз отговор, без ангажимент.",
    "footer.cta_btn": "Запишете се за обучение",
    "footer.loc": "Андерлехт · Белгия", "footer.tagline": "Безопасност и VCA сертификати",
    "footer.pitch": "Безопасността на екипите ви започва с <span class=\"hl\">правилното обучение.</span>",
    "footer.col_services": "Нашите услуги", "footer.label_phone": "Телефон", "footer.label_email": "Имейл",
    "footer.label_address": "Адрес", "footer.col_hours": "Работно време",
    "footer.mon": "Понеделник", "footer.tue": "Вторник", "footer.wed": "Сряда", "footer.thu": "Четвъртък",
    "footer.fri": "Петък", "footer.sat": "Събота", "footer.sun": "Неделя", "footer.closed": "Затворено",
    "footer.status_open": "В МОМЕНТА ОТВОРЕНО", "footer.status_closed": "В МОМЕНТА ЗАТВОРЕНО",
    "footer.legal_mentions": "Правна информация", "footer.legal_privacy": "Политика за поверителност",
    "footer.legal_terms": "Общи условия", "footer.rights": "Всички права запазени."
  });

  /* ---------------- DEUTSCH ---------------- */
  m("de", {
    "util.badge": "Anerkanntes Ausbildungszentrum · Anderlecht, Belgien",
    "nav.formations": "Schulungen",
    "nav.all_formations": "Alle Schulungen ansehen", "nav.all_formations_desc": "Unser vollständiger zertifizierter Katalog",
    "dd.vca_base": "VCA Grundlagen", "dd.vca_base_desc": "Die Grundlagen der Baustellensicherheit",
    "dd.vca_hier": "VCA für Führungskräfte", "dd.vca_hier_desc": "Für Führungs- und Aufsichtspersonen",
    "dd.nacelle": "Hubarbeitsbühne", "dd.nacelle_desc": "Sicheres Bedienen von Hubarbeitsbühnen",
    "dd.nacelle_full": "Schulung Hubarbeitsbühnen", "dd.nacelle_dur": "1 Tag", "dd.nacelle_fmt": "Theorie + Praxis",
    "dd.nacelle_langs": "Französisch · Niederländisch · Englisch",
    "dd.nacelle_summary": "Entwickeln Sie die Kompetenzen, um Hubarbeitsbühnen sicher, effizient und verantwortungsvoll im beruflichen Umfeld einzusetzen.",
    "dd.fibre": "Glasfaser", "dd.fibre_desc": "Installation und Anschluss",
    "dd.beps": "BEPS — Erste Hilfe", "dd.beps_desc": "Handgriffe, die Leben retten",
    "dd.beps_full": "Europäisches Erste-Hilfe-Zertifikat", "dd.beps_dur": "15 Stunden", "dd.beps_fmt": "Überwiegend praxisorientiert",
    "dd.beps_langs": "Französisch · Niederländisch · Englisch",
    "dd.beps_summary": "Lernen Sie in 15 Stunden, wie Sie schützen, den Notruf 112 absetzen und einem Verletzten helfen, bis professionelle Hilfe eintrifft: Wiederbelebung, Defibrillation, stabile Seitenlage, Blutungen, Ersticken, plötzliche Erkrankungen und Verbrennungen.",
    "dd.diiso": "Diisocyanate & Gefahrstoffe", "dd.diiso_desc": "Handhabung gemäß den Vorschriften",
    "nav.vca_entreprise": "VCA für Unternehmen", "nav.peb": "PEB Wallonien & Brüssel",
    "nav.coordination": "Koordination", "nav.certificat": "Zertifikat", "nav.agenda": "Termine", "nav.avis": "Bewertungen",
    "header.contact": "Kontakt", "header.register": "Anmelden",
    "aria.open_menu": "Menü öffnen", "aria.close_menu": "Menü schließen", "aria.choose_lang": "Sprache wählen",
    "footer.cta_eyebrow": "Wir beginnen, wann Sie wollen",
    "footer.cta_title": "Bereit, <span class=\"hl\">Ihre Teams abzusichern</span>?",
    "footer.cta_text": "Buchen Sie eine Session oder fordern Sie ein individuelles Angebot an — schnelle Antwort, unverbindlich.",
    "footer.cta_btn": "Für eine Schulung anmelden",
    "footer.loc": "Anderlecht · Belgien", "footer.tagline": "Sicherheit & VCA-Zertifizierungen",
    "footer.pitch": "Die Sicherheit Ihrer Teams beginnt mit der <span class=\"hl\">richtigen Schulung.</span>",
    "footer.col_services": "Unsere Leistungen", "footer.label_phone": "Telefon", "footer.label_email": "E-Mail",
    "footer.label_address": "Adresse", "footer.col_hours": "Öffnungszeiten",
    "footer.mon": "Montag", "footer.tue": "Dienstag", "footer.wed": "Mittwoch", "footer.thu": "Donnerstag",
    "footer.fri": "Freitag", "footer.sat": "Samstag", "footer.sun": "Sonntag", "footer.closed": "Geschlossen",
    "footer.status_open": "JETZT GEÖFFNET", "footer.status_closed": "JETZT GESCHLOSSEN",
    "footer.legal_mentions": "Impressum", "footer.legal_privacy": "Datenschutzerklärung",
    "footer.legal_terms": "AGB", "footer.rights": "Alle Rechte vorbehalten."
  });

  /* ---------------- ROMÂNĂ ---------------- */
  m("ro", {
    "util.badge": "Centru de formare acreditat · Anderlecht, Belgia",
    "nav.formations": "Cursuri",
    "nav.all_formations": "Vedeți toate cursurile", "nav.all_formations_desc": "Catalogul nostru complet certificat",
    "dd.vca_base": "VCA de bază", "dd.vca_base_desc": "Fundamentele securității pe șantier",
    "dd.vca_hier": "VCA pentru personalul de conducere", "dd.vca_hier_desc": "Pentru conducere și responsabili",
    "dd.nacelle": "Nacelă elevatoare", "dd.nacelle_desc": "Operarea în siguranță a PLE",
    "dd.nacelle_full": "Formare nacele elevatoare", "dd.nacelle_dur": "1 zi", "dd.nacelle_fmt": "Teorie + practică",
    "dd.nacelle_langs": "Franceză · Neerlandeză · Engleză",
    "dd.nacelle_summary": "Dezvoltați competențele necesare pentru a utiliza nacelele elevatoare în siguranță, eficient și responsabil într-un mediu profesional.",
    "dd.fibre": "Fibră optică", "dd.fibre_desc": "Instalare și racordare",
    "dd.beps": "BEPS — Prim ajutor", "dd.beps_desc": "Gesturile care salvează vieți",
    "dd.beps_full": "Brevetul European de Prim Ajutor", "dd.beps_dur": "15 ore", "dd.beps_fmt": "În principal practică",
    "dd.beps_langs": "Franceză · Neerlandeză · Engleză",
    "dd.beps_summary": "Învățați, în 15 ore, să protejați, să alertați 112 și să ajutați o victimă până la sosirea profesioniștilor: resuscitare, defibrilare, poziția laterală de siguranță, hemoragii, sufocare, stări de rău și arsuri.",
    "dd.diiso": "Diizocianați & substanțe periculoase", "dd.diiso_desc": "Manipulare conform reglementărilor",
    "nav.vca_entreprise": "VCA pentru companii", "nav.peb": "PEB Valonia & Bruxelles",
    "nav.coordination": "Coordonare", "nav.certificat": "Certificat", "nav.agenda": "Program", "nav.avis": "Recenzii",
    "header.contact": "Contact", "header.register": "Înscriere",
    "aria.open_menu": "Deschideți meniul", "aria.close_menu": "Închideți meniul", "aria.choose_lang": "Alegeți limba",
    "footer.cta_eyebrow": "Începem când doriți",
    "footer.cta_title": "Gata să <span class=\"hl\">vă protejați echipele</span>?",
    "footer.cta_text": "Rezervați o sesiune sau cereți o ofertă personalizată — răspuns rapid, fără angajament.",
    "footer.cta_btn": "Înscrieți-vă la un curs",
    "footer.loc": "Anderlecht · Belgia", "footer.tagline": "Securitate & certificări VCA",
    "footer.pitch": "Siguranța echipelor dvs. începe cu <span class=\"hl\">formarea potrivită.</span>",
    "footer.col_services": "Serviciile noastre", "footer.label_phone": "Telefon", "footer.label_email": "E-mail",
    "footer.label_address": "Adresă", "footer.col_hours": "Program de lucru",
    "footer.mon": "Luni", "footer.tue": "Marți", "footer.wed": "Miercuri", "footer.thu": "Joi",
    "footer.fri": "Vineri", "footer.sat": "Sâmbătă", "footer.sun": "Duminică", "footer.closed": "Închis",
    "footer.status_open": "DESCHIS ACUM", "footer.status_closed": "ÎNCHIS ACUM",
    "footer.legal_mentions": "Mențiuni legale", "footer.legal_privacy": "Politica de confidențialitate",
    "footer.legal_terms": "Termeni și condiții", "footer.rights": "Toate drepturile rezervate."
  });

  /* ---------------- ITALIANO ---------------- */
  m("it", {
    "util.badge": "Centro di formazione accreditato · Anderlecht, Belgio",
    "nav.formations": "Corsi",
    "nav.all_formations": "Vedi tutti i corsi", "nav.all_formations_desc": "Il nostro catalogo completo certificato",
    "dd.vca_base": "VCA base", "dd.vca_base_desc": "I fondamentali della sicurezza in cantiere",
    "dd.vca_hier": "VCA per responsabili", "dd.vca_hier_desc": "Per dirigenti e responsabili",
    "dd.nacelle": "Piattaforma elevatrice", "dd.nacelle_desc": "Guida in sicurezza delle PLE",
    "dd.nacelle_full": "Formazione piattaforme elevatrici", "dd.nacelle_dur": "1 giorno", "dd.nacelle_fmt": "Teoria + pratica",
    "dd.nacelle_langs": "Francese · Olandese · Inglese",
    "dd.nacelle_summary": "Sviluppa le competenze necessarie per utilizzare le piattaforme elevatrici in modo sicuro, efficace e responsabile in un ambiente professionale.",
    "dd.fibre": "Fibra ottica", "dd.fibre_desc": "Installazione e giunzione",
    "dd.beps": "BEPS — Primo soccorso", "dd.beps_desc": "I gesti che salvano la vita",
    "dd.beps_full": "Brevetto Europeo di Primo Soccorso", "dd.beps_dur": "15 ore", "dd.beps_fmt": "Prevalentemente pratico",
    "dd.beps_langs": "Francese · Olandese · Inglese",
    "dd.beps_summary": "Impara, in 15 ore, a proteggere, allertare il 112 e soccorrere una vittima in attesa dei professionisti: rianimazione, defibrillazione, posizione laterale di sicurezza, emorragie, soffocamento, malori e ustioni.",
    "dd.diiso": "Diisocianati & sostanze pericolose", "dd.diiso_desc": "Manipolazione conforme alle normative",
    "nav.vca_entreprise": "VCA aziende", "nav.peb": "PEB Vallonia & Bruxelles",
    "nav.coordination": "Coordinamento", "nav.certificat": "Certificato", "nav.agenda": "Calendario", "nav.avis": "Recensioni",
    "header.contact": "Contatti", "header.register": "Iscriviti",
    "aria.open_menu": "Apri il menu", "aria.close_menu": "Chiudi il menu", "aria.choose_lang": "Scegli la lingua",
    "footer.cta_eyebrow": "Si comincia quando vuoi",
    "footer.cta_title": "Pronto a <span class=\"hl\">proteggere i tuoi team</span>?",
    "footer.cta_text": "Prenota una sessione o richiedi un preventivo su misura — risposta rapida, senza impegno.",
    "footer.cta_btn": "Iscriviti a un corso",
    "footer.loc": "Anderlecht · Belgio", "footer.tagline": "Sicurezza & certificazioni VCA",
    "footer.pitch": "La sicurezza dei tuoi team parte dalla <span class=\"hl\">formazione giusta.</span>",
    "footer.col_services": "I nostri servizi", "footer.label_phone": "Telefono", "footer.label_email": "E-mail",
    "footer.label_address": "Indirizzo", "footer.col_hours": "Orari di apertura",
    "footer.mon": "Lunedì", "footer.tue": "Martedì", "footer.wed": "Mercoledì", "footer.thu": "Giovedì",
    "footer.fri": "Venerdì", "footer.sat": "Sabato", "footer.sun": "Domenica", "footer.closed": "Chiuso",
    "footer.status_open": "ATTUALMENTE APERTO", "footer.status_closed": "ATTUALMENTE CHIUSO",
    "footer.legal_mentions": "Note legali", "footer.legal_privacy": "Informativa sulla privacy",
    "footer.legal_terms": "Termini e condizioni", "footer.rights": "Tutti i diritti riservati."
  });

  /* ---------------- SLOVENŠČINA ---------------- */
  m("sl", {
    "util.badge": "Akreditirani center za usposabljanje · Anderlecht, Belgija",
    "nav.formations": "Usposabljanja",
    "nav.all_formations": "Oglejte si vsa usposabljanja", "nav.all_formations_desc": "Naš celoten certificiran katalog",
    "dd.vca_base": "VCA osnovni", "dd.vca_base_desc": "Osnove varnosti na gradbišču",
    "dd.vca_hier": "VCA za vodstvo", "dd.vca_hier_desc": "Za vodstvo in odgovorne osebe",
    "dd.nacelle": "Dvižna ploščad", "dd.nacelle_desc": "Varno upravljanje dvižnih ploščadi",
    "dd.nacelle_full": "Usposabljanje za dvižne ploščadi", "dd.nacelle_dur": "1 dan", "dd.nacelle_fmt": "Teorija + praksa",
    "dd.nacelle_langs": "Francoščina · Nizozemščina · Angleščina",
    "dd.nacelle_summary": "Razvijajte veščine, potrebne za varno, učinkovito in odgovorno uporabo dvižnih ploščadi v poklicnem okolju.",
    "dd.fibre": "Optična vlakna", "dd.fibre_desc": "Namestitev in priključitev",
    "dd.beps": "BEPS — Prva pomoč", "dd.beps_desc": "Ukrepi, ki rešujejo življenja",
    "dd.beps_full": "Evropsko spričevalo prve pomoči", "dd.beps_dur": "15 ur", "dd.beps_fmt": "Pretežno praktično",
    "dd.beps_langs": "Francoščina · Nizozemščina · Angleščina",
    "dd.beps_summary": "V 15 urah se naučite zaščititi, poklicati 112 in oskrbeti ponesrečenca do prihoda strokovnjakov: oživljanje, defibrilacijo, stabilni bočni položaj, krvavitve, zadušitev, slabosti in opekline.",
    "dd.diiso": "Diizocianati in nevarne snovi", "dd.diiso_desc": "Ravnanje v skladu s predpisi",
    "nav.vca_entreprise": "VCA za podjetja", "nav.peb": "PEB Valonija in Bruselj",
    "nav.coordination": "Koordinacija", "nav.certificat": "Certifikat", "nav.agenda": "Urnik", "nav.avis": "Mnenja",
    "header.contact": "Kontakt", "header.register": "Prijava",
    "aria.open_menu": "Odpri meni", "aria.close_menu": "Zapri meni", "aria.choose_lang": "Izberite jezik",
    "footer.cta_eyebrow": "Začnemo, kadar želite",
    "footer.cta_title": "Ste pripravljeni <span class=\"hl\">poskrbeti za varnost ekip</span>?",
    "footer.cta_text": "Rezervirajte termin ali zahtevajte prilagojeno ponudbo — hiter odgovor, brez obveznosti.",
    "footer.cta_btn": "Prijavite se na usposabljanje",
    "footer.loc": "Anderlecht · Belgija", "footer.tagline": "Varnost in certifikati VCA",
    "footer.pitch": "Varnost vaših ekip se začne s <span class=\"hl\">pravim usposabljanjem.</span>",
    "footer.col_services": "Naše storitve", "footer.label_phone": "Telefon", "footer.label_email": "E-pošta",
    "footer.label_address": "Naslov", "footer.col_hours": "Delovni čas",
    "footer.mon": "Ponedeljek", "footer.tue": "Torek", "footer.wed": "Sreda", "footer.thu": "Četrtek",
    "footer.fri": "Petek", "footer.sat": "Sobota", "footer.sun": "Nedelja", "footer.closed": "Zaprto",
    "footer.status_open": "TRENUTNO ODPRTO", "footer.status_closed": "TRENUTNO ZAPRTO",
    "footer.legal_mentions": "Pravno obvestilo", "footer.legal_privacy": "Politika zasebnosti",
    "footer.legal_terms": "Splošni pogoji", "footer.rights": "Vse pravice pridržane."
  });

  /* Centre d'aide (FAQ) — libellé du lien vers faq.html (pied de page + menu mobile). */
  m("fr", { "footer.faq": "Centre d'aide" });
  m("en", { "footer.faq": "Help centre" });
  m("nl", { "footer.faq": "Helpcentrum" });
  m("af", { "footer.faq": "Hulpsentrum" });
  m("ar", { "footer.faq": "مركز المساعدة" });
  m("bg", { "footer.faq": "Помощен център" });
  m("de", { "footer.faq": "Hilfe-Center" });
  m("ro", { "footer.faq": "Centru de ajutor" });
  m("it", { "footer.faq": "Centro assistenza" });
  m("sl", { "footer.faq": "Center za pomoč" });

  /* Libellés d'accessibilité communs (logo, navigation, menu mobile, liens légaux) et libellé « TVA » du pied de page.
     Le numéro de TVA lui-même (BE0XXX.XXX.XXX) n'est pas un texte : il reste tel quel dans le HTML. */
  m("fr", { "aria.home": "Wisy Safety — accueil", "aria.main_nav": "Navigation principale", "aria.mobile_menu": "Menu mobile", "aria.legal_nav": "Liens légaux", "footer.vat": "TVA" });
  m("en", { "aria.home": "Wisy Safety — home", "aria.main_nav": "Main navigation", "aria.mobile_menu": "Mobile menu", "aria.legal_nav": "Legal information", "footer.vat": "VAT" });
  m("nl", { "aria.home": "Wisy Safety — startpagina", "aria.main_nav": "Hoofdnavigatie", "aria.mobile_menu": "Mobiel menu", "aria.legal_nav": "Juridische informatie", "footer.vat": "BTW" });
  m("af", { "aria.home": "Wisy Safety — tuisblad", "aria.main_nav": "Hoofnavigasie", "aria.mobile_menu": "Mobiele kieslys", "aria.legal_nav": "Regsinligting", "footer.vat": "BTW" });
  m("ar", { "aria.home": "Wisy Safety — الصفحة الرئيسية", "aria.main_nav": "التنقل الرئيسي", "aria.mobile_menu": "قائمة الجوال", "aria.legal_nav": "المعلومات القانونية", "footer.vat": "ضريبة القيمة المضافة" });
  m("bg", { "aria.home": "Wisy Safety — начало", "aria.main_nav": "Основна навигация", "aria.mobile_menu": "Мобилно меню", "aria.legal_nav": "Правна информация", "footer.vat": "ДДС" });
  m("de", { "aria.home": "Wisy Safety — Startseite", "aria.main_nav": "Hauptnavigation", "aria.mobile_menu": "Mobiles Menü", "aria.legal_nav": "Rechtliche Informationen", "footer.vat": "MwSt." });
  m("ro", { "aria.home": "Wisy Safety — pagina principală", "aria.main_nav": "Navigare principală", "aria.mobile_menu": "Meniu mobil", "aria.legal_nav": "Informații juridice", "footer.vat": "TVA" });
  m("it", { "aria.home": "Wisy Safety — home", "aria.main_nav": "Navigazione principale", "aria.mobile_menu": "Menu mobile", "aria.legal_nav": "Informazioni legali", "footer.vat": "IVA" });
  m("sl", { "aria.home": "Wisy Safety — domača stran", "aria.main_nav": "Glavna navigacija", "aria.mobile_menu": "Mobilni meni", "aria.legal_nav": "Pravne informacije", "footer.vat": "DDV" });

  /* Champ piège anti-spam (invisible), commun aux formulaires de contact et d'avis. */
  m("fr", {
    "form.hp_label": "Ne remplissez pas ce champ"
  });
  m("en", {
    "form.hp_label": "Do not fill in this field"
  });
  m("nl", {
    "form.hp_label": "Vul dit veld niet in"
  });
  m("af", {
    "form.hp_label": "Moenie hierdie veld invul nie"
  });
  m("ar", {
    "form.hp_label": "لا تملأ هذا الحقل"
  });
  m("bg", {
    "form.hp_label": "Не попълвайте това поле"
  });
  m("de", {
    "form.hp_label": "Dieses Feld bitte nicht ausfüllen"
  });
  m("ro", {
    "form.hp_label": "Nu completați acest câmp"
  });
  m("it", {
    "form.hp_label": "Non compilare questo campo"
  });
  m("sl", {
    "form.hp_label": "Tega polja ne izpolnjujte"
  });

  /* ---------------- Consentement aux cookies (bandeau, centre de préférences, encart carte) ----------------
     Lus par js/cookie-consent.js et par l'encart « contenu soumis à autorisation » de index.html. */
  m("fr", {
    "cookies.banner_aria": "Consentement aux cookies",
    "cookies.banner_title": "Votre vie privée, votre choix",
    "cookies.banner_text": "Nous utilisons des cookies nécessaires au bon fonctionnement de Wisy Safety. Avec votre accord, nous pouvons également utiliser des cookies de mesure d’audience et d’autres technologies afin d’améliorer votre expérience.",
    "cookies.privacy_link": "En savoir plus sur notre politique de confidentialité",
    "cookies.reject": "Tout refuser",
    "cookies.customize": "Personnaliser",
    "cookies.accept": "Tout accepter",
    "cookies.modal_title": "Préférences de confidentialité",
    "cookies.close": "Fermer",
    "cookies.modal_intro": "Choisissez les catégories de cookies que vous souhaitez autoriser. Les cookies strictement nécessaires au fonctionnement du site restent toujours actifs.",
    "cookies.save": "Enregistrer mes choix",
    "cookies.always_on": "Toujours actif",
    "cookies.cat_necessary_title": "Cookies nécessaires",
    "cookies.cat_necessary_desc": "Indispensables au fonctionnement, à la sécurité et aux fonctionnalités essentielles du site.",
    "cookies.cat_analytics_title": "Mesure d'audience",
    "cookies.cat_analytics_desc": "Nous aide à comprendre comment le site est utilisé afin d'améliorer ses performances et son contenu.",
    "cookies.cat_functional_title": "Fonctionnalités",
    "cookies.cat_functional_desc": "Permet d'activer certaines fonctionnalités supplémentaires et de mémoriser vos préférences.",
    "cookies.cat_marketing_title": "Marketing",
    "cookies.cat_marketing_desc": "Permet de mesurer l'efficacité de nos campagnes et, le cas échéant, de personnaliser certaines communications.",
    "cookies.footer_link": "Préférences cookies",
    "cookies.gate_text": "Ce contenu nécessite votre autorisation.",
    "cookies.gate_btn": "Modifier mes préférences"
  });
  m("en", {
    "cookies.banner_aria": "Cookie consent",
    "cookies.banner_title": "Your privacy, your choice",
    "cookies.banner_text": "We use cookies that are necessary for Wisy Safety to work properly. With your consent, we may also use audience-measurement cookies and other technologies to improve your experience.",
    "cookies.privacy_link": "Learn more about our privacy policy",
    "cookies.reject": "Reject all",
    "cookies.customize": "Customise",
    "cookies.accept": "Accept all",
    "cookies.modal_title": "Privacy preferences",
    "cookies.close": "Close",
    "cookies.modal_intro": "Choose which categories of cookies you want to allow. Cookies that are strictly necessary for the site to work always remain active.",
    "cookies.save": "Save my choices",
    "cookies.always_on": "Always active",
    "cookies.cat_necessary_title": "Necessary cookies",
    "cookies.cat_necessary_desc": "Essential for the site’s operation, security and core features.",
    "cookies.cat_analytics_title": "Audience measurement",
    "cookies.cat_analytics_desc": "Helps us understand how the site is used so that we can improve its performance and content.",
    "cookies.cat_functional_title": "Features",
    "cookies.cat_functional_desc": "Lets us enable certain additional features and remember your preferences.",
    "cookies.cat_marketing_title": "Marketing",
    "cookies.cat_marketing_desc": "Lets us measure the effectiveness of our campaigns and, where applicable, personalise certain communications.",
    "cookies.footer_link": "Cookie preferences",
    "cookies.gate_text": "This content requires your permission.",
    "cookies.gate_btn": "Change my preferences"
  });
  m("nl", {
    "cookies.banner_aria": "Toestemming voor cookies",
    "cookies.banner_title": "Uw privacy, uw keuze",
    "cookies.banner_text": "Wij gebruiken cookies die nodig zijn voor de goede werking van Wisy Safety. Met uw toestemming kunnen wij ook analytische cookies en andere technologieën gebruiken om uw ervaring te verbeteren.",
    "cookies.privacy_link": "Meer informatie over ons privacybeleid",
    "cookies.reject": "Alles weigeren",
    "cookies.customize": "Aanpassen",
    "cookies.accept": "Alles accepteren",
    "cookies.modal_title": "Privacyvoorkeuren",
    "cookies.close": "Sluiten",
    "cookies.modal_intro": "Kies welke categorieën cookies u wilt toestaan. Cookies die strikt noodzakelijk zijn voor de werking van de site blijven altijd actief.",
    "cookies.save": "Mijn keuzes opslaan",
    "cookies.always_on": "Altijd actief",
    "cookies.cat_necessary_title": "Noodzakelijke cookies",
    "cookies.cat_necessary_desc": "Onmisbaar voor de werking, de beveiliging en de essentiële functies van de site.",
    "cookies.cat_analytics_title": "Bezoekersmeting",
    "cookies.cat_analytics_desc": "Helpt ons te begrijpen hoe de site wordt gebruikt, zodat we de prestaties en de inhoud ervan kunnen verbeteren.",
    "cookies.cat_functional_title": "Functionaliteiten",
    "cookies.cat_functional_desc": "Maakt het mogelijk bepaalde extra functies te activeren en uw voorkeuren te onthouden.",
    "cookies.cat_marketing_title": "Marketing",
    "cookies.cat_marketing_desc": "Maakt het mogelijk de doeltreffendheid van onze campagnes te meten en, in voorkomend geval, bepaalde communicatie te personaliseren.",
    "cookies.footer_link": "Cookievoorkeuren",
    "cookies.gate_text": "Voor deze inhoud is uw toestemming vereist.",
    "cookies.gate_btn": "Mijn voorkeuren wijzigen"
  });
  m("af", {
    "cookies.banner_aria": "Koekietoestemming",
    "cookies.banner_title": "U privaatheid, u keuse",
    "cookies.banner_text": "Ons gebruik koekies wat nodig is vir die behoorlike werking van Wisy Safety. Met u toestemming kan ons ook analitiese koekies en ander tegnologieë gebruik om u ervaring te verbeter.",
    "cookies.privacy_link": "Lees meer oor ons privaatheidsbeleid",
    "cookies.reject": "Weier alles",
    "cookies.customize": "Pasmaak",
    "cookies.accept": "Aanvaar alles",
    "cookies.modal_title": "Privaatheidsvoorkeure",
    "cookies.close": "Maak toe",
    "cookies.modal_intro": "Kies watter kategorieë koekies u wil toelaat. Koekies wat streng noodsaaklik is vir die werking van die webwerf bly altyd aktief.",
    "cookies.save": "Stoor my keuses",
    "cookies.always_on": "Altyd aktief",
    "cookies.cat_necessary_title": "Noodsaaklike koekies",
    "cookies.cat_necessary_desc": "Onontbeerlik vir die werking, die veiligheid en die noodsaaklike funksies van die webwerf.",
    "cookies.cat_analytics_title": "Besoekermeting",
    "cookies.cat_analytics_desc": "Help ons verstaan hoe die webwerf gebruik word, sodat ons die werkverrigting en inhoud daarvan kan verbeter.",
    "cookies.cat_functional_title": "Funksionaliteite",
    "cookies.cat_functional_desc": "Maak dit moontlik om sekere ekstra funksies te aktiveer en u voorkeure te onthou.",
    "cookies.cat_marketing_title": "Bemarking",
    "cookies.cat_marketing_desc": "Maak dit moontlik om die doeltreffendheid van ons veldtogte te meet en, waar van toepassing, sekere kommunikasie te verpersoonlik.",
    "cookies.footer_link": "Koekievoorkeure",
    "cookies.gate_text": "Hierdie inhoud vereis u toestemming.",
    "cookies.gate_btn": "Verander my voorkeure"
  });
  m("ar", {
    "cookies.banner_aria": "الموافقة على ملفات تعريف الارتباط",
    "cookies.banner_title": "خصوصيتك، اختيارك",
    "cookies.banner_text": "نستخدم ملفات تعريف الارتباط اللازمة لحسن عمل Wisy Safety. وبموافقتك، يمكننا أيضًا استخدام ملفات تعريف الارتباط التحليلية وتقنيات أخرى لتحسين تجربتك.",
    "cookies.privacy_link": "اعرف المزيد عن سياسة الخصوصية لدينا",
    "cookies.reject": "رفض الكل",
    "cookies.customize": "تخصيص",
    "cookies.accept": "قبول الكل",
    "cookies.modal_title": "تفضيلات الخصوصية",
    "cookies.close": "إغلاق",
    "cookies.modal_intro": "اختر فئات ملفات تعريف الارتباط التي تريد السماح بها. تبقى ملفات تعريف الارتباط الضرورية تمامًا لتشغيل الموقع نشطة دائمًا.",
    "cookies.save": "حفظ اختياراتي",
    "cookies.always_on": "نشطة دائمًا",
    "cookies.cat_necessary_title": "ملفات تعريف الارتباط الضرورية",
    "cookies.cat_necessary_desc": "لا غنى عنها لتشغيل الموقع وأمنه ووظائفه الأساسية.",
    "cookies.cat_analytics_title": "قياس الزيارات",
    "cookies.cat_analytics_desc": "تساعدنا على فهم كيفية استخدام الموقع لتحسين أدائه ومحتواه.",
    "cookies.cat_functional_title": "الوظائف",
    "cookies.cat_functional_desc": "تتيح تفعيل بعض الوظائف الإضافية وتذكّر تفضيلاتك.",
    "cookies.cat_marketing_title": "التسويق",
    "cookies.cat_marketing_desc": "تتيح قياس فعالية حملاتنا، وعند الاقتضاء، تخصيص بعض الرسائل.",
    "cookies.footer_link": "تفضيلات ملفات تعريف الارتباط",
    "cookies.gate_text": "يتطلب هذا المحتوى موافقتك.",
    "cookies.gate_btn": "تعديل تفضيلاتي"
  });
  m("bg", {
    "cookies.banner_aria": "Съгласие за бисквитки",
    "cookies.banner_title": "Вашата поверителност, вашият избор",
    "cookies.banner_text": "Използваме бисквитки, необходими за правилното функциониране на Wisy Safety. С вашето съгласие можем да използваме и бисквитки за измерване на аудиторията и други технологии, за да подобрим вашето изживяване.",
    "cookies.privacy_link": "Научете повече за нашата политика за поверителност",
    "cookies.reject": "Отказ на всички",
    "cookies.customize": "Персонализиране",
    "cookies.accept": "Приемане на всички",
    "cookies.modal_title": "Предпочитания за поверителност",
    "cookies.close": "Затваряне",
    "cookies.modal_intro": "Изберете категориите бисквитки, които искате да разрешите. Строго необходимите за работата на сайта бисквитки остават винаги активни.",
    "cookies.save": "Запазване на избора ми",
    "cookies.always_on": "Винаги активни",
    "cookies.cat_necessary_title": "Необходими бисквитки",
    "cookies.cat_necessary_desc": "Незаменими за работата, сигурността и основните функции на сайта.",
    "cookies.cat_analytics_title": "Измерване на аудиторията",
    "cookies.cat_analytics_desc": "Помага ни да разберем как се използва сайтът, за да подобрим неговата ефективност и съдържание.",
    "cookies.cat_functional_title": "Функционалности",
    "cookies.cat_functional_desc": "Позволява активирането на определени допълнителни функции и запомнянето на вашите предпочитания.",
    "cookies.cat_marketing_title": "Маркетинг",
    "cookies.cat_marketing_desc": "Позволява да измерваме ефективността на нашите кампании и при необходимост да персонализираме някои съобщения.",
    "cookies.footer_link": "Предпочитания за бисквитки",
    "cookies.gate_text": "Това съдържание изисква вашето разрешение.",
    "cookies.gate_btn": "Промяна на предпочитанията ми"
  });
  m("de", {
    "cookies.banner_aria": "Cookie-Einwilligung",
    "cookies.banner_title": "Ihre Privatsphäre, Ihre Entscheidung",
    "cookies.banner_text": "Wir verwenden Cookies, die für den einwandfreien Betrieb von Wisy Safety erforderlich sind. Mit Ihrer Einwilligung können wir außerdem Cookies zur Reichweitenmessung und andere Technologien einsetzen, um Ihr Erlebnis zu verbessern.",
    "cookies.privacy_link": "Mehr zu unserer Datenschutzerklärung",
    "cookies.reject": "Alle ablehnen",
    "cookies.customize": "Anpassen",
    "cookies.accept": "Alle akzeptieren",
    "cookies.modal_title": "Datenschutzeinstellungen",
    "cookies.close": "Schließen",
    "cookies.modal_intro": "Wählen Sie die Cookie-Kategorien aus, die Sie zulassen möchten. Für den Betrieb der Website unbedingt erforderliche Cookies bleiben immer aktiv.",
    "cookies.save": "Meine Auswahl speichern",
    "cookies.always_on": "Immer aktiv",
    "cookies.cat_necessary_title": "Notwendige Cookies",
    "cookies.cat_necessary_desc": "Unverzichtbar für den Betrieb, die Sicherheit und die wesentlichen Funktionen der Website.",
    "cookies.cat_analytics_title": "Reichweitenmessung",
    "cookies.cat_analytics_desc": "Hilft uns zu verstehen, wie die Website genutzt wird, damit wir Leistung und Inhalte verbessern können.",
    "cookies.cat_functional_title": "Funktionen",
    "cookies.cat_functional_desc": "Ermöglicht es, bestimmte zusätzliche Funktionen zu aktivieren und Ihre Einstellungen zu speichern.",
    "cookies.cat_marketing_title": "Marketing",
    "cookies.cat_marketing_desc": "Ermöglicht es, die Wirksamkeit unserer Kampagnen zu messen und gegebenenfalls bestimmte Mitteilungen zu personalisieren.",
    "cookies.footer_link": "Cookie-Einstellungen",
    "cookies.gate_text": "Für diesen Inhalt ist Ihre Zustimmung erforderlich.",
    "cookies.gate_btn": "Meine Einstellungen ändern"
  });
  m("ro", {
    "cookies.banner_aria": "Consimțământ pentru cookie-uri",
    "cookies.banner_title": "Confidențialitatea dvs., alegerea dvs.",
    "cookies.banner_text": "Folosim cookie-uri necesare pentru buna funcționare a Wisy Safety. Cu acordul dvs., putem folosi și cookie-uri de măsurare a audienței și alte tehnologii pentru a vă îmbunătăți experiența.",
    "cookies.privacy_link": "Aflați mai multe despre politica noastră de confidențialitate",
    "cookies.reject": "Refuzați tot",
    "cookies.customize": "Personalizați",
    "cookies.accept": "Acceptați tot",
    "cookies.modal_title": "Preferințe de confidențialitate",
    "cookies.close": "Închideți",
    "cookies.modal_intro": "Alegeți categoriile de cookie-uri pe care doriți să le permiteți. Cookie-urile strict necesare funcționării site-ului rămân întotdeauna active.",
    "cookies.save": "Salvați alegerile mele",
    "cookies.always_on": "Întotdeauna active",
    "cookies.cat_necessary_title": "Cookie-uri necesare",
    "cookies.cat_necessary_desc": "Indispensabile pentru funcționarea, securitatea și funcțiile esențiale ale site-ului.",
    "cookies.cat_analytics_title": "Măsurarea audienței",
    "cookies.cat_analytics_desc": "Ne ajută să înțelegem cum este utilizat site-ul pentru a-i îmbunătăți performanța și conținutul.",
    "cookies.cat_functional_title": "Funcționalități",
    "cookies.cat_functional_desc": "Permite activarea unor funcționalități suplimentare și memorarea preferințelor dvs.",
    "cookies.cat_marketing_title": "Marketing",
    "cookies.cat_marketing_desc": "Permite măsurarea eficienței campaniilor noastre și, după caz, personalizarea anumitor comunicări.",
    "cookies.footer_link": "Preferințe cookie-uri",
    "cookies.gate_text": "Acest conținut necesită acordul dvs.",
    "cookies.gate_btn": "Modificați preferințele mele"
  });
  m("it", {
    "cookies.banner_aria": "Consenso ai cookie",
    "cookies.banner_title": "La tua privacy, la tua scelta",
    "cookies.banner_text": "Utilizziamo i cookie necessari al corretto funzionamento di Wisy Safety. Con il tuo consenso, possiamo anche utilizzare cookie di misurazione dell’audience e altre tecnologie per migliorare la tua esperienza.",
    "cookies.privacy_link": "Scopri di più sulla nostra informativa sulla privacy",
    "cookies.reject": "Rifiuta tutti",
    "cookies.customize": "Personalizza",
    "cookies.accept": "Accetta tutti",
    "cookies.modal_title": "Preferenze sulla privacy",
    "cookies.close": "Chiudi",
    "cookies.modal_intro": "Scegli le categorie di cookie che vuoi autorizzare. I cookie strettamente necessari al funzionamento del sito restano sempre attivi.",
    "cookies.save": "Salva le mie scelte",
    "cookies.always_on": "Sempre attivi",
    "cookies.cat_necessary_title": "Cookie necessari",
    "cookies.cat_necessary_desc": "Indispensabili per il funzionamento, la sicurezza e le funzionalità essenziali del sito.",
    "cookies.cat_analytics_title": "Misurazione dell’audience",
    "cookies.cat_analytics_desc": "Ci aiuta a capire come viene utilizzato il sito per migliorarne le prestazioni e i contenuti.",
    "cookies.cat_functional_title": "Funzionalità",
    "cookies.cat_functional_desc": "Consente di attivare alcune funzionalità aggiuntive e di memorizzare le tue preferenze.",
    "cookies.cat_marketing_title": "Marketing",
    "cookies.cat_marketing_desc": "Consente di misurare l’efficacia delle nostre campagne e, se del caso, di personalizzare alcune comunicazioni.",
    "cookies.footer_link": "Preferenze cookie",
    "cookies.gate_text": "Questo contenuto richiede la tua autorizzazione.",
    "cookies.gate_btn": "Modifica le mie preferenze"
  });
  m("sl", {
    "cookies.banner_aria": "Soglasje za piškotke",
    "cookies.banner_title": "Vaša zasebnost, vaša izbira",
    "cookies.banner_text": "Uporabljamo piškotke, ki so potrebni za pravilno delovanje spletnega mesta Wisy Safety. Z vašim soglasjem lahko uporabljamo tudi piškotke za merjenje obiskanosti in druge tehnologije, da izboljšamo vašo izkušnjo.",
    "cookies.privacy_link": "Več o naši politiki zasebnosti",
    "cookies.reject": "Zavrni vse",
    "cookies.customize": "Prilagodi",
    "cookies.accept": "Sprejmi vse",
    "cookies.modal_title": "Nastavitve zasebnosti",
    "cookies.close": "Zapri",
    "cookies.modal_intro": "Izberite kategorije piškotkov, ki jih želite dovoliti. Piškotki, ki so nujno potrebni za delovanje spletnega mesta, so vedno aktivni.",
    "cookies.save": "Shrani mojo izbiro",
    "cookies.always_on": "Vedno aktivno",
    "cookies.cat_necessary_title": "Nujni piškotki",
    "cookies.cat_necessary_desc": "Nepogrešljivi za delovanje, varnost in osnovne funkcije spletnega mesta.",
    "cookies.cat_analytics_title": "Merjenje obiskanosti",
    "cookies.cat_analytics_desc": "Pomagajo nam razumeti, kako se spletno mesto uporablja, da lahko izboljšamo njegovo delovanje in vsebino.",
    "cookies.cat_functional_title": "Funkcionalnosti",
    "cookies.cat_functional_desc": "Omogočajo vklop nekaterih dodatnih funkcij in shranjevanje vaših nastavitev.",
    "cookies.cat_marketing_title": "Trženje",
    "cookies.cat_marketing_desc": "Omogočajo merjenje učinkovitosti naših kampanj in po potrebi prilagajanje nekaterih sporočil.",
    "cookies.footer_link": "Nastavitve piškotkov",
    "cookies.gate_text": "Ta vsebina zahteva vaše dovoljenje.",
    "cookies.gate_btn": "Spremeni moje nastavitve"
  });
})();
