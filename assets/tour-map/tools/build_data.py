"""Builds tour-map/bolnisi-data.js from the GIS exports.

Inputs (GeoJSON, EPSG:4326) are produced with ogr2ogr from
ბოლნისი/bolnisi_turistuli/data — see tour-map/README.md.
Usage: python3 build_data.py <exports_dir> <route.json> <out.js> [vazi_zones_4326.geojson]
The optional vine-zone file comes from tools/vazi_from_pdf.py.
"""
import json, sys, os
from PIL import Image

src, route_file, out = sys.argv[1], sys.argv[2], sys.argv[3]
vazi_file = sys.argv[4] if len(sys.argv) > 4 else None
load = lambda n: json.load(open(os.path.join(src, n), encoding='utf-8'))

def pt(f):
    x, y = f['geometry']['coordinates'][:2]
    return [round(y, 5), round(x, 5)]

# --- Tour stops (data/SHP/eklesiebi.shp) ---
STOPS = {
    'petre-pavles monasteri': dict(order=1,
        ka='ბოლნისის წმ. პეტრე და პავლეს მონასტერი', en='Monastery of Sts Peter and Paul, Bolnisi',
        dka='ბოლნისის ეპარქიის საკათედრო მონასტერი ქალაქ ბოლნისში.',
        den='Cathedral monastery of the Bolnisi Eparchy in the town of Bolnisi.'),
    'bolnisis sioni': dict(order=2,
        ka='ბოლნისის სიონი', en='Bolnisi Sioni',
        dka='V საუკუნის ბაზილიკა (478–493 წწ.). აქ აღმოჩენილია უძველესი თარიღიანი ქართული წარწერები.',
        den='5th-century basilica (478–493 AD), home to the oldest dated Georgian inscriptions.'),
    'wuRruRaSeni': dict(order=3,
        ka='წუღრუღაშენი', en='Tsughrughasheni',
        dka='XIII საუკუნის ჯვარ-გუმბათოვანი ტაძარი მდიდარი ჩუქურთმით.',
        den='13th-century cross-domed church famed for its carved stone ornament.'),
}
stops = []
for f in load('stops.geojson')['features']:
    s = dict(STOPS[f['properties']['Name']]); s['ll'] = pt(f); stops.append(s)
stops.sort(key=lambda s: s['order'])

# --- Churches & monasteries (shp2/BU.Religion.shp) ---
religion = []
for f in load('religion.geojson')['features']:
    p = f['properties']
    name_ka = p['NAMN_KA'].replace('ეკელისა', 'ეკლესია').replace('ეკელსია', 'ეკლესია')
    religion.append(dict(ll=pt(f), ka=name_ka, en=' '.join(p['NAMA_EN'].split()),
                         tka=p['FCSBTP_KA'], ten=p['FCSBTP_EN'],
                         h=None if p['OPENED'] in (None, '24:00_00:00', 'N_A') else p['OPENED'].replace('_', '–')))

# Drop religion points that duplicate a tour stop (within ~300 m)
near = lambda a, b: abs(a[0]-b[0]) < 0.003 and abs(a[1]-b[1]) < 0.004
religion = [r for r in religion if not any(near(r['ll'], s['ll']) for s in stops)
            and 'Petre and Pavle' not in r['en']]  # stop 1, mapped ~500 m apart in BU layer

# --- Fortresses, towers, palaces (shp2/BU.Historical.Monument.shp) ---
historic = []
for f in load('historic.geojson')['features']:
    p = f['properties']
    kind = 'tower' if p['TYPEID_EN'] == 'Tower' else 'castle'
    historic.append(dict(ll=pt(f), ka=p['NAMN_KA'], en=p['NAMA_EN'],
                         tka=p['TYPEID_KA'], ten=p['TYPEID_EN'], k=kind))

# --- Settlements (Georgia_data.gpkg/Settlement) ---
KA = {'Poladauri':'ფოლადაური','Darbazi':'დარბაზი','Chreshi':'ჭრეში','Khakhalajvari':'ხახალაჯვარი',
 'Tsipori':'წიფორი','Mamkhuti':'მამხუთი','Zemo koshakilisi':'ზემო ქოშაქილისი','Patara ahmedlo':'პატარა ახმედლო',
 'Kvemo kvesheti':'ქვემო ქვეშეთი','Nakhiduri':'ნახიდური','Bolnisi':'ბოლნისი','Kazreti':'კაზრეთი','Balichi':'ბალიჭი',
 'Akaurta':'აკაურთა','Geta':'გეტა','Dzedzvnariani':'ძეძვნარიანი','Bertakari':'ბერთაკარი','Senebi':'სენები',
 'Itsria':'ინწრია','Potskhveriani':'ფოცხვერიანი','Dzveli kveshi':'ძველი ქვეში','Shua bolnisi':'შუა ბოლნისი',
 'Samtsevrisi':'სამწევრისი','Mtskneti':'მწყნეთი','Mukhrana':'მუხრანა','Khidiskuri':'ხიდისყური','Chapala':'ჭაპალა',
 'Ratevani':'რატევანი','Rachisubani':'რაჭისუბანი','Samtredo':'სამტრედო','Vanati':'ვანათი','Khatissopeli':'ხატისსოფელი',
 'Talaveri':'ტალავერი','Savaneti':'საბანეთი','Patara darbazi':'პატარა დარბაზი','Tandzia':'ტანძია',
 'Kvemo bolnisi':'ქვემო ბოლნისი','Kveshi':'ქვეში','Kianeti':'კიანეთი','Mushevani':'მუშევანი','Sabureti':'საბურეთი',
 'Javshaniani':'ჯავშანიანი','Tamarisi':'თამარისი','Parizi':'პარიზი','Tsurtavi':'წურტავი','Zvareti':'ზვარეთი'}
settl, seen = [], set()
for f in load('settl.geojson')['features']:
    p = f['properties']; n = p['NAME_ENG']
    if (n, p['URB_STAT']) in seen: continue
    seen.add((n, p['URB_STAT']))
    en = n[0].upper() + n[1:].replace(' bolnisi', ' Bolnisi').replace(' kveshi', ' Kveshi').replace(' kvesheti', ' Kvesheti') \
        .replace(' koshakilisi', ' Koshakilisi').replace(' ahmedlo', ' Akhmedlo').replace(' darbazi', ' Darbazi')
    if p['URB_STAT'] == 3 and n == 'Bolnisi':
        continue  # village Bolnisi sits on top of Sioni; the stop label covers it
    settl.append(dict(ll=pt(f), ka=KA[n], en=en, r=p['URB_STAT']))

# --- Municipality boundary ---
geom = load('boundary.geojson')['features'][0]['geometry']
polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
boundary = [[[[round(y, 5), round(x, 5)] for x, y in ring] for ring in poly] for poly in polys]

# --- Approximate route (OSRM), simplified ---
def rdp(pts, eps):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1; L = (dx*dx + dy*dy) ** .5 or 1e-12
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy*pts[i][0] - dx*pts[i][1] + x2*y1 - y2*x1) / L
        if d > dmax: dmax, idx = d, i
    if dmax <= eps: return [pts[0], pts[-1]]
    return rdp(pts[:idx+1], eps)[:-1] + rdp(pts[idx:], eps)
def rdp_ring(ring, eps):
    # closed ring: split at the vertex farthest from the start, simplify both halves
    far = max(range(len(ring)), key=lambda i: (ring[i][0]-ring[0][0])**2 + (ring[i][1]-ring[0][1])**2)
    return rdp(ring[:far+1], eps)[:-1] + rdp(ring[far:], eps)

r = json.load(open(route_file))['routes'][0]
coords = rdp(r['geometry']['coordinates'], 0.00008)
route = dict(line=[[round(y, 5), round(x, 5)] for x, y in coords],
             km=round(r['distance'] / 1000), min=round(r['duration'] / 60 / 5) * 5,
             start=dict(ll=[41.70998, 44.778], ka='თსუ, თბილისი', en='TSU, Tbilisi'))

# --- Grapevine variety zones (reconstructed from bolnisis_vazi_Chasworebuli.pdf) ---
vine = []
if vazi_file:
    for f in json.load(open(vazi_file, encoding='utf-8'))['features']:
        p = f['properties']; g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        rings = [[[[round(y, 5), round(x, 5)] for x, y in rdp_ring(ring, 0.00012)] for ring in poly] for poly in polys]
        vine.append(dict(code=p['code'], ka=p['name_ka'], en=p['name_en'], color=p['color'],
                         ha=round(p['area_ha'] / 10) * 10, rings=rings))
    vine.sort(key=lambda v: v['code'])

data = dict(stops=stops, vine=vine, religion=religion, historic=historic, settlements=settl,
            boundary=boundary, route=route)
with open(out, 'w', encoding='utf-8') as fh:
    fh.write('/* Generated by tools/build_data.py — do not edit by hand. */\n')
    fh.write('window.BOLNISI_TOUR_DATA = ')
    json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
    fh.write(';\n')
print(out, os.path.getsize(out), 'bytes;', len(stops), 'stops,', len(religion), 'religion,',
      len(historic), 'historic,', len(vine), 'vine zones,', len(settl), 'settlements,', len(route['line']), 'route pts')

