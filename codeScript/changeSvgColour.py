import os
import re

def update_svg_color(directory, oldColour, newColour):
    # Clean the hex codes (remove # if present) to standardize
    clean_old = oldColour.lstrip('#')
    clean_new = newColour if newColour.startswith('#') else f"#{newColour}"

    # Regex breakdown:
    # (?i)       -> Case-insensitive matching
    # (fill|stroke) -> Matches either fill or stroke attributes
    # ="#?       -> Matches =" with an optional #
    # {clean_old} -> Specifically looks for your old hex value
    pattern = re.compile(rf'(?i)(fill|stroke)="#?{clean_old}"')

    files_updated = 0

    for filename in os.listdir(directory):
        if filename.endswith(".svg"):
            file_path = os.path.join(directory, filename)
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Check if our specific old color exists in the file
            if pattern.search(content):
                # Replace only the occurrences of the specific old color
                # We use \1 to keep whichever attribute (fill or stroke) was found
                new_content = pattern.sub(rf'\1="{clean_new}"', content)

                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                
                print(f"Updated {filename}: Replaced {oldColour} with {clean_new}")
                files_updated += 1

    print(f"\nTask Complete. {files_updated} files modified.")

# --- CONFIGURATION ---
folder_path = r"D:\\NovelVox\\nds-server\\webapps\\ROOT\\images\\NDS\\OracleHealthMillenniumCerner\\thumbnails"

OldColour = "#003b5d" 
NewColour = "#323539"

update_svg_color(folder_path, OldColour, NewColour)