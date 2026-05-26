from PIL import Image
import json
import os

def convert_floorplan(input_path, output_path, tile_size=16):
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    
    # We want to map this to a grid. 
    # Since the image is 6000x3472, a 16x16 grid would be 375x217.
    cols = w // tile_size
    rows = h // tile_size
    
    # Indices (Phaser GID = Index + 1)
    FLOOR_LANDSIDE = 1
    FLOOR_AIRSIDE = 2
    WALL_BUILDING = 3
    WALL_OUTDOOR = 4 # Windows
    WALL_SHOP = 5
    WALL_PILLAR = 6
    
    data = []
    
    for r in range(rows):
        row_data = []
        for c in range(cols):
            # --- 區域抽樣 ---
            wall_votes = 0
            blue_votes = 0
            white_votes = 0
            outdoor_votes = 0
            total_samples = 16
            
            for sy in range(4):
                for sx in range(4):
                    px = c * tile_size + (sx * 4 + 2)
                    py = r * tile_size + (sy * 4 + 2)
                    if px >= w or py >= h: continue
                    r_val, g_val, b_val, a_val = img.getpixel((px, py))
                    
                    if r_val > 240 and g_val > 240 and b_val > 240:
                        white_votes += 1
                    elif b_val > r_val + 10 and b_val > g_val + 5 and r_val > 180:
                        blue_votes += 1
                    elif abs(r_val - g_val) < 10 and abs(r_val - b_val) < 10:
                        if r_val < 160: wall_votes += 1
                        else: outdoor_votes += 1

            # 決定最終瓦片
            if wall_votes > 6:
                # 簡單的店面偵測：如果牆壁靠近地板，可能是店面
                row_data.append(WALL_BUILDING)
            elif outdoor_votes > 6:
                row_data.append(WALL_OUTDOOR)
            elif blue_votes > 8:
                row_data.append(FLOOR_AIRSIDE)
            elif white_votes > 8:
                row_data.append(FLOOR_LANDSIDE)
            else:
                row_data.append(WALL_BUILDING)
                
        data.extend(row_data)

    # Build Phaser Tilemap JSON format
    tilemap_json = {
        "compressionlevel": -1,
        "height": rows,
        "infinite": False,
        "layers": [
            {
                "data": data,
                "height": rows,
                "id": 1,
                "name": "BaseArchitecture",
                "opacity": 1,
                "type": "tilelayer",
                "visible": True,
                "width": cols,
                "x": 0,
                "y": 0
            }
        ],
        "nextlayerid": 2,
        "nextobjectid": 1,
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "tiledversion": "1.10.2",
        "tileheight": 16,
        "tilesets": [
            {
                "columns": 8, 
                "firstgid": 1,
                "image": "pro_tiles_v2.png",
                "imagewidth": 128,
                "imageheight": 16,
                "margin": 0,
                "name": "pro-tiles-v2",
                "spacing": 0,
                "tilecount": 8,
                "tilewidth": 16,
                "tileheight": 16
            }
        ],
        "tilewidth": 16,
        "type": "map",
        "version": "1.10",
        "width": cols
    }

    with open(output_path, 'w') as f:
        json.dump(tilemap_json, f)
    
    print(f"Tilemap JSON created: {output_path} ({cols}x{rows})")

if __name__ == "__main__":
    convert_floorplan("public/map/TPE/TPE-11.png", "public/map/TPE2/tpe2_lobby.json")
