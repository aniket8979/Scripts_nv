(async () => {
  const blobUrl = "blob:https://docs.google.com/703667a8-e061-4afa-91a5-a917ea712958";
  
  try {
    // Fetch the data from the blob URL
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    
    // Create a local object URL for the downloaded blob
    const downloadUrl = URL.createObjectURL(blob);
    
    // Create a temporary link element to trigger the download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'downloaded_image.png'; // Change extension if it's a jpeg/gif
    
    // Append to body, click, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
        
    console.log("Download triggered successfully!");
  } catch (error) {
    console.error("Failed to download blob. Ensure you are running this code on the exact same browser tab/origin where the blob was generated.", error);
  }
})();