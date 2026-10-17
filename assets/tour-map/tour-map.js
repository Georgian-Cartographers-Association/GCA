/* ===== Bolnisi tour map (embeddable, bilingual KA/EN) =====
   Needs Leaflet 1.9 and bolnisi-data.js loaded first.
   Any element with [data-tour-map] is turned into a map on DOMContentLoaded:
       <div class="tour-image" data-tour-map></div>
   Optional attributes: data-lang="ka|en", data-icons="path/to/icons/".
   Language follows the GCA site (body.en class) and stays in sync with it. */

(function () {
    'use strict';

    const T = {
        ka: {
            title: 'ექსკურსია ბოლნისში',
            sub: '31 ოქტომბერი · თბილისი → ბოლნისი',
            full: 'სრული ეკრანი', exit: 'დახურვა',
            legend: 'ლეგენდა',
            secTour: 'ექსკურსია', secSites: 'ისტორიული ძეგლები', secBase: 'ფონური რუკა', secOther: 'სხვა',
            stops: 'გაჩერებები', route: 'მარშრუტი (მიახლოებითი)',
            churches: 'ეკლესიები და მონასტრები', castles: 'ციხეები და კოშკები',
            settl: 'დასახლებები', bnd: 'მუნიციპალიტეტის საზღვარი',
            map: 'რუკა', terrain: 'რელიეფი', sat: 'თანამგზავრი',
            stop: 'გაჩერება', start: 'გამგზავრება',
            routeInfo: (km, min) => `<b>≈ ${km} კმ</b> · დაახლ. <b>${Math.floor(min / 60)} სთ ${min % 60} წთ</b> ავტობუსით (გაჩერებების გარეშე)`,
            hours: 'ღიაა', town: 'ქალაქი', borough: 'დაბა', village: 'სოფელი',
            hintWheel: 'რუკის გასადიდებლად დააჭირეთ Ctrl + ბორბალი',
            hintTouch: 'გამოიყენეთ ორი თითი ან სრული ეკრანი',
            lang: 'EN', langLabel: 'Switch to English',
            aria: 'ბოლნისის ექსკურსიის ინტერაქტიული რუკა'
        },
        en: {
            title: 'Excursion to Bolnisi',
            sub: '31 October · Tbilisi → Bolnisi',
            full: 'Full screen', exit: 'Close',
            legend: 'Legend',
            secTour: 'Excursion', secSites: 'Heritage sites', secBase: 'Base map', secOther: 'Other',
            stops: 'Stops', route: 'Route (approximate)',
            churches: 'Churches & monasteries', castles: 'Fortresses & towers',
            settl: 'Settlements', bnd: 'Municipality boundary',
            map: 'Map', terrain: 'Terrain', sat: 'Satellite',
            stop: 'Stop', start: 'Departure',
            routeInfo: (km, min) => `<b>≈ ${km} km</b> · about <b>${Math.floor(min / 60)} h ${min % 60} min</b> by coach (driving only)`,
            hours: 'Open', town: 'Town', borough: 'Borough', village: 'Village',
            hintWheel: 'Use Ctrl + scroll to zoom the map',
            hintTouch: 'Use two fingers or full screen',
            lang: 'ქარ', langLabel: 'ქართულზე გადართვა',
            aria: 'Interactive map of the Bolnisi excursion'
        }
    };

    const ICON = {
        fs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
        exit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
        home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>'
    };

    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function scriptBase() {
        const s = document.currentScript || [...document.scripts].find(x => /tour-map\.js/.test(x.src));
        return s ? s.src.replace(/[^/]*$/, '') : '';
    }
    const BASE = scriptBase();

    function siteLang() {
        return document.body.classList.contains('en') ? 'en' : 'ka';
    }

    function mount(el) {
        if (el._btm) return el._btm;
        const D = window.BOLNISI_TOUR_DATA;
        if (!window.L || !D) { console.error('tour-map: Leaflet or BOLNISI_TOUR_DATA missing'); return; }

        const iconBase = el.dataset.icons || BASE + 'icons/';
        const followSite = !el.dataset.lang;
        let lang = el.dataset.lang || siteLang();
        const t = () => T[lang];
        const L = window.L;
        const relabelers = [];

        el.classList.add('btm');
        el.textContent = '';
        el.setAttribute('role', 'region');

        el.innerHTML = `
            <div class="btm-map"></div>
            <div class="btm-bar">
                <div class="btm-title"><strong></strong><span></span></div>
                <button type="button" class="btm-btn btm-lang-btn"></button>
                <button type="button" class="btm-btn btm-home-btn">${ICON.home}</button>
                <button type="button" class="btm-btn btm-fs-btn"><span class="btm-fs-ico">${ICON.fs}</span><span class="btm-fs-label"></span></button>
            </div>
            <div class="btm-legend collapsed">
                <button type="button" class="btm-legend-toggle" aria-expanded="false"></button>
                <div class="btm-legend-body"></div>
            </div>
            <div class="btm-hint" aria-hidden="true"></div>`;

        const $ = s => el.querySelector(s);
        const mapEl = $('.btm-map');
        const map = L.map(mapEl, {
            zoomControl: false,
            scrollWheelZoom: false,
            attributionControl: true,
            zoomSnap: 0.25,
            minZoom: 8,
            maxZoom: 18,
            maxBounds: [[40.9, 43.6], [42.2, 45.6]],
            maxBoundsViscosity: 0.8
        });
        L.control.zoom({ position: 'topright' }).addTo(map);
        map.attributionControl.setPrefix(false);

        /* ---- Base maps ---- */
        const osmAttr = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
        const bases = {
            map: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19, attribution: osmAttr
            }),
            terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                subdomains: 'abc', maxZoom: 17, attribution: osmAttr + ', SRTM | © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
            }),
            sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics'
            })
        };
        let baseKey = 'map';
        bases[baseKey].addTo(map);

        /* ---- Panes so the stacking order is predictable ---- */
        map.createPane('btm-mask').style.zIndex = 350;
        map.createPane('btm-route').style.zIndex = 420;
        map.createPane('btm-settl').style.zIndex = 590;
        map.createPane('btm-sites').style.zIndex = 610;
        map.createPane('btm-stops').style.zIndex = 650;

        /* ---- Municipality: dim the outside, outline the border ---- */
        const world = [[-89, -179], [-89, 179], [89, 179], [89, -179]];
        const outer = D.boundary.map(poly => poly[0]);
        const boundaryGroup = L.layerGroup([
            L.polygon([world, ...outer], { pane: 'btm-mask', stroke: false, fillColor: '#0a1628', fillOpacity: 0.16, interactive: false }),
            L.polygon(D.boundary, { pane: 'btm-mask', color: '#c53030', weight: 2.5, dashArray: '8 5', fill: false, interactive: false })
        ]).addTo(map);
        const bndBounds = L.latLngBounds(outer.flat());

        /* ---- Route ---- */
        const routeGroup = L.layerGroup([
            L.polyline(D.route.line, { pane: 'btm-route', color: '#fff', weight: 8, opacity: 0.9, interactive: false }),
            L.polyline(D.route.line, { pane: 'btm-route', color: '#1a365d', weight: 4, dashArray: '10 7', lineCap: 'round', interactive: false })
        ]).addTo(map);
        const start = L.marker(D.route.start.ll, {
            pane: 'btm-stops',
            icon: L.divIcon({ className: '', html: '<div class="btm-pin btm-pin-start">★</div>', iconSize: [26, 26], iconAnchor: [13, 13] }),
            keyboard: true
        }).addTo(routeGroup);
        start.bindPopup(() => `<div class="btm-pop-kind">${t().start}</div><div class="btm-pop-name">${esc(D.route.start[lang])}</div>`);
        start.bindTooltip('', { className: 'btm-tip', direction: 'top', offset: [0, -12] });
        relabelers.push(() => start.setTooltipContent(esc(D.route.start[lang])));

        /* ---- Settlements ---- */
        const settlGroup = L.layerGroup().addTo(map);
        D.settlements.forEach(s => {
            const village = s.r === 3;
            const size = s.r === 1 ? 16 : village ? 7 : 12;
            const m = L.marker(s.ll, {
                pane: 'btm-settl', interactive: false, keyboard: false,
                icon: L.divIcon({ className: '', html: `<div class="${village ? 'btm-village' : 'btm-town r' + s.r}"></div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
            }).addTo(settlGroup);
            m.bindTooltip('', {
                permanent: true, direction: 'right', offset: [size / 2 + 2, 0], pane: 'btm-settl',
                className: 'btm-label ' + (village ? 'btm-label-village' : 'btm-label-town')
            });
            relabelers.push(() => m.setTooltipContent(esc(s[lang])));
        });

        /* ---- Heritage sites ---- */
        const pinIcon = kind => L.divIcon({
            className: '',
            html: `<div class="btm-pin btm-pin-${kind}"><img src="${iconBase}${kind}.png" alt=""></div>`,
            iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12]
        });
        function sitePopup(s) {
            const other = lang === 'ka' ? 'en' : 'ka';
            const kind = lang === 'ka' ? s.tka : s.ten;
            let h = `<div class="btm-pop-kind">${esc(kind)}</div><div class="btm-pop-name">${esc(s[lang])}</div><div class="btm-pop-alt">${esc(s[other])}</div>`;
            if (s.h) h += `<div class="btm-pop-hours">${t().hours}: ${esc(s.h)}</div>`;
            return h;
        }
        function siteLayer(list, kindOf) {
            const g = L.layerGroup();
            list.forEach(s => {
                const m = L.marker(s.ll, { pane: 'btm-sites', icon: pinIcon(kindOf(s)), riseOnHover: true }).addTo(g);
                m.bindPopup(() => sitePopup(s));
                m.bindTooltip('', { className: 'btm-tip', direction: 'top', offset: [0, -12] });
                relabelers.push(() => m.setTooltipContent(esc(s[lang])));
            });
            return g;
        }
        const churchGroup = siteLayer(D.religion, () => 'church').addTo(map);
        const castleGroup = siteLayer(D.historic, s => s.k).addTo(map);

        /* ---- Tour stops ---- */
        const stopGroup = L.layerGroup().addTo(map);
        D.stops.forEach(s => {
            const m = L.marker(s.ll, {
                pane: 'btm-stops', riseOnHover: true, zIndexOffset: 1000,
                icon: L.divIcon({ className: '', html: `<div class="btm-stop"><b>${s.order}</b></div>`, iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -34] })
            }).addTo(stopGroup);
            m.bindPopup(() => {
                const other = lang === 'ka' ? 'en' : 'ka';
                return `<div class="btm-pop-kind">${t().stop} ${s.order}</div><div class="btm-pop-name">${esc(s[lang])}</div>` +
                    `<div class="btm-pop-alt">${esc(s[other])}</div><div class="btm-pop-desc">${esc(lang === 'ka' ? s.dka : s.den)}</div>`;
            });
            m.bindTooltip('', { permanent: true, direction: 'right', offset: [14, -20], className: 'btm-label btm-label-stop', pane: 'btm-stops' });
            relabelers.push(() => m.setTooltipContent(esc(s[lang])));
        });

        /* ---- Views ---- */
        const stopsBounds = L.latLngBounds(D.stops.map(s => s.ll));
        const home = () => {
            map.closePopup();
            map.flyToBounds(bndBounds, { padding: isFs() ? [40, 40] : [8, 8], duration: 0.6 });
        };

        function updateZoomClass() {
            el.classList.toggle('z-low', map.getZoom() < 11.5);
        el.classList.toggle('z-min', map.getZoom() < 10.25);
        }
        map.on('zoomend', updateZoomClass);

        /* ---- Legend ---- */
        const layers = [
            { key: 'stops', group: stopGroup, sw: '<span class="btm-stop"><b>1</b></span>', sec: 'secTour' },
            { key: 'route', group: routeGroup, sw: '<span class="btm-sw-route"></span>', sec: 'secTour' },
            { key: 'churches', group: churchGroup, sw: `<span class="btm-pin btm-pin-church" style="width:22px;height:22px"><img src="${iconBase}church.png" alt="" style="width:13px;height:13px"></span>`, sec: 'secSites' },
            { key: 'castles', group: castleGroup, sw: `<span class="btm-pin btm-pin-castle" style="width:22px;height:22px"><img src="${iconBase}castle.png" alt="" style="width:13px;height:13px"></span>`, sec: 'secSites' },
            { key: 'settl', group: settlGroup, sw: '<span class="btm-sw-town"></span>', sec: 'secOther' },
            { key: 'bnd', group: boundaryGroup, sw: '<span class="btm-sw-bnd"></span>', sec: 'secOther' }
        ];
        const legend = $('.btm-legend');
        const legendBody = $('.btm-legend-body');
        const legendToggle = $('.btm-legend-toggle');

        function renderLegend() {
            let html = '', sec = '';
            layers.forEach(l => {
                if (l.sec !== sec) { sec = l.sec; html += `<h5>${t()[sec]}</h5>`; }
                html += `<label class="btm-row"><input type="checkbox" data-layer="${l.key}" ${map.hasLayer(l.group) ? 'checked' : ''}>` +
                    `<span class="btm-sw">${l.sw}</span><span>${t()[l.key]}</span></label>`;
            });
            html += `<h5>${t().secBase}</h5><div class="btm-bases">` +
                Object.keys(bases).map(k => `<button type="button" class="btm-base" data-base="${k}" aria-pressed="${k === baseKey}">${t()[k]}</button>`).join('') +
                '</div>';
            html += `<div class="btm-route-info">${t().routeInfo(D.route.km, D.route.min)}</div>`;
            legendBody.innerHTML = html;
            legendToggle.textContent = t().legend;
        }
        legendBody.addEventListener('change', e => {
            const l = layers.find(x => x.key === e.target.dataset.layer);
            if (!l) return;
            e.target.checked ? l.group.addTo(map) : map.removeLayer(l.group);
        });
        legendBody.addEventListener('click', e => {
            const k = e.target.dataset && e.target.dataset.base;
            if (!k || k === baseKey) return;
            map.removeLayer(bases[baseKey]);
            baseKey = k;
            bases[k].addTo(map).bringToBack();
            renderLegend();
        });
        legendToggle.addEventListener('click', () => setLegend(legend.classList.contains('collapsed')));
        function setLegend(open) {
            legend.classList.toggle('collapsed', !open);
            legendToggle.setAttribute('aria-expanded', String(open));
        }
        L.DomEvent.disableClickPropagation(legend);
        L.DomEvent.disableScrollPropagation(legend);
        L.DomEvent.disableClickPropagation($('.btm-bar'));

        /* ---- Language ---- */
        function applyLang() {
            $('.btm-title strong').textContent = t().title;
            $('.btm-title span').textContent = t().sub;
            const lb = $('.btm-lang-btn');
            lb.textContent = t().lang;
            lb.setAttribute('aria-label', t().langLabel);
            lb.lang = lang === 'ka' ? 'en' : 'ka';
            $('.btm-home-btn').setAttribute('aria-label', lang === 'ka' ? 'საწყისი ხედი' : 'Reset view');
            $('.btm-home-btn').title = $('.btm-home-btn').getAttribute('aria-label');
            el.setAttribute('aria-label', t().aria);
            el.lang = lang;
            updateFsButton();
            renderLegend();
            relabelers.forEach(f => f());
            map.closePopup();
        }
        function setLang(l) {
            if (l === lang) return;
            lang = l;
            applyLang();
        }
        $('.btm-lang-btn').addEventListener('click', () => {
            const next = lang === 'ka' ? 'en' : 'ka';
            // keep the whole site in sync when embedded on the GCA page
            if (followSite && typeof window.setLang === 'function') window.setLang(next);
            setLang(next);
        });
        if (followSite) {
            new MutationObserver(() => setLang(siteLang())).observe(document.body, { attributes: true, attributeFilter: ['class'] });
        }

        /* ---- Full screen ---- */
        let pseudo = false;
        const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
        const isFs = () => fsEl() === el || pseudo;

        function updateFsButton() {
            const b = $('.btm-fs-btn');
            const on = isFs();
            b.querySelector('.btm-fs-ico').innerHTML = on ? ICON.exit : ICON.fs;
            b.querySelector('.btm-fs-label').textContent = on ? t().exit : t().full;
            b.setAttribute('aria-label', on ? t().exit : t().full);
            b.setAttribute('aria-pressed', String(on));
            b.title = b.getAttribute('aria-label');
        }
        function onFsChange() {
            const on = isFs();
            el.classList.toggle('is-fs', on);
            on ? map.scrollWheelZoom.enable() : map.scrollWheelZoom.disable();
            if (L.Browser.mobile) on ? map.dragging.enable() : map.dragging.disable();
            setLegend(on && el.clientWidth > 520);
            updateFsButton();
            sizeClasses();
            setTimeout(() => {
                map.invalidateSize();
                on ? map.flyToBounds(bndBounds, { padding: [40, 40], duration: 0.5 }) : map.fitBounds(bndBounds, { padding: [8, 8] });
            }, 60);
        }
        // Fallback when the Fullscreen API is missing or refused (e.g. iPhone):
        // move the map to <body> so transformed ancestors can't trap position:fixed.
        const placeholder = document.createComment('tour-map');
        function enterPseudo() {
            pseudo = true;
            el.parentNode.insertBefore(placeholder, el);
            document.body.appendChild(el);
            document.documentElement.classList.add('btm-lock');
            el.classList.add('btm-pseudo-fs');
            if (history.pushState) history.pushState({ btm: 1 }, '');
            onFsChange();
        }
        function enterFs() {
            const req = el.requestFullscreen || el.webkitRequestFullscreen;
            if (!req) return enterPseudo();
            const p = req.call(el);
            if (p && p.catch) p.catch(enterPseudo);
        }
        function exitFs() {
            if (pseudo) {
                pseudo = false;
                el.classList.remove('btm-pseudo-fs');
                document.documentElement.classList.remove('btm-lock');
                placeholder.parentNode && placeholder.parentNode.replaceChild(el, placeholder);
                if (history.state && history.state.btm) history.back();
                onFsChange();
            } else if (fsEl()) {
                (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            }
        }
        $('.btm-fs-btn').addEventListener('click', () => (isFs() ? exitFs() : enterFs()));
        $('.btm-home-btn').addEventListener('click', home);
        document.addEventListener('fullscreenchange', onFsChange);
        document.addEventListener('webkitfullscreenchange', onFsChange);
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && pseudo) exitFs(); });
        window.addEventListener('popstate', () => {
            if (pseudo) { history.replaceState(null, ''); exitFs(); }
        });

        /* ---- Small-view gestures: don't hijack page scrolling ---- */
        const hint = $('.btm-hint');
        let hintTimer;
        function showHint(msg) {
            hint.textContent = msg;
            hint.classList.add('show');
            clearTimeout(hintTimer);
            hintTimer = setTimeout(() => hint.classList.remove('show'), 1400);
        }
        mapEl.addEventListener('wheel', e => {
            if (isFs()) return;
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                map.setZoomAround(map.mouseEventToContainerPoint(e), map.getZoom() + (e.deltaY < 0 ? 0.5 : -0.5));
            } else {
                showHint(t().hintWheel);
            }
        }, { passive: false });
        if (L.Browser.mobile) {
            map.dragging.disable();
            mapEl.addEventListener('touchmove', e => {
                if (isFs()) return;
                if (e.touches.length >= 2) map.dragging.enable();
                else showHint(t().hintTouch);
            }, { passive: true });
            mapEl.addEventListener('touchend', () => { if (!isFs()) map.dragging.disable(); });
        }

        /* ---- Responsive classes ---- */
        function sizeClasses() {
            el.classList.toggle('is-compact', el.clientWidth < 420 && !isFs());
            el.classList.toggle('is-wide', el.clientWidth >= 640);
        }
        // Refit on resize until the visitor has moved the map themselves
        let touched = false;
        mapEl.addEventListener('pointerdown', () => { touched = true; });
        if (window.ResizeObserver) {
            new ResizeObserver(() => {
                sizeClasses();
                map.invalidateSize();
                if (!touched && !isFs()) map.fitBounds(bndBounds, { padding: [8, 8], animate: false });
            }).observe(el);
        }

        applyLang();
        sizeClasses();
        map.fitBounds(bndBounds, { padding: [8, 8] });
        updateZoomClass();

        const api = { map, setLang, enterFullscreen: enterFs, exitFullscreen: exitFs, stops: stopsBounds };
        el._btm = api;
        return api;
    }

    window.BolnisiTourMap = { mount };
    const auto = () => document.querySelectorAll('[data-tour-map]').forEach(mount);
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', auto) : auto();
})();
