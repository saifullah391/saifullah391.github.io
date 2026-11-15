"""Download a Sentinel-2 L2A clip and Impact Observatory 10 m LULC labels for Islamabad.
Usage:  python download.py <output_folder>
"""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'common'))
import stac
D = sys.argv[1]; os.makedirs(D, exist_ok=True)
BB = [72.92, 33.58, 73.22, 33.78]  # Islamabad and Margalla Hills (lon/lat)
sid = stac.s2(BB, '2024-10-01/2024-12-31', D + '/s2.tif', maxcc=5)
json.dump({'id': sid}, open(D + '/item.json', 'w'))
stac.lulc(D + '/s2.tif', BB, 2024, D + '/lab.tif')
