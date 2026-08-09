import xml.etree.ElementTree as ET
import os

def batch_update_svgs(input_dir, target_color, bypass_colors):
    # Setup directory paths
    
    output_dir = os.path.join(input_dir, "modified_svgs")
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Register namespace to keep the SVG tags clean
    ET.register_namespace('', "http://www.w3.org/2000/svg")
    
    bypass_colors = [c.lower() for c in bypass_colors]
    files_processed = 0

    for filename in os.listdir(input_dir):
        if filename.endswith(".svg"):
            file_path = os.path.join(input_dir, filename)
            
            tree = ET.parse(file_path)
            root = tree.getroot()

            # Process every element in the file
            for elem in root.iter():
                for attr in ['fill', 'stroke']:
                    val = elem.get(attr)
                    if val and val.lower() != 'none':
                        if val.lower() not in bypass_colors:
                            elem.set(attr, target_color)

            # Save to the output folder
            output_path = os.path.join(output_dir, filename)
            tree.write(output_path, encoding='utf-8', xml_declaration=True)
            print(f"Processed: {filename}")
            files_processed += 1

    print(f"\nDone! {files_processed} files saved to: {output_dir}")

# --- Settings ---
NEW_COLOR = "#323539"  # Your target color
BYPASS = [
    "#ffffff",
    "#7C7E81", 
    "#323539",
    "#adb8c4",
    "#0b5cff",
    "#fff",
    "#a4a4a4",
    "#3ea155", 
    "#9fa7af",
    "#a12"
] # Colors to ignore

TARGET_DIR = "D:\\NovelVox\\nds-server\\webapps\\ROOT\\images\\NDS\\OracleHealthMillenniumCerner";


if __name__ == "__main__":
    
    batch_update_svgs(TARGET_DIR,NEW_COLOR, BYPASS)