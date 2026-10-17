# ბოლნისის ექსკურსიის რუკა · Bolnisi tour map

ჩასაშენებელი ორენოვანი (ქარ/EN) Leaflet-რუკა საიტის „ექსკურსიის“ სექციისთვის, სრული ეკრანის ღილაკით.
An embeddable bilingual Leaflet map for the conference site's Tour section, with a full-screen button.

## ფაილები / Files

| | |
|---|---|
| `tour-map.js` | კომპონენტი / the widget (no build step) |
| `tour-map.css` | სტილები, `.btm`-ით შემოფარგლული / styles, scoped under `.btm` |
| `bolnisi-data.js` | GIS მონაცემები (გენერირებული) / generated data |
| `icons/` | პიქტოგრამები `simbol/`-დან / glyphs from `simbol/` |
| `tools/build_data.py` | მონაცემების აწყობა / builds `bolnisi-data.js` |

## საიტზე ჩასმა / Adding it to the site

1. დააკოპირეთ `tour-map.js`, `tour-map.css`, `bolnisi-data.js`, `icons/` → `assets/tour-map/`.
2. `index.html`-ში:
   ```html
   <link rel="stylesheet" href="assets/tour-map/tour-map.css">        <!-- leaflet.css-ის შემდეგ -->
   <div class="tour-image" data-tour-map></div>                       <!-- 🗺️-ის ნაცვლად -->
   <script src="assets/tour-map/bolnisi-data.js"></script>            <!-- leaflet.js-ის შემდეგ -->
   <script src="assets/tour-map/tour-map.js"></script>
   ```

ენა მიჰყვება საიტის გადამრთველს (`body.en`); რუკის EN/ქარ ღილაკი საიტის ენასაც ცვლის.
The language follows the site switcher (`body.en`); the map's own EN/ქარ button switches the whole site.

## ფენები და წყაროები / Layers and sources

| ფენა / Layer | წყარო / Source |
|---|---|
| გაჩერებები (3) / Stops | `data/SHP/eklesiebi.shp` + აღწერები `build_data.py`-ში |
| ეკლესიები და მონასტრები (43) | `data/shp2/BU.Religion.shp` |
| ციხეები და კოშკები (12) | `data/shp2/BU.Historical.Monument.shp` |
| დასახლებები (46) | `data/sazRvrebi_dasaxlebebi/Georgia_data.gpkg` → Settlement (KA names added by hand) |
| საზღვარი / Boundary | იგივე gpkg → Municipality, `DISTR_ENG='Bolnisi'` |
| მარშრუტი / Route | OSRM, TSU → 1 → 2 → 3 (approximate, ≈83 km) |

`BU.CulturalActivities` and `BU.Nature.Monument` (national layers) were clipped to Bolnisi: no nature monuments fall inside; cultural activities (cemeteries, statues) were left out as not relevant for the tour.

## მონაცემების განახლება / Rebuilding the data

```bash
D=/path/to/bolnisi_turistuli/data;  # source GIS folder, not in this repo
 W=/tmp/btm; mkdir -p $W
O="-t_srs EPSG:4326 -lco COORDINATE_PRECISION=5 -lco RFC7946=YES"
ogr2ogr -f GPKG $W/bnd.gpkg $D/sazRvrebi_dasaxlebebi/Georgia_data.gpkg Municipality -where "DISTR_ENG='Bolnisi'" -nln bnd
ogr2ogr -f GeoJSON $W/boundary.geojson $W/bnd.gpkg bnd $O -simplify 40 -select DISTR_ENG
ogr2ogr -f GeoJSON $W/religion.geojson $D/shp2/BU.Religion.shp $O -select FCSBTP_KA,FCSBTP_EN,NAMN_KA,NAMA_EN,OPENED
ogr2ogr -f GeoJSON $W/historic.geojson $D/shp2/BU.Historical.Monument.shp $O -select TYPEID_KA,TYPEID_EN,NAMN_KA,NAMA_EN
ogr2ogr -f GeoJSON $W/settl.geojson $D/sazRvrebi_dasaxlebebi/Georgia_data.gpkg Settlement $O -clipsrc $W/bnd.gpkg -clipsrclayer bnd -where "URB_STAT<=3"
ogr2ogr -f GeoJSON $W/stops.geojson $D/SHP/eklesiebi.shp $O -dim XY -select Name
curl -s "https://router.project-osrm.org/route/v1/driving/44.7780,41.7100;44.54006,41.4254;44.5126,41.38903;44.52998,41.38038?overview=full&geometries=geojson" -o $W/route.json
python3 assets/tour-map/tools/build_data.py $W $W/route.json assets/tour-map/bolnisi-data.js
```

Stop names/descriptions and the Georgian settlement names live in `assets/tour-map/tools/build_data.py`.
