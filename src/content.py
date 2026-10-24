# Site content. Everything Dan-specific lives here; build.py only renders it.
# Items marked PLACEHOLDER need Dan's real photos / texts before launch.

SITE = {
    "name": "Dan Căpitan de Plai",
    "tagline": {"ro": "Fotograf de nuntă · Brașov", "en": "Wedding photographer · Brașov"},
    "url": "https://dancapitandeplai.pages.dev",
    "phone": "+40 743 199 121",
    "phone_raw": "40743199121",
    "email": "lupudaniel.foto@gmail.com",
    "facebook": "https://www.facebook.com/Lupu.D.Foto/",
    "messenger": "https://m.me/Lupu.D.Foto",
    "instagram": "https://www.instagram.com/dancapitandeplai.ro/",
    "instagram_handle": "@dancapitandeplai.ro",
    "city": "Brașov",
}

# Routes per language. RO lives at /, EN at /en/.
ROUTES = {
    "ro": {"home": "/", "portfolio": "/portofoliu/", "blog": "/blog/", "faq": "/intrebari-frecvente/", "contact": "/contact/"},
    "en": {"home": "/en/", "portfolio": "/en/portfolio/", "blog": "/en/blog/", "faq": "/en/faq/", "contact": "/en/contact/"},
}

NAV = {
    "ro": [("home", "Acasă"), ("portfolio", "Portofoliu"), ("blog", "Blog"), ("faq", "Întrebări"), ("contact", "Contact")],
    "en": [("home", "Home"), ("portfolio", "Portfolio"), ("blog", "Blog"), ("faq", "FAQ"), ("contact", "Contact")],
}

UI = {
    "ro": {
        "book": "Programează o discuție",
        "wa_msg": "Bună, Dan! Am văzut site-ul și aș vrea să vorbim despre o ședință foto.",
        "scroll": "Derulează",
        "more_about": "Mai multe despre mine",
        "view_work": "Vezi portofoliul",
        "all": "Toate",
        "photos": "fotografii",
        "back_portfolio": "Înapoi la portofoliu",
        "read_more": "Citește",
        "back_blog": "Înapoi la blog",
        "next_event": "Următorul eveniment",
        "follow": "Urmărește pe Instagram",
        "rights": "Toate drepturile rezervate.",
        "top": "Sus",
        "menu": "Meniu",
        "close": "Închide",
        "prev": "Anterioara",
        "next": "Următoarea",
        "switch": "EN",
        "switch_label": "English version",
        "theme": "Schimbă tema (luminoasă / întunecată)",
    },
    "en": {
        "book": "Book a chat",
        "wa_msg": "Hi Dan! I saw your website and I'd like to talk about a photo session.",
        "scroll": "Scroll",
        "more_about": "More about me",
        "view_work": "View portfolio",
        "all": "All",
        "photos": "photos",
        "back_portfolio": "Back to portfolio",
        "read_more": "Read",
        "back_blog": "Back to blog",
        "next_event": "Next event",
        "follow": "Follow on Instagram",
        "rights": "All rights reserved.",
        "top": "Top",
        "menu": "Menu",
        "close": "Close",
        "prev": "Previous",
        "next": "Next",
        "switch": "RO",
        "switch_label": "Versiunea în română",
        "theme": "Switch theme (light / dark)",
    },
}

# Hero: 20-30 rotating shots. PLACEHOLDER images hero-1..24.
HERO_SLIDES = [f"hero-{i}.jpg" for i in range(1, 25)]
HERO_LINES = {
    "ro": [
        ("Momente reale, nu poze regizate", "Fotografie documentară de nuntă · Brașov"),
        ("Fotografia nu e o listă de bifat", "Las momentele să se întâmple"),
        ("Să simțiți ziua din nou peste ani", "Nunți · Botezuri · Familie"),
    ],
    "en": [
        ("Real moments, not staged photos", "Documentary wedding photography · Brașov"),
        ("Photography isn't a checklist", "I let the moments unfold"),
        ("Feel the day again, years later", "Weddings · Christenings · Family"),
    ],
}

HOME = {
    "ro": {
        "title": "Dan Căpitan de Plai · Fotograf de nuntă în Brașov",
        "desc": "Fotografie documentară de nuntă, botez și familie în Brașov și oriunde vreți voi. Momente reale, lumină naturală, fără poze regizate.",
        "intro_eyebrow": "Fotografie documentară",
        "intro_title": "Lasă obiectivul meu să vă spună povestea",
        "intro_p": [
            "Fotografiez nunți, botezuri și familii așa cum sunt ele: cu emoție, cu râsete și cu momentele mici pe care nimeni nu le regizează. Lumina naturală și oamenii adevărați fac toată treaba, eu doar sunt acolo la momentul potrivit.",
            "De la ceremonii desculț prin iarbă până la nunți elegante în oraș, intervin cât mai puțin și vă las să vă bucurați de zi. Dacă sunteți timizi în fața aparatului, e perfect: nu trebuie să pozați.",
        ],
        "tiles_eyebrow": "Descoperă",
        "tiles_title": "Unde vrei să mergi?",
        "quote": "Fotografia nu e o listă de bifat. Vreau ca peste ani să deschideți albumul și să simțiți ziua din nou.",
        "quote_by": "Dan Căpitan de Plai",
        "services_eyebrow": "Ce fotografiez",
        "services_title": "Pentru fiecare moment important",
        "profile_eyebrow": "Capturez magia vieții",
        "profile_title": "Salut, sunt Dan",
        "profile_p": [
            "Sunt fotograf în Brașov și de aproape 8 ani fotografiez nunți, botezuri și familii. Lucrez discret, cu lumină naturală, și caut momentele sincere dintre oameni.",
            "Merg oriunde mă cheamă povestea voastră: Conacul Albert, Naturalia Inn, Centrul Vechi sau o pajiște fără nume.",
        ],
        "testimonials_title": "Ce spun cuplurile",
        "cta_title": "Hai să vă păstrăm amintirile",
        "cta_p": "Spuneți-mi data și locul, iar eu vă răspund cu o ofertă pe măsura voastră.",
        "ig_title": "Pe Instagram",
    },
    "en": {
        "title": "Dan Căpitan de Plai · Wedding photographer in Brașov",
        "desc": "Documentary wedding, christening and family photography in Brașov and wherever you want. Real moments, natural light, no staged poses.",
        "intro_eyebrow": "Documentary photography",
        "intro_title": "Let my lens tell your story",
        "intro_p": [
            "I photograph weddings, christenings and families as they really are: the emotion, the laughter and the small moments nobody stages. Natural light and real people do the work, I just make sure I'm there at the right moment.",
            "From barefoot ceremonies in the grass to elegant city weddings, I step in as little as possible and let you enjoy the day. Shy in front of a camera? Perfect, you don't need to pose.",
        ],
        "tiles_eyebrow": "Explore",
        "tiles_title": "Where to next?",
        "quote": "Photography isn't a checklist. I want you to open the album years from now and feel the day all over again.",
        "quote_by": "Dan Căpitan de Plai",
        "services_eyebrow": "What I photograph",
        "services_title": "For every moment that matters",
        "profile_eyebrow": "Capturing life's magic",
        "profile_title": "Hi, I'm Dan",
        "profile_p": [
            "I'm a photographer based in Brașov and I've been photographing weddings, christenings and families for almost 8 years. I work quietly, with natural light, looking for honest moments between people.",
            "I go wherever your story takes me: Conacul Albert, Naturalia Inn, the Old Town or a nameless meadow.",
        ],
        "testimonials_title": "What couples say",
        "cta_title": "Let's keep your memories",
        "cta_p": "Tell me your date and place, and I'll come back with a quote that fits you.",
        "ig_title": "On Instagram",
    },
}

# Section 3 buttons (Ionut: Home, Portofoliu, Blog, FAQ, Contact)
TILES = [("home", "nav-1.jpg"), ("portfolio", "nav-2.jpg"), ("blog", "nav-3.jpg"), ("faq", "nav-4.jpg"), ("contact", "nav-5.jpg")]
TILE_SUB = {
    "ro": {"home": "Începe de aici", "portfolio": "Fiecare eveniment, povestea lui", "blog": "Sfaturi și povești", "faq": "Prețuri, deplasare, livrare", "contact": "Hai să vorbim"},
    "en": {"home": "Start here", "portfolio": "Every event, its own story", "blog": "Tips and stories", "faq": "Pricing, travel, delivery", "contact": "Let's talk"},
}

SERVICES = {
    "ro": [
        ("Nunți", "Toată ziua, de la pregătiri până la petrecere, spusă ca o poveste."),
        ("Cununie civilă", "Momentul oficial, simplu și emoționant."),
        ("Botezuri", "Familia, nașii și cel mic, fără agitație."),
        ("Familie", "Ședințe relaxate, acasă sau în natură."),
        ("After-wedding & Trash The Dress", "O zi doar pentru voi doi, în locuri frumoase."),
        ("Nou-născuți", "Primele zile, cu blândețe și răbdare."),
    ],
    "en": [
        ("Weddings", "The whole day, from getting ready to the party, told as a story."),
        ("Civil ceremonies", "The official moment, simple and moving."),
        ("Christenings", "Family, godparents and the little one, without the fuss."),
        ("Family", "Relaxed sessions at home or outdoors."),
        ("After-wedding & Trash The Dress", "A day just for the two of you, somewhere beautiful."),
        ("Newborns", "The first days, gently and patiently."),
    ],
}

STATS = {
    "ro": [("~8", "ani de fotografie"), ("6", "premii de portofoliu"), ("100%", "lumină naturală"), ("∞", "deplasări oriunde")],
    "en": [("~8", "years behind the camera"), ("6", "portfolio awards"), ("100%", "natural light"), ("∞", "happy to travel")],
}

# PLACEHOLDER testimonials: replace with real reviews (FB / fotografi-cameramani.ro)
TESTIMONIALS = {
    "ro": [
        ("client-1.jpg", "Dan a prins momente pe care nici nu știam că s-au întâmplat. Am uitat complet că e acolo, și asta se vede în poze.", "Exemplu · Andreea & Mihai"),
        ("client-2.jpg", "Super răbdător și relaxat, chiar și cu noi, care suntem cei mai timizi oameni din lume. Pozele sunt superbe.", "Exemplu · Ioana & Radu"),
    ],
    "en": [
        ("client-1.jpg", "Dan caught moments we didn't even know happened. We completely forgot he was there, and it shows in the photos.", "Sample · Andreea & Mihai"),
        ("client-2.jpg", "So patient and relaxed, even with us, the shyest people alive. The photos are gorgeous.", "Sample · Ioana & Radu"),
    ],
}

# Categories used to filter the portfolio
CATEGORIES = {
    "ro": {"nunta": "Nunți", "cununie": "Cununie civilă", "botez": "Botezuri", "familie": "Familie", "after": "After-wedding"},
    "en": {"nunta": "Weddings", "cununie": "Civil ceremonies", "botez": "Christenings", "familie": "Family", "after": "After-wedding"},
}

# Each event gets its own page. PLACEHOLDER events + photos until Dan sends real ones.
_p = [f"p-{i:02d}.jpg" for i in range(1, 13)]
EVENTS = [
    {
        "slug": "nunta-conacul-albert",
        "cat": "nunta",
        "cover": "p-01.jpg",
        "photos": _p[0:10],
        "venue": "Conacul Albert",
        "title": {"ro": "Nuntă la Conacul Albert", "en": "Wedding at Conacul Albert"},
        "date": {"ro": "Septembrie 2026", "en": "September 2026"},
        "intro": {
            "ro": "O zi caldă de toamnă, o curte plină de prieteni și multe lacrimi de bucurie.",
            "en": "A warm autumn day, a courtyard full of friends and plenty of happy tears.",
        },
    },
    {
        "slug": "nunta-naturalia-inn",
        "cat": "nunta",
        "cover": "p-05.jpg",
        "photos": _p[4:12],
        "venue": "Naturalia Inn",
        "title": {"ro": "Nuntă la Naturalia Inn", "en": "Wedding at Naturalia Inn"},
        "date": {"ro": "August 2026", "en": "August 2026"},
        "intro": {
            "ro": "Ceremonie în aer liber, desculți prin iarbă, cu munții în spate.",
            "en": "An outdoor ceremony, barefoot in the grass, with the mountains behind.",
        },
    },
    {
        "slug": "cununie-centrul-vechi-brasov",
        "cat": "cununie",
        "cover": "p-03.jpg",
        "photos": _p[2:9],
        "venue": "Centrul Vechi, Brașov",
        "title": {"ro": "Cununie civilă în Centrul Vechi", "en": "Civil ceremony in Brașov Old Town"},
        "date": {"ro": "Iulie 2026", "en": "July 2026"},
        "intro": {
            "ro": "Plimbare pe străduțele vechi ale Brașovului, după cel mai important „Da”.",
            "en": "A walk through Brașov's old streets after the most important \"I do\".",
        },
    },
    {
        "slug": "botez-restaurant-adaggio",
        "cat": "botez",
        "cover": "p-08.jpg",
        "photos": _p[6:12] + _p[0:2],
        "venue": "Restaurant Adaggio",
        "title": {"ro": "Botez la Restaurant Adaggio", "en": "Christening at Restaurant Adaggio"},
        "date": {"ro": "Iunie 2026", "en": "June 2026"},
        "intro": {
            "ro": "Nașii emoționați, bunicii mândri și un mic protagonist foarte curios.",
            "en": "Emotional godparents, proud grandparents and a very curious little star.",
        },
    },
    {
        "slug": "familie-in-natura",
        "cat": "familie",
        "cover": "p-10.jpg",
        "photos": _p[8:12] + _p[1:5],
        "venue": "Poiana Brașov",
        "title": {"ro": "Ședință de familie în natură", "en": "Family session outdoors"},
        "date": {"ro": "Mai 2026", "en": "May 2026"},
        "intro": {
            "ro": "O după-amiază fără grabă, cu jocuri, îmbrățișări și lumină caldă.",
            "en": "An unhurried afternoon of games, hugs and warm light.",
        },
    },
    {
        "slug": "trash-the-dress",
        "cat": "after",
        "cover": "p-06.jpg",
        "photos": _p[3:11],
        "venue": "Munții Bucegi",
        "title": {"ro": "Trash The Dress în munți", "en": "Trash The Dress in the mountains"},
        "date": {"ro": "Octombrie 2026", "en": "October 2026"},
        "intro": {
            "ro": "Rochia de mireasă, un râu de munte și doi oameni care nu le pasă de noroi.",
            "en": "A wedding dress, a mountain river and two people who don't mind the mud.",
        },
    },
]

# Blog posts. Drafts written from Dan's approach; Dan to review.
POSTS = [
    {
        "slug": "ce-inseamna-fotografie-documentara-de-nunta",
        "cover": "blog-1.jpg",
        "date": "2026-10-20",
        "title": {"ro": "Ce înseamnă fotografie documentară de nuntă", "en": "What documentary wedding photography means"},
        "excerpt": {
            "ro": "Fără poze regizate, fără liste de bifat. Doar ziua voastră, așa cum a fost.",
            "en": "No staged poses, no checklists. Just your day, the way it really was.",
        },
        "body": {
            "ro": [
                "Fotografia documentară de nuntă înseamnă să surprind ziua așa cum se întâmplă, nu cum ar trebui să arate. Nu vă cer să repetați intrarea și nu vă aranjez în poziții nefirești.",
                "Stau aproape, dar discret. Urmăresc privirile, gesturile mici, râsul neașteptat al bunicii. Momentele astea nu pot fi regizate, și tocmai ele contează peste ani.",
                "Asta nu înseamnă că nu facem deloc portrete. Facem, dar relaxat, în lumină frumoasă, fără să pierdeți jumătate de zi.",
            ],
            "en": [
                "Documentary wedding photography means capturing the day as it happens, not as it should look. I won't ask you to redo your entrance or put you in awkward poses.",
                "I stay close but quiet. I watch for glances, small gestures, grandma's unexpected laugh. Those moments can't be staged, and they're exactly what matters years later.",
                "That doesn't mean no portraits at all. We do them, but relaxed, in good light, without losing half your day.",
            ],
        },
    },
    {
        "slug": "cum-alegi-fotograful-de-nunta",
        "cover": "blog-2.jpg",
        "date": "2026-10-10",
        "title": {"ro": "Cum alegi fotograful de nuntă: 5 întrebări utile", "en": "Choosing your wedding photographer: 5 useful questions"},
        "excerpt": {
            "ro": "Ce să întrebi înainte să semnezi, ca să nu ai surprize după nuntă.",
            "en": "What to ask before you sign, so there are no surprises after the wedding.",
        },
        "body": {
            "ro": [
                "1. Vă place stilul lui? Uitați-vă la nunți întregi, nu doar la cele mai bune 10 poze.",
                "2. Cum lucrează în ziua nunții? Regizează mult sau vă lasă să trăiți momentul?",
                "3. Ce include oferta? Album, al doilea fotograf, deplasare: întrebați clar ce e inclus și ce se plătește separat.",
                "4. Când primiți fotografiile și în ce format?",
                "5. Vă simțiți bine în preajma lui? Va fi lângă voi toată ziua, așa că asta contează enorm.",
            ],
            "en": [
                "1. Do you love their style? Look at full weddings, not just the best 10 shots.",
                "2. How do they work on the day? Lots of posing, or do they let you live the moment?",
                "3. What does the quote include? Album, second shooter, travel: ask clearly what's included and what's extra.",
                "4. When do you get the photos, and in what format?",
                "5. Do you feel comfortable around them? They'll be next to you all day, so this matters a lot.",
            ],
        },
    },
]

# FAQ. Answers marked (de confirmat) still need Dan's input.
FAQ = {
    "ro": [
        ("Cât costă fotografia de nuntă?", "Nu am pachete fixe. O nuntă completă pornește în jur de 1.000 EUR, iar oferta finală depinde de durată, locație și ce vă doriți. Scrieți-mi data și locul și vă trimit o ofertă personalizată."),
        ("Ce nu e inclus în preț?", "Albumul tipărit, ședințele suplimentare (after-wedding, Trash The Dress) și al doilea fotograf se adaugă separat."),
        ("Vă deplasați și în afara Brașovului?", "Da, merg oriunde vreți voi. Pentru evenimentele din afara Brașovului se adaugă transportul și cazarea."),
        ("Suntem timizi în fața aparatului. E o problemă?", "Deloc. Stilul meu e documentar: nu trebuie să pozați. Majoritatea cuplurilor uită de mine după primele minute."),
        ("Când primim fotografiile?", "(De confirmat cu Dan) Termenul de livrare și numărul aproximativ de fotografii."),
        ("Cum rezervăm data?", "Scrieți-mi pe WhatsApp sau pe email cu data și locul. Stabilim o discuție, apoi confirmăm data."),
    ],
    "en": [
        ("How much does wedding photography cost?", "I don't do fixed packages. A full wedding starts at around 1,000 EUR, and the final quote depends on hours, location and what you'd like. Send me your date and place and I'll send a tailored quote."),
        ("What isn't included?", "Printed albums, extra sessions (after-wedding, Trash The Dress) and a second photographer are added separately."),
        ("Do you travel outside Brașov?", "Yes, I'll go wherever you want. For events outside Brașov, travel and accommodation are added."),
        ("We're shy in front of the camera. Is that a problem?", "Not at all. My style is documentary: you don't need to pose. Most couples forget I'm there after the first few minutes."),
        ("When do we get the photos?", "(To confirm with Dan) Delivery time and approximate number of photos."),
        ("How do we book a date?", "Message me on WhatsApp or email with your date and place. We'll have a quick chat, then confirm the date."),
    ],
}

PAGES = {
    "ro": {
        "portfolio": ("Portofoliu", "Fiecare eveniment are povestea lui. Alege unul și intră în ziua respectivă."),
        "blog": ("Blog", "Sfaturi pentru miri, povești din spatele aparatului și idei pentru ședințe foto."),
        "faq": ("Întrebări frecvente", "Răspunsuri scurte la ce mă întreabă cel mai des cuplurile."),
        "contact": ("Contact", "Spune-mi data, locul și câteva cuvinte despre voi. Răspund de obicei în aceeași zi."),
        "contact_side_title": "Bine de știut",
        "contact_side": [
            "Oferta e personalizată, fără pachete fixe (în jur de 1.000 EUR pentru o nuntă).",
            "Deplasez oriunde; în afara Brașovului se adaugă transport și cazare.",
            "Album, ședințe extra și al doilea fotograf se adaugă separat.",
        ],
        "wa_label": "WhatsApp (preferat)",
        "phone_label": "Telefon",
        "email_label": "Email",
        "fb_label": "Facebook / Messenger",
        "ig_label": "Instagram",
        "area_label": "Zonă",
        "area": "Brașov și oriunde vreți voi",
    },
    "en": {
        "portfolio": ("Portfolio", "Every event has its own story. Pick one and step into that day."),
        "blog": ("Blog", "Tips for couples, stories from behind the camera and photo session ideas."),
        "faq": ("Frequently asked questions", "Short answers to what couples ask me most."),
        "contact": ("Contact", "Tell me your date, place and a few words about you. I usually reply the same day."),
        "contact_side_title": "Good to know",
        "contact_side": [
            "Tailored quotes, no fixed packages (around 1,000 EUR for a wedding).",
            "Happy to travel; outside Brașov, travel and accommodation are added.",
            "Albums, extra sessions and a second photographer are extra.",
        ],
        "wa_label": "WhatsApp (preferred)",
        "phone_label": "Phone",
        "email_label": "Email",
        "fb_label": "Facebook / Messenger",
        "ig_label": "Instagram",
        "area_label": "Area",
        "area": "Brașov and wherever you want",
    },
}
