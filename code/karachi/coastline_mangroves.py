"""Karachi coast: waterline change (MNDWI + Otsu) and coastal vegetation / mangrove canopy, Dec 2016 vs Oct 2024.
Usage:  python coastline_mangroves.py <data_folder_from_download.py> <figure_output_folder>
"""
import json, sys, numpy as np, rasterio, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.patches import Patch
from matplotlib_scalebar.scalebar import ScaleBar
from scipy import ndimage
import PIL.Image as I
D = sys.argv[1]; OUT = sys.argv[2]; BG = '#0c1119'; INK = '#e8eef4'; MUT = '#9aa8b8'
def otsu(v):
    h, b = np.histogram(v, 256, (-1, 1)); p = h / h.sum(); w = np.cumsum(p); mu = np.cumsum(p * b[:-1]); mt = mu[-1]
    s = (mt * w - mu) ** 2 / (w * (1 - w) + 1e-12); return float(b[np.nanargmax(s)])
def load(f, offset):
    with rasterio.open(f) as s: a = s.read().astype('float32')
    nod = a[2] == 0
    a[:4] = np.clip(a[:4] - offset, 1, None)  # baseline >= 04.00 scenes carry BOA_ADD_OFFSET = -1000
    g, r, n, sw, scl = a; g, r, n, sw = g / 1e4, r / 1e4, n / 1e4, sw / 1e4
    mndwi = (g - sw) / (g + sw + 1e-6); t = otsu(mndwi[n > 0]); water = mndwi > t
    ndvi = (n - r) / (n + r + 1e-6)
    water = ndimage.binary_closing(ndimage.binary_opening(water))
    return dict(t=t, water=water, ndvi=ndvi, valid=~nod, fc=np.clip(np.dstack([n, r, g]) / np.array([.35, .25, .22]), 0, 1) ** 0.9)
A = load(D + '/s2_2016.tif', 0); B = load(D + '/s2_2024.tif', 1000)
valid = A['valid'] & B['valid']
def clean(m, minpx=100):
    lab, n = ndimage.label(m); sz = ndimage.sum(m, lab, range(1, n + 1)); return np.isin(lab, np.flatnonzero(sz >= minpx) + 1)
gain = clean(A['water'] & ~B['water'] & valid); loss = clean(~A['water'] & B['water'] & valid)
px = 100 / 1e6
near = ndimage.binary_dilation(A['water'] | B['water'], iterations=30) & valid
mA = clean((A['ndvi'] > 0.3) & near & ~A['water']); mB = clean((B['ndvi'] > 0.3) & near & ~B['water'])
it = json.load(open(D + '/items.json'))
m = {'early': it['early'], 'late': it['late'], 'otsu_2016': round(A['t'], 3), 'otsu_2024': round(B['t'], 3),
     'land_gain_km2': round(float(gain.sum() * px), 2), 'land_loss_km2': round(float(loss.sum() * px), 2), 'area_km2': round(float(valid.sum() * px), 1), 'veg_coastal_2016_km2': round(float(mA.sum() * px), 2), 'veg_coastal_2024_km2': round(float(mB.sum() * px), 2), 'veg_gained_km2': round(float((mB & ~mA).sum() * px), 2), 'veg_lost_km2': round(float((mA & ~mB).sum() * px), 2), 'gain_on_veg_2024_pct': round(float((gain & mB).sum() / max(gain.sum(), 1) * 100), 1)}
lab, n = ndimage.label(gain); sz = ndimage.sum(gain, lab, range(1, n + 1)); order = np.argsort(sz)[::-1][:5]
H, W = gain.shape
with rasterio.open(D + '/s2_2024.tif') as s: tr = s.transform; crs = s.crs
from rasterio.warp import transform as wt
patches = []
for i in order:
    cy, cx = ndimage.center_of_mass(gain, lab, int(i) + 1); x, y = tr * (cx, cy); lon, lat = wt(crs, 'EPSG:4326', [x], [y])
    patches.append({'km2': round(float(sz[i] * px), 2), 'lon': round(lon[0], 4), 'lat': round(lat[0], 4), 'row': int(cy), 'col': int(cx)})
m['largest_gain_patches'] = patches
print(json.dumps(m, indent=1)); json.dump(m, open(D + '/metrics.json', 'w'), indent=1)
def ax_(a, t):
    a.set_xticks([]); a.set_yticks([]); a.set_title(t, color=INK, fontsize=11, loc='left')
    for s in a.spines.values(): s.set_color('#2a3442')
base = np.zeros((H, W, 3)); base[:] = [.06, .08, .11]; base[~B['water']] = [.22, .25, .29]
base[gain] = [.82, .93, .46]; base[loss] = [.40, .84, .91]
GL = f"New land (water to land): {m['land_gain_km2']} km²"; LL = f"Land to water: {m['land_loss_km2']} km²"
fig, axs = plt.subplots(1, 3, figsize=(17, 4.6), dpi=140, facecolor=BG)
axs[0].imshow(A['fc']); ax_(axs[0], '13 Dec 2016 · false colour (NIR-R-G)')
axs[1].imshow(B['fc']); ax_(axs[1], '27 Oct 2024 · false colour (NIR-R-G)')
axs[0].contour(A['water'], levels=[.5], colors=['#f0c36e'], linewidths=.5); axs[1].contour(B['water'], levels=[.5], colors=['#f0c36e'], linewidths=.5)
axs[2].imshow(base, interpolation='nearest'); ax_(axs[2], 'Land / water change, 2016 to 2024')
axs[2].add_artist(ScaleBar(10, location='lower right', box_color='#101722', color=INK, box_alpha=.85, font_properties={'size': 8}))
fig.legend(handles=[Patch(color=(.82, .93, .46), label=GL), Patch(color=(.40, .84, .91), label=LL), Patch(color=(.22, .25, .29), label='Land 2024'),
                    Patch(color='#f0c36e', label='Waterline (MNDWI, Otsu)')], loc='lower center', ncol=4, frameon=False, labelcolor=INK, fontsize=9)
fig.text(.01, .08, 'Karachi coast: Clifton, DHA and Korangi Creek · Sentinel-2 L2A, relative orbit 134 · 10 m · WGS 84 / UTM 42N', color=MUT, fontsize=8)
fig.tight_layout(rect=(0, .1, 1, 1)); fig.savefig(OUT + '/karachi-coast-change.jpg', facecolor=BG, bbox_inches='tight', pil_kwargs={'quality': 86}); plt.close(fig)
fig, ax = plt.subplots(figsize=(12, 7.2), dpi=140, facecolor=BG); ax.imshow(base, interpolation='nearest')
ax_(ax, 'Karachi coastline change, 2016 to 2024 (Sentinel-2, MNDWI)')
ax.add_artist(ScaleBar(10, location='lower right', box_color='#101722', color=INK, box_alpha=.85, font_properties={'size': 9}))
ax.annotate('N', xy=(.04, .93), xycoords='axes fraction', ha='center', color=INK, fontsize=12, fontweight='bold')
ax.annotate('', xy=(.04, .92), xytext=(.04, .84), xycoords='axes fraction', arrowprops=dict(arrowstyle='-|>', color=INK, lw=1.5))
ax.legend(handles=[Patch(color=(.82, .93, .46), label=GL), Patch(color=(.40, .84, .91), label=LL), Patch(color=(.22, .25, .29), label='Land 2024'),
                   Patch(color=(.06, .08, .11), label='Water 2024')], loc='upper right', facecolor='#101722', edgecolor='#2a3442', labelcolor=INK, fontsize=9)
fig.text(.13, .04, 'Data: Copernicus Sentinel-2 L2A (13 Dec 2016, 27 Oct 2024) via Microsoft Planetary Computer · Patches under 1 ha removed', color=MUT, fontsize=8)
fig.savefig(OUT + '/karachi-coast-map.jpg', facecolor=BG, bbox_inches='tight', pil_kwargs={'quality': 86}); plt.close(fig)
th = I.fromarray((base * 255).astype('uint8')); w2 = 800; h2 = int(w2 * H / W); top = max(0, h2 // 2 - 210)
th.resize((w2, h2)).crop((0, top, 800, top + 420)).save(OUT + '/karachi-coast-thumb.jpg', quality=86)

fig, axs = plt.subplots(1, 2, figsize=(15, 5), dpi=140, facecolor=BG)
for a, mm, t in ((axs[0], mA, f"2016 coastal vegetation (NDVI > 0.3): {m['veg_coastal_2016_km2']} km²"), (axs[1], mB, f"2024 coastal vegetation (NDVI > 0.3): {m['veg_coastal_2024_km2']} km²")):
    im = np.zeros((H, W, 3)); im[:] = [.06, .08, .11]; im[~B['water']] = [.22, .25, .29]; im[mm] = [.34, .74, .45]
    a.imshow(im, interpolation='nearest'); ax_(a, t)
axs[1].add_artist(ScaleBar(10, location='lower right', box_color='#101722', color=INK, box_alpha=.85, font_properties={'size': 8}))
fig.text(.01, .01, 'Vegetation within 300 m of open water; mostly mangrove (Avicennia marina) in Korangi and Phitti creeks. Patches under 1 ha removed.', color=MUT, fontsize=8)
fig.tight_layout(rect=(0, .04, 1, 1)); fig.savefig(OUT + '/karachi-mangroves.jpg', facecolor=BG, bbox_inches='tight', pil_kwargs={'quality': 86}); plt.close(fig)
