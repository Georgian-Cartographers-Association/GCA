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
| `tools/vazi_from_pdf.py` | ვაზის არეალები PDF-დან / vine zones from the PDF |

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
| ვაზის ჯიშების არეალი (5 კლასი) / Grape variety zones | `bolnisis_vazi_Chasworebuli.pdf`-დან აღდგენილი — see below |
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
python3 assets/tour-map/tools/build_data.py $W $W/route.json assets/tour-map/bolnisi-data.js vazi_zones_4326.geojson
```

Stop names/descriptions and the Georgian settlement names live in `assets/tour-map/tools/build_data.py`.

## ვაზის არეალები / Grape variety zones

ორიგინალი `vazi.shp` (ArcGIS-ის პროექტში: `D:\bolnisi\bolnisi_mevenaxeoba\shp`) საქაღალდეში არ არის, ამიტომ არეალები აღდგენილია PDF რუკიდან.
The source `vazi.shp` is not in the project folder, so the zones were rebuilt from the PDF map:

1. `pdftoppm -r 300 -png -singlefile bolnisis_vazi_Chasworebuli.pdf vazi300`
2. `ogr2ogr -f GeoJSON bline.geojson niadagis_daxriloba/SHP/bolnisi_line.shp` (from `niadagis_daxriloba.zip`)
3. `python3 tools/vazi_from_pdf.py vazi300.png bline.geojson <out_dir>` → `vazi_zones.gpkg` (EPSG:32638) and `vazi_zones_4326.geojson`
4. Pass the GeoJSON as the 4th argument to `build_data.py`.

Georeferencing: affine fit of the PDF's red boundary to `bolnisi_line.shp`, with a median error of 15 m (95% within 51 m). As an independent check, 27 settlement dots in the PDF match `satlaments.shp` with a median error of 16 m. The class colours and names match the `category_w` renderer of the `vazi` layer in `bolnisi_tourist.aprx`. Accuracy is that of a 1:100 000 map. If the original `vazi.shp` turns up, use it instead.
