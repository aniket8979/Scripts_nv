import os
import zipfile

def unzip_everything():
    # Get the current working directory where the terminal is open
    current_dir = os.getcwd()
    files = [f for f in os.listdir(current_dir) if f.endswith('.zip')]
    
    if not files:
        print(f"No zip files found in {current_dir}")
        return

    for file in files:
        file_path = os.path.join(current_dir, file)
        # Create a folder name by removing '.zip'
        folder_name = os.path.splitext(file)[0]
        extract_path = os.path.join(current_dir, folder_name)
        
        # Ensure we don't overwrite or crash if folder exists
        if not os.path.exists(extract_path):
            os.makedirs(extract_path)
            
        print(f"Unpacking {file}...")
        try:
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(extract_path)
        except Exception as e:
            print(f"Failed to unzip {file}: {e}")

if __name__ == "__main__":
    unzip_everything()