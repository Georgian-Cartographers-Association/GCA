/* Language switching */

function setLang(lang) {
    document.body.className = lang === 'en' ? 'en' : '';
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.langTarget === lang);
    });
    localStorage.setItem('gca-lang', lang);
}

const savedLang = localStorage.getItem('gca-lang');
if (savedLang) setLang(savedLang);

document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.langTarget));
});

/* Nav scroll & back-to-top visibility */

window.addEventListener('scroll', () => {
    document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 100);
    document.getElementById('backToTop').classList.toggle('visible', window.scrollY > 500);
});

document.getElementById('backToTop').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* Mobile menu toggle */

document.getElementById('navToggle').addEventListener('click', () => {
    document.getElementById('navMenu').classList.toggle('active');
});

/* Schedule day tabs */

function showDay(day) {
    document.querySelectorAll('.schedule-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.schedule-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('day' + day).classList.add('active');
    document.querySelectorAll(`.schedule-tab[data-day="${day}"]`).forEach(t => t.classList.add('active'));
}

document.querySelectorAll('.schedule-tab[data-day]').forEach(tab => {
    tab.addEventListener('click', () => showDay(parseInt(tab.dataset.day, 10)));
});

/* FAQ accordion */

document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const item = question.parentElement;
        const wasActive = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
        if (!wasActive) item.classList.add('active');
    });
});

/* Smooth scroll for anchor links */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.getElementById('navMenu').classList.remove('active');
        }
    });
});

/* Leaflet map */

document.addEventListener('DOMContentLoaded', () => {
    const tsuLat = 41.7099824;
    const tsuLng = 44.7779992;
    const map = L.map('map').setView([tsuLat, tsuLng], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    L.marker([tsuLat, tsuLng])
        .addTo(map)
        .bindPopup('<b>ივ. ჯავახიშვილის სახ. თბილისის სახელმწიფო უნივერსიტეტი</b><br>ი. ჭავჭავაძის გამზ. 3')
        .openPopup();
});

/* ===== Biography Modal ===== */

function openBioModal() {
    const modal = document.getElementById('bioModal');
    modal.style.display = 'flex';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    // sync modal lang with site lang
    const siteLang = document.body.classList.contains('en') ? 'en' : 'ka';
    setBioLang(siteLang);
}

function closeBioModal() {
    const modal = document.getElementById('bioModal');
    modal.style.display = 'none';
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function setBioLang(lang) {
    const isEn = lang === 'en';
    document.querySelectorAll('#bioModal .bio-ka').forEach(el => el.classList.toggle('bio-hidden', isEn));
    document.querySelectorAll('#bioModal .bio-en').forEach(el => el.classList.toggle('bio-hidden', !isEn));
    document.getElementById('bioLangKa').classList.toggle('active', !isEn);
    document.getElementById('bioLangEn').classList.toggle('active',  isEn);
}

// Close on ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeBioModal();
});

// Gallery slider
(function () {
    const root = document.getElementById('gallerySlider');
    if (!root) return;
    const track = root.querySelector('.gallery-track');
    const slides = root.querySelectorAll('.gallery-slide');
    const dots = root.querySelector('.gallery-dots');
    let index = 0;

    slides.forEach((_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', (i + 1) + ' / ' + slides.length);
        b.addEventListener('click', () => goTo(i));
        dots.appendChild(b);
    });

    function mark() {
        dots.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', i === index));
    }

    function goTo(i) {
        const n = (i + slides.length) % slides.length;
        track.scrollTo({ left: n * track.clientWidth, behavior: 'smooth' });
    }

    track.addEventListener('scroll', () => {
        index = Math.round(track.scrollLeft / track.clientWidth);
        mark();
    }, { passive: true });

    root.querySelector('.gallery-prev').addEventListener('click', () => goTo(index - 1));
    root.querySelector('.gallery-next').addEventListener('click', () => goTo(index + 1));
    root.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') goTo(index - 1);
        if (e.key === 'ArrowRight') goTo(index + 1);
    });
    mark();
})();
