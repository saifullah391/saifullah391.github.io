# Land cover by regency (zonal analysis) - Bali, Indonesia
# Run inside ArcGIS Pro's Python window:
#   exec(open(r"C:\GIS\Bali_Zonal\bali_zonal.py").read())

import arcpy, os
from arcpy.sa import ExtractByMask, TabulateArea

arcpy.CheckOutExtension("Spatial")

FOLDER = r"C:\GIS\Bali_Zonal"
GDB = os.path.join(FOLDER, "Bali_Zonal.gdb")
YEAR = 2024
LC_URL = "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer"
UTM = arcpy.SpatialReference(32750)  # WGS 84 / UTM zone 50S

CLASSES = {  # value: (field prefix, label, colour)
    1: ("Water", "Water", (65, 155, 223)),
    2: ("Trees", "Trees", (57, 125, 73)),
    4: ("FloodVeg", "Flooded vegetation", (122, 135, 198)),
    5: ("Crops", "Crops", (228, 150, 53)),
    7: ("Built", "Built area", (196, 40, 27)),
    8: ("Bare", "Bare ground", (165, 155, 143)),
    9: ("Snow", "Snow/ice", (168, 235, 255)),
    10: ("Clouds", "Clouds", (97, 97, 97)),
    11: ("Range", "Rangeland", (227, 226, 195)),
}
BALI = ["Badung", "Bangli", "Buleleng", "Gianyar", "Jembrana",
        "Karang Asem", "Klungkung", "Kota Denpasar", "Tabanan"]

def log(msg):
    print(msg)
    arcpy.AddMessage(msg)

if not arcpy.Exists(GDB):
    arcpy.management.CreateFileGDB(FOLDER, "Bali_Zonal.gdb")
arcpy.env.workspace = GDB
arcpy.env.overwriteOutput = True
arcpy.env.addOutputsToMap = False   # keep intermediate layers off your other maps

# 1. Zones: Bali regencies, projected to UTM 50S
log("1/5 Preparing Bali regency boundaries...")
if not arcpy.Exists("Bali_Regencies"):
    arcpy.conversion.JSONToFeatures(os.path.join(FOLDER, "IDN_ADM2.geojson"), "IDN_ADM2", "POLYGON")
    where = "shapeName IN ({})".format(",".join("'{}'".format(n) for n in BALI))
    arcpy.analysis.Select("IDN_ADM2", "Bali_Regencies_WGS84", where)
    arcpy.management.Project("Bali_Regencies_WGS84", "Bali_Regencies", UTM)
log("   regencies: {}".format(arcpy.management.GetCount("Bali_Regencies")[0]))

# 2. Land cover: Living Atlas Sentinel-2 10 m LULC, raw class values (template None)
log("2/5 Mosaicking {} land cover tiles (10 m) downloaded from Esri Living Atlas...".format(YEAR))
# Tiles were exported from the Sentinel2_10m_LandCover image service (Year = 2024,
# raw class values, UTM 50S, 10 m) into C:\GIS\Bali_Zonal\lc_tiles
tile_dir = os.path.join(FOLDER, "lc_tiles")
tiles = [os.path.join(tile_dir, t) for t in os.listdir(tile_dir) if t.endswith(".tif")]
log("   tiles: {}".format(len(tiles)))
arcpy.management.MosaicToNewRaster(tiles, GDB, "lc_mosaic", UTM, "8_BIT_UNSIGNED",
                                   10, 1, "FIRST")
lc_name = "Bali_LULC_{}".format(YEAR)
with arcpy.EnvManager(cellSize=10, snapRaster="lc_mosaic"):
    ExtractByMask("lc_mosaic", "Bali_Regencies").save(os.path.join(GDB, lc_name))
arcpy.management.Delete("lc_mosaic")
arcpy.management.BuildRasterAttributeTable(lc_name, "Overwrite")

# colour map so the raster displays with the standard legend colours
clr = os.path.join(FOLDER, "lulc.clr")
with open(clr, "w") as f:
    for v, (_, _, (r, g, b)) in CLASSES.items():
        f.write("{} {} {} {}\n".format(v, r, g, b))
arcpy.management.AddColormap(lc_name, None, clr)

# 3. Zonal analysis: area of each class in each regency
log("3/5 Running Tabulate Area...")
TabulateArea("Bali_Regencies", "shapeName", lc_name, "Value", "LULC_by_Regency", 10)

# 4. Hectares and percentages on a copy of the regencies
log("4/5 Calculating hectares and percentages...")
arcpy.management.CopyFeatures("Bali_Regencies", "Bali_LandCover_{}".format(YEAR))
out_fc = "Bali_LandCover_{}".format(YEAR)
tab_fields = [f.name for f in arcpy.ListFields("LULC_by_Regency")]
zone_field = [f for f in tab_fields if f.upper() == "SHAPENAME"][0]
present = sorted(v for v in CLASSES if "VALUE_{}".format(v) in tab_fields)

new_fields = [("Total_ha", "Total area (ha)")]
for v in present:
    p, label, _ = CLASSES[v]
    new_fields += [("{}_ha".format(p), "{} (ha)".format(label)),
                   ("{}_pct".format(p), "{} (%)".format(label))]
for name, alias in new_fields:
    arcpy.management.AddField(out_fc, name, "DOUBLE", field_alias=alias)

areas = {}
with arcpy.da.SearchCursor("LULC_by_Regency",
                           [zone_field] + ["VALUE_{}".format(v) for v in present]) as cur:
    for row in cur:
        areas[row[0]] = dict(zip(present, row[1:]))

upd_fields = ["shapeName"] + [n for n, _ in new_fields]
with arcpy.da.UpdateCursor(out_fc, upd_fields) as cur:
    for row in cur:
        a = areas.get(row[0], {})
        total = sum(a.values()) / 10000.0
        vals = [total]
        for v in present:
            ha = a.get(v, 0) / 10000.0
            vals += [round(ha, 1), round(100.0 * ha / total, 1) if total else 0]
        cur.updateRow([row[0]] + vals)

# 5. New map with styled layers
log("5/5 Adding results to a new map...")
aprx = arcpy.mp.ArcGISProject("CURRENT")
m = aprx.createMap("Bali Land Cover {}".format(YEAR))
m.addBasemap("Light Gray Canvas")
m.addDataFromPath(os.path.join(GDB, lc_name))
zones = m.addDataFromPath(os.path.join(GDB, out_fc))
sym = zones.symbology
sym.updateRenderer("GraduatedColorsRenderer")
sym.renderer.classificationField = "Trees_pct"
sym.renderer.breakCount = 5
ramps = aprx.listColorRamps("Greens (5 Classes)")
if ramps:
    sym.renderer.colorRamp = ramps[0]
zones.symbology = sym
zones.transparency = 20
lc_lyr = m.listLayers(lc_name)[0]
lc_lyr.visible = False

# Summary
log("\nLand cover {} by regency (% of area):".format(YEAR))
hdr = ["Regency".ljust(15)] + [CLASSES[v][0][:8].rjust(9) for v in present]
log("".join(hdr))
with arcpy.da.SearchCursor(out_fc, ["shapeName"] + ["{}_pct".format(CLASSES[v][0]) for v in present],
                           sql_clause=(None, "ORDER BY shapeName")) as cur:
    for row in cur:
        log(row[0].ljust(15) + "".join("{:9.1f}".format(x or 0) for x in row[1:]))
log("\nDone. Open the map tab 'Bali Land Cover {}'. Outputs are in {}".format(YEAR, GDB))
