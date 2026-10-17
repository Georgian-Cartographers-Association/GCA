"""Rebuilds the grapevine-variety zones from the PDF map (the source vazi.shp
is not in the project folder; the ArcGIS project points to D:\\bolnisi\\...).

1. Render bolnisis_vazi_Chasworebuli.pdf at 300 dpi (pdftoppm).
2. Fit a pixel -> UTM 38N affine by ICP of the red boundary pixels against
   the author's bolnisi_line.shp (niadagis_daxriloba.zip).
3. Classify the five legend colours, close the gaps left by labels, rivers
   and dashed outlines, polygonize with GDAL.

Usage: python3 vazi_from_pdf.py <render.png> <bolnisi_line.geojson (UTM)> <out_dir>
Writes vazi_zones.gpkg (EPSG:32638) and vazi_zones_4326.geojson.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree
from osgeo import gdal, ogr, osr

png, bline, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
gdal.UseExceptions()

ZONES = [  # code, legend RGB, KA, EN
    (1, (171, 204, 236), 'ჩინური, გორული მწვანე', 'Chinuri, Goruli Mtsvane'),
    (2, (102, 235, 184), 'ბოლნისური საფერავი, თავკვერი', 'Bolnisi Saperavi, Tavkveri'),
    (3, (204, 250, 83), 'რქაწითელი, კახური მწვანე', 'Rkatsiteli, Kakhuri Mtsvane'),
    (4, (255, 250, 83), 'საფერავი, შავკაპიტო', 'Saperavi, Shavkapito'),
    (5, (255, 97, 83), 'დანარჩენი ჯიშები', 'Other varieties'),
]

a = np.asarray(Image.open(png).convert('RGB')).astype(np.int16)
H, W, _ = a.shape
sc = W / 1202  # layout measured on a 1202 px wide preview
area = np.ones((H, W), bool)
area[int(560 * sc):, :int(245 * sc)] = False   # legend
area[:int(62 * sc), :] = False                  # title band

# ---- georeference: ICP on the municipality boundary ----
red = (a[:, :, 0] > 200) & (a[:, :, 1] < 45) & (a[:, :, 2] < 45) & area
px = np.argwhere(red)[:, ::-1].astype(float)
px = px[np.random.default_rng(0).choice(len(px), min(25000, len(px)), replace=False)]
pts = []
for f in json.load(open(bline))['features']:
    g = f['geometry']
    for ln in (g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]):
        ln = np.array(ln, float)
        for p, q in zip(ln[:-1], ln[1:]):
            n = max(1, int(np.hypot(*(q - p)) / 20))
            pts += [p + (q - p) * t for t in np.linspace(0, 1, n, endpoint=False)]
real = np.array(pts)
tree = cKDTree(real)
X = np.c_[px, np.ones(len(px))]
pmin, pmax, rmin, rmax = px.min(0), px.max(0), real.min(0), real.max(0)
sx, sy = (rmax - rmin) / (pmax - pmin)
A = np.array([[sx, 0, rmin[0] - sx * pmin[0]], [0, -sy, rmax[1] + sy * pmin[1]]])
for _ in range(120):
    d, i = tree.query(X @ A.T)
    keep = d < np.percentile(d, 85)
    A = np.linalg.lstsq(X[keep], real[i[keep]], rcond=None)[0].T
d2, _ = cKDTree(X @ A.T).query(real)
print(f'boundary fit: median {np.median(d2):.1f} m, p95 {np.percentile(d2, 95):.1f} m, {np.hypot(*A[:, 0]):.2f} m/px')

# ---- classify ----
px_m2 = np.hypot(*A[:, 0]) * np.hypot(*A[:, 1])
cls = np.zeros((H, W), np.uint8)
for code, rgb, *_ in ZONES:
    m = (np.abs(a - np.array(rgb)).sum(2) < 45) & area
    # Anti-aliased rivers and the red boundary line share these colours;
    # zones are broad, so an opening (~190 m) removes the lines.
    m = ndimage.binary_opening(m, structure=np.ones((25, 25)))
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    cls[np.isin(lab, 1 + np.flatnonzero(sizes * px_m2 >= 50e4))] = code  # >= 50 ha

# Fill gaps (labels, rivers, dashed outlines): each unclassified pixel inside
# a zone takes the nearest class, but only within ~10 px of a classified pixel.
dist, (iy, ix) = ndimage.distance_transform_edt(cls == 0, return_indices=True)
filled = np.where(dist <= 14, cls[iy, ix], 0).astype(np.uint8)
# then a per-class close + hole fill and drop specks (< 2 ha)
min_px = int(20000 / px_m2)
final = np.zeros_like(filled)
for code, *_ in ZONES:
    m = ndimage.binary_closing(filled == code, structure=np.ones((9, 9)), iterations=2)
    m = ndimage.binary_fill_holes(m)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    m = np.isin(lab, 1 + np.flatnonzero(sizes >= min_px))
    final[m & (final == 0)] = code

# ---- write raster & polygonize ----
srs = osr.SpatialReference(); srs.ImportFromEPSG(32638)
gt = (A[0, 2] - 0.5 * A[0, 0] - 0.5 * A[0, 1], A[0, 0], A[0, 1],
      A[1, 2] - 0.5 * A[1, 0] - 0.5 * A[1, 1], A[1, 0], A[1, 1])
mem = gdal.GetDriverByName('MEM').Create('', W, H, 1, gdal.GDT_Byte)
mem.SetGeoTransform(gt); mem.SetProjection(srs.ExportToWkt())
mem.GetRasterBand(1).WriteArray(final)
gdal.GetDriverByName('GTiff').CreateCopy(os.path.join(out, 'vazi_classes.tif'), mem, options=['COMPRESS=DEFLATE'])

gpkg = os.path.join(out, 'vazi_zones.gpkg')
if os.path.exists(gpkg): os.remove(gpkg)
tmp = ogr.GetDriverByName('Memory').CreateDataSource('')
tl = tmp.CreateLayer('raw', srs, ogr.wkbPolygon)
tl.CreateField(ogr.FieldDefn('code', ogr.OFTInteger))
gdal.Polygonize(mem.GetRasterBand(1), mem.GetRasterBand(1), tl, 0)

ds = ogr.GetDriverByName('GPKG').CreateDataSource(gpkg)
ol = ds.CreateLayer('vazi_zones', srs, ogr.wkbMultiPolygon)
for name, t in [('code', ogr.OFTInteger), ('name_ka', ogr.OFTString), ('name_en', ogr.OFTString),
                ('color', ogr.OFTString), ('area_ha', ogr.OFTReal)]:
    ol.CreateField(ogr.FieldDefn(name, t))
for code, rgb, ka, en in ZONES:
    geom = ogr.Geometry(ogr.wkbMultiPolygon)
    tl.SetAttributeFilter(f'code = {code}')
    for f in tl:
        geom.AddGeometry(f.GetGeometryRef().Clone())
    geom = geom.UnionCascaded().SimplifyPreserveTopology(12)
    if geom.GetGeometryType() == ogr.wkbPolygon:
        geom = ogr.ForceToMultiPolygon(geom)
    f = ogr.Feature(ol.GetLayerDefn())
    f.SetField('code', code); f.SetField('name_ka', ka); f.SetField('name_en', en)
    f.SetField('color', '#%02x%02x%02x' % rgb); f.SetField('area_ha', round(geom.GetArea() / 1e4, 1))
    f.SetGeometry(geom); ol.CreateFeature(f)
    print(f'{code} {en:28s} {geom.GetArea() / 1e4:8.0f} ha  {geom.GetGeometryCount()} part(s)')
ds = None

gdal.VectorTranslate(os.path.join(out, 'vazi_zones_4326.geojson'), gpkg, format='GeoJSON', dstSRS='EPSG:4326',
                     layerCreationOptions=['RFC7946=YES', 'COORDINATE_PRECISION=5'])
