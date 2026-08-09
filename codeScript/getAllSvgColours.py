import re
import sys
from pathlib import Path

def extract_colors(target_dir):
    # Regex for Hex and RGB/RGBA
    color_pattern = re.compile(r'#(?:[0-9a-fA-F]{3}){1,2}\b|rgba?\([^\)]+\)', re.IGNORECASE)
    
    unique_colors = set()
    root_path = Path(target_dir)

    if not root_path.is_dir():
        print(f"Error: {target_dir} is not a valid directory.")
        return

    # Recursive search
    for path in root_path.rglob('*.svg'):
        try:
            content = path.read_text(encoding='utf-8', errors='ignore')
            matches = color_pattern.findall(content)
            for match in matches:
                unique_colors.add(match.lower())
        except Exception as e:
            print(f"Could not read {path.name}: {e}")

    print(f"Found {len(unique_colors)} unique colors in: {root_path.absolute()}")
    for color in sorted(unique_colors):
        print(color)

if __name__ == "__main__":
    # You can hardcode it here: target = "C:/Users/Documents/Icons"
    # Or take it from the command line:
    if len(sys.argv) > 1:
        extract_colors(sys.argv[1])
    else:
        print("Usage: python script_name.py /path/to/your/svgs")