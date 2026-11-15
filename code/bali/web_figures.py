"""Web figures for the Bali land-cover case study, made from the outputs of bali_zonal.py (Bali_Zonal.gdb and lc_tiles)."""
import matplotlib; matplotlib.use("Agg")
import matplotlib.patheffects
import glob, numpy as np, rasterio, geopandas as gpd, pyogrio, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap, BoundaryNorm
from matplotlib.patches import Patch
from rasterio.merge import merge
from rasterio.mask import mask
from matplotlib_scalebar.scalebar import ScaleBar
G=r'C:\GIS\Bali_Zonal\Bali_Zonal.gdb'; OUT=r'C:\Users\saifu\Documents\Codex\Saif-Ullah-Portfolio-GitHub\assets\img'
BG='#0c1119'; INK='#e8eef4'; MUT='#9aa8b8'
C={1:('Water',(65,155,223)),2:('Trees',(57,125,73)),4:('Flooded vegetation',(122,135,198)),5:('Crops',(228,150,53)),7:('Built area',(196,40,27)),8:('Bare ground',(165,155,143)),10:('Clouds',(97,97,97)),11:('Rangeland',(227,226,195))}
reg=gpd.read_file(G,layer='Bali_LandCover_2024'); print(reg.crs); print([c for c in reg.columns])
srcs=[rasterio.open(t) for t in glob.glob(r'C:\GIS\Bali_Zonal\lc_tiles\*.tif')]
arr,tr=merge(srcs,nodata=0); arr=arr[:, ::3, ::3]; tr=tr*rasterio.Affine.scale(3)
a=arr[0]
from rasterio.io import MemoryFile
prof=dict(driver='GTiff',height=a.shape[0],width=a.shape[1],count=1,dtype='uint8',crs=srcs[0].crs,transform=tr,nodata=0)
with MemoryFile() as mf:
    with mf.open(**prof) as d: d.write(a,1)
    with mf.open() as d: m,mt=mask(d,reg.to_crs(d.crs).geometry,nodata=0,crop=True)
a=m[0]; h,w=a.shape
ext=(mt.c, mt.c+mt.a*w, mt.f+mt.e*h, mt.f)
vals=sorted(v for v in C if (a==v).any()); print('classes',vals)
lut=np.zeros((256,4)); 
for v,(n,c) in C.items(): lut[v,:3]=np.array(c)/255; lut[v,3]=1
rgba=lut[a]
def frame(ax):
    ax.set_xlabel(''); ax.set_ylabel('')
    ax.set_facecolor(BG); ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values(): s.set_color('#2a3442')
# Figure 1: LULC map
fig,ax=plt.subplots(figsize=(12,8.4),dpi=150,facecolor=BG); frame(ax)
ax.imshow(rgba,extent=ext,interpolation='nearest')
reg.to_crs(srcs[0].crs).boundary.plot(ax=ax,color='white',lw=.7,alpha=.85)
for _,r in reg.to_crs(srcs[0].crs).iterrows():
    p=r.geometry.representative_point(); ax.text(p.x,p.y,r['shapeName'],color='white',fontsize=8,ha='center',va='center',fontweight='bold',path_effects=[matplotlib.patheffects.withStroke(linewidth=2.2,foreground='#111')])
ax.legend(handles=[Patch(color=np.array(C[v][1])/255,label=C[v][0]) for v in vals],loc='lower left',frameon=True,facecolor='#101722',edgecolor='#2a3442',labelcolor=INK,fontsize=9,title='Land cover 2024',title_fontsize=9)
ax.get_legend().get_title().set_color(INK)
ax.add_artist(ScaleBar(1,location='lower right',box_color='#101722',color=INK,box_alpha=.85,font_properties={'size':8}))
ax.annotate('N',xy=(.96,.93),xycoords='axes fraction',ha='center',color=INK,fontsize=12,fontweight='bold')
ax.annotate('',xy=(.96,.92),xytext=(.96,.84),xycoords='axes fraction',arrowprops=dict(arrowstyle='-|>',color=INK,lw=1.5))
ax.set_title('Land use / land cover of Bali, Indonesia (2024)',color=INK,fontsize=15,loc='left',pad=12)
fig.text(.125,.035,'Data: Esri Sentinel-2 10 m Land Use/Land Cover (Impact Observatory) · Boundaries: geoBoundaries ADM2 · Projection: WGS 84 / UTM 50S · Shown at 30 m',color=MUT,fontsize=8)
ax.set_xlabel('');ax.set_ylabel('')
fig.savefig(OUT+r'\bali-lulc-2024.png',facecolor=BG,bbox_inches='tight'); plt.close(fig)
# Figure 2: stacked bar % by regency + tree-cover choropleth
pc=[c for c in reg.columns if c.endswith('_pct')]; print(reg[['shapeName']+pc].round(1).to_string())
names={'Water':1,'Trees':2,'FloodVeg':4,'Crops':5,'Built':7,'Bare':8,'Clouds':10,'Range':11}
r2=reg.sort_values('Built_pct')
fig,(ax1,ax2)=plt.subplots(1,2,figsize=(14,6.6),dpi=150,facecolor=BG,gridspec_kw={'width_ratios':[1.25,1]})
left=np.zeros(len(r2))
for c in pc:
    k=c[:-4]; v=names[k]; vals_=r2[c].fillna(0).values
    if vals_.sum()==0: continue
    ax1.barh(r2['shapeName'],vals_,left=left,color=np.array(C[v][1])/255,label=C[v][0],height=.7); left+=vals_
ax1.set_facecolor(BG); ax1.tick_params(colors=INK,labelsize=9); ax1.set_xlim(0,100); ax1.set_xlabel('% of regency area',color=MUT)
for s in ax1.spines.values(): s.set_color('#2a3442')
ax1.legend(loc='upper center',bbox_to_anchor=(.5,-.12),ncol=4,frameon=False,labelcolor=INK,fontsize=8)
ax1.set_title('Land cover share by regency (Tabulate Area)',color=INK,loc='left',fontsize=12)
frame(ax2); rr=reg.to_crs(32750)
rr.plot(column='Built_pct',ax=ax2,cmap='OrRd',edgecolor='white',linewidth=.6,legend=True,legend_kwds={'shrink':.6,'label':'Built area (%)'})
cb=fig.axes[-1]; cb.tick_params(colors=INK,labelsize=8); cb.yaxis.label.set_color(INK)
ax2.set_xlabel('');ax2.set_ylabel('');ax2.set_title('Built-up share by regency',color=INK,loc='left',fontsize=12)
fig.text(.01,.01,'Source: zonal statistics on Esri Sentinel-2 10 m LULC 2024, computed in ArcGIS Pro (arcpy Tabulate Area).',color=MUT,fontsize=8)
fig.tight_layout(); fig.savefig(OUT+r'\bali-zonal-stats.png',facecolor=BG,bbox_inches='tight'); plt.close(fig)
