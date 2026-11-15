# Project source code

Scripts behind the case studies on [saifullah391.github.io](https://saifullah391.github.io/portfolio.html#work).

| Folder | Project | Scripts |
| --- | --- | --- |
| `bali/` | Land cover by regency, Bali (2024) | `bali_zonal.py` (ArcGIS Pro / arcpy workflow), `web_figures.py` (figures) |
| `islamabad/` | GeoAI: Random Forest land-cover classification, Islamabad | `download.py`, `rf_classify.py`, `metrics.json` |
| `karachi/` | Karachi coast: waterline and mangrove change, 2016–2024 | `download.py`, `coastline_mangroves.py`, `metrics.json` |
| `common/` | Shared Planetary Computer helpers | `stac.py` |

## Environment

`bali_zonal.py` runs in ArcGIS Pro's Python window (needs Spatial Analyst). The other scripts need Python 3.11+ with:

```
conda install -c conda-forge geopandas rasterio scikit-learn scipy matplotlib matplotlib-scalebar shapely requests pillow
```

Data come from Microsoft Planetary Computer (Sentinel-2 L2A, Impact Observatory 10 m LULC) and need no account.
Sentinel-2 scenes with processing baseline 04.00 or later carry a +1000 reflectance offset, which the scripts remove.
