"""Shared helpers: search Microsoft Planetary Computer STAC and read Sentinel-2 L2A / Impact Observatory LULC clips."""
import requests, json, numpy as np, rasterio
from rasterio.warp import transform_bounds, reproject, Resampling
from rasterio.windows import from_bounds
from shapely.geometry import shape, box
API='https://planetarycomputer.microsoft.com/api'
def token(c): return requests.get(f'{API}/sas/v1/token/{c}',timeout=60).json()['token']
def search(c,bb,dt,q=None):
    body={'collections':[c],'bbox':bb,'datetime':dt,'limit':200}
    if q: body['query']=q
    return requests.post(f'{API}/stac/v1/search',json=body,timeout=90).json()['features']
def s2(bb,dt,out,bands=('B02','B03','B04','B08','B11','B12','SCL'),maxcc=10):
    its=[i for i in search('sentinel-2-l2a',bb,dt,{'eo:cloud_cover':{'lt':maxcc}}) if shape(i['geometry']).contains(box(*bb))]
    its.sort(key=lambda i:i['properties']['eo:cloud_cover']); it=its[0]; print('S2',it['id'],it['properties']['eo:cloud_cover'])
    tk=token('sentinel-2-l2a'); arr=[]
    with rasterio.open(it['assets']['B04']['href']+'?'+tk) as s:
        b=transform_bounds('EPSG:4326',s.crs,*bb); w=from_bounds(*b,s.transform).round_offsets().round_lengths()
        tr=s.window_transform(w); crs=s.crs; H,W=int(w.height),int(w.width)
    for bn in bands:
        with rasterio.open(it['assets'][bn]['href']+'?'+tk) as s:
            arr.append(s.read(1,window=from_bounds(*b,s.transform),out_shape=(H,W),resampling=Resampling.nearest if bn=='SCL' else Resampling.bilinear).astype('uint16'))
    with rasterio.open(out,'w',driver='GTiff',height=H,width=W,count=len(bands),dtype='uint16',crs=crs,transform=tr,compress='deflate') as d: d.write(np.stack(arr))
    return it['id']
def lulc(ref_tif,bb,year,out):
    its=search('io-lulc-annual-v02',bb,f'{year}-01-01/{year}-12-31'); tk=token('io-lulc-annual-v02')
    with rasterio.open(ref_tif) as r: H,W,tr,crs=r.height,r.width,r.transform,r.crs
    lab=np.zeros((H,W),'uint8')
    for it in its:
        with rasterio.open(it['assets']['data']['href']+'?'+tk) as s:
            b=transform_bounds(crs,s.crs,*rasterio.transform.array_bounds(H,W,tr)); w=from_bounds(*b,s.transform).round_offsets().round_lengths()
            src=s.read(1,window=w,boundless=True,fill_value=0); t=s.window_transform(w)
            tmp=np.zeros((H,W),'uint8'); reproject(src,tmp,src_transform=t,src_crs=s.crs,dst_transform=tr,dst_crs=crs,resampling=Resampling.nearest,src_nodata=0,dst_nodata=0)
            lab=np.where(lab==0,tmp,lab)
    print('LULC items',len(its),np.unique(lab,return_counts=True))
    with rasterio.open(out,'w',driver='GTiff',height=H,width=W,count=1,dtype='uint8',crs=crs,transform=tr,compress='deflate') as d: d.write(lab,1)
