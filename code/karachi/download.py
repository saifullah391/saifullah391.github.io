"""Download two Sentinel-2 L2A clips (Dec 2016, Oct 2024, same relative orbit) of the Karachi coast.
Usage:  python download.py <output_folder>
"""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'common'))
import stac
D = sys.argv[1]; os.makedirs(D, exist_ok=True)
BB = [67.05, 24.72, 67.32, 24.88]  # Clifton, DHA, Korangi and Phitti creeks (lon/lat)
a = stac.s2(BB, '2016-11-01/2017-01-31', D + '/s2_2016.tif', bands=('B03', 'B04', 'B08', 'B11', 'SCL'), maxcc=5)
b = stac.s2(BB, '2024-10-01/2025-02-28', D + '/s2_2024.tif', bands=('B03', 'B04', 'B08', 'B11', 'SCL'), maxcc=5)
json.dump({'early': a, 'late': b}, open(D + '/items.json', 'w'))
