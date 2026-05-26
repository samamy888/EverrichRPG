from PIL import Image
import sys

def find_floor_tile(path, tile_size=16):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    cols = w // tile_size
    rows = h // tile_size
    
    # We want a tile that is mostly solid and light colored (like a floor)
    candidates = []
    for r in range(rows):
        for c in range(cols):
            tile = img.crop((c * tile_size, r * tile_size, (c + 1) * tile_size, (r + 1) * tile_size))
            data = list(tile.getdata())
            # Skip if any transparency (though clean should be mostly opaque where there is content)
            if any(p[3] < 255 for p in data): continue
            
            # Calculate average color
            avg_r = sum(p[0] for p in data) // len(data)
            avg_g = sum(p[1] for p in data) // len(data)
            avg_b = sum(p[2] for p in data) // len(data)
            
            # Floor is usually light gray (e.g., > 200)
            if avg_r > 180 and avg_g > 180 and avg_b > 180:
                candidates.append((r * cols + c, (avg_r, avg_g, avg_b)))
                
    print(f"Top 10 Light candidates: {candidates[:10]}")

if __name__ == "__main__":
    find_floor_tile(sys.argv[1])
