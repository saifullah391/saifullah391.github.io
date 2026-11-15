"""Random Forest land-cover classification of Islamabad from Sentinel-2 (labels: Impact Observatory LULC 2024).
Usage:  python rf_classify.py <data_folder_from_download.py> <figure_output_folder>
"""
import json, sys, numpy as np, rasterio, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.patches import Patch
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, cohen_kappa_score, f1_score, confusion_matrix, precision_score, recall_score
from matplotlib_scalebar.scalebar import ScaleBar
from scipy import ndimage
import PIL.Image as I
D = sys.argv[1]; OUT = sys.argv[2]
BG = '#0c1119'; INK = '#e8eef4'; MUT = '#9aa8b8'
C = {1: ('Water', (65, 155, 223)), 2: ('Trees', (57, 125, 73)), 5: ('Crops', (228, 150, 53)),
     7: ('Built area', (196, 40, 27)), 11: ('Rangeland', (227, 226, 195))}
with rasterio.open(D + '/s2.tif') as s: A = s.read().astype('float32')
with rasterio.open(D + '/lab.tif') as s: lab = s.read(1)
nodata = A[3] == 0
X = np.clip(A[:6] - 1000, 0, None); scl = A[6]; H, W = lab.shape  # baseline >= 04.00: BOA_ADD_OFFSET = -1000
b2, b3, b4, b8, b11, b12 = X / 10000.0; e = 1e-6
ndvi = (b8 - b4) / (b8 + b4 + e); ndbi = (b11 - b8) / (b11 + b8 + e); mndwi = (b3 - b11) / (b3 + b11 + e)
tex = np.sqrt(np.clip(ndimage.uniform_filter(ndvi ** 2, 5) - ndimage.uniform_filter(ndvi, 5) ** 2, 0, None))
F = np.stack([b2, b3, b4, b8, b11, b12, ndvi, ndbi, mndwi, tex])
names = ['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2', 'NDVI', 'NDBI', 'MNDWI', 'NDVI texture']
cloud = np.isin(scl, [3, 8, 9, 10]); valid = ~nodata & np.isin(lab, list(C)) & ~cloud
rng = np.random.default_rng(42)
by, bx = np.indices((H, W)); blk = (by // 100) * ((W // 100) + 1) + (bx // 100)
ub = np.unique(blk); T = np.isin(blk, rng.choice(ub, int(len(ub) * .3), replace=False)).ravel()
Fm = F.reshape(F.shape[0], -1).T; L = lab.ravel(); V = valid.ravel()
tr = np.concatenate([rng.choice(np.flatnonzero(V & ~T & (L == c)), min((V & ~T & (L == c)).sum(), 5000), replace=False)
                     for c in C if (V & ~T & (L == c)).sum()])
rf = RandomForestClassifier(n_estimators=300, min_samples_leaf=2, n_jobs=-1, random_state=42).fit(Fm[tr], L[tr])
te = rng.choice(np.flatnonzero(V & T), min((V & T).sum(), 300000), replace=False); yp = rf.predict(Fm[te]); yt = L[te]
pres = [c for c in C if (yt == c).sum() > 50]
f1 = f1_score(yt, yp, labels=pres, average=None)
pa = recall_score(yt, yp, labels=pres, average=None); ua = precision_score(yt, yp, labels=pres, average=None)
m = {'scene': json.load(open(D + '/item.json'))['id'], 'train_px': int(len(tr)), 'test_px': int(len(te)),
     'oa': round(float(accuracy_score(yt, yp)), 3), 'kappa': round(float(cohen_kappa_score(yt, yp)), 3), 'macro_f1': round(float(f1.mean()), 3),
     'per_class': {C[c][0]: {'f1': round(float(a), 3), 'producer': round(float(b), 3), 'user': round(float(d), 3), 'ref_share': round(float((yt == c).mean()), 3)}
                   for c, a, b, d in zip(pres, f1, pa, ua)},
     'importance': {n: round(float(v), 3) for n, v in zip(names, rf.feature_importances_)},
     'area_km2': round(H * W / 1e4, 1), 'cloud_pct': round(float(cloud.mean() * 100), 2)}
pred = np.zeros(H * W, 'uint8'); vv = np.flatnonzero(~nodata.ravel())
for i in range(0, len(vv), 1_000_000): pred[vv[i:i + 1_000_000]] = rf.predict(Fm[vv[i:i + 1_000_000]])
pred = pred.reshape(H, W); pred[cloud] = 10
m['pred_share'] = {C[c][0]: round(float((pred == c).mean() * 100), 1) for c in C}
m['ref_share_all'] = {C[c][0]: round(float((lab == c).mean() * 100), 1) for c in C}
print(json.dumps(m, indent=1)); json.dump(m, open(D + '/metrics.json', 'w'), indent=1)
lut = np.zeros((256, 3))
for v, (n, c) in C.items(): lut[v] = np.array(c) / 255
lut[0] = [.05, .07, .1]; lut[10] = [.38, .38, .38]; lut[4] = [.48, .53, .78]; lut[8] = [.65, .61, .56]
rgb = np.clip(np.dstack([b4, b3, b2]) / 0.22, 0, 1) ** 0.85
def ax_(a, t):
    a.set_xticks([]); a.set_yticks([]); a.set_title(t, color=INK, fontsize=11, loc='left')
    for s in a.spines.values(): s.set_color('#2a3442')
fig, axs = plt.subplots(1, 3, figsize=(17, 5.4), dpi=140, facecolor=BG)
axs[0].imshow(rgb); ax_(axs[0], 'Sentinel-2 true colour, 26 Oct 2024')
axs[1].imshow(lut[pred], interpolation='nearest'); ax_(axs[1], 'Random Forest prediction')
axs[2].imshow(lut[lab], interpolation='nearest'); ax_(axs[2], 'Reference: Impact Observatory LULC 2024')
axs[0].add_artist(ScaleBar(10, location='lower right', box_color='#101722', color=INK, box_alpha=.85, font_properties={'size': 8}))
fig.legend(handles=[Patch(color=lut[c], label=C[c][0]) for c in C], loc='lower center', ncol=5, frameon=False, labelcolor=INK, fontsize=9)
fig.text(.01, .06, 'Islamabad and Margalla Hills · 10 m · WGS 84 / UTM 43N', color=MUT, fontsize=8)
fig.tight_layout(rect=(0, .08, 1, 1)); fig.savefig(OUT + '/islamabad-rf-comparison.jpg', facecolor=BG, bbox_inches='tight', pil_kwargs={'quality': 86}); plt.close(fig)
cm = confusion_matrix(yt, yp, labels=pres, normalize='true')
fig, (a1, a2) = plt.subplots(1, 2, figsize=(14, 5.6), dpi=140, facecolor=BG, gridspec_kw={'width_ratios': [1, 1.05]})
a1.imshow(cm, cmap='viridis', vmin=0, vmax=1); lb = [C[c][0] for c in pres]
a1.set_xticks(range(len(pres)), lb, rotation=30, ha='right', color=INK, fontsize=9); a1.set_yticks(range(len(pres)), lb, color=INK, fontsize=9)
for i in range(len(pres)):
    for j in range(len(pres)): a1.text(j, i, f'{cm[i, j]:.2f}', ha='center', va='center', fontsize=9, color='white' if cm[i, j] < .6 else 'black')
a1.set_xlabel('Predicted', color=MUT); a1.set_ylabel('Reference', color=MUT)
a1.set_title(f"Confusion matrix (row-normalised) · OA {m['oa']:.2f} · kappa {m['kappa']:.2f}", color=INK, loc='left', fontsize=11)
imp = sorted(m['importance'].items(), key=lambda x: x[1]); a2.barh([k for k, _ in imp], [v for _, v in imp], color='#66d5e8')
a2.set_facecolor(BG); a2.tick_params(colors=INK, labelsize=9)
for s in a2.spines.values(): s.set_color('#2a3442')
a2.set_title('Feature importance (mean decrease in impurity)', color=INK, loc='left', fontsize=11)
fig.text(.01, .005, f"Spatial hold-out: 30% of 1 km blocks never seen in training · {m['test_px']:,} test pixels", color=MUT, fontsize=8)
fig.tight_layout(rect=(0, .03, 1, 1)); fig.savefig(OUT + '/islamabad-rf-accuracy.png', facecolor=BG, bbox_inches='tight'); plt.close(fig)
th = I.fromarray((lut[pred] * 255).astype('uint8')); w2 = 800; h2 = int(w2 * H / W)
th.resize((w2, h2)).crop((0, 0, 800, 420)).save(OUT + '/islamabad-geoai-thumb.jpg', quality=86)
