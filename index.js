const https = require('https');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper'); 
console.log('Process arguments:', process.argv);
const repoOwner = process.argv[2]; // Repository owner's username
const repoName = process.argv[3]; // Repository name
const outputFile = `${repoName}.zip`;
console.log(`Output file will be: ${outputFile}`);

// Remove the zip file if it exists
if (fs.existsSync(outputFile)) {
  console.log(`Removing existing zip file: ${outputFile}`);
  fs.unlinkSync(outputFile);
} else {
  console.log(`No existing zip file found: ${outputFile}`);
}

const url = `https://github.com/${repoOwner}/${repoName}/archive/refs/heads/main.zip`;
console.log(`Download URL: ${url}`);

// Function to download the file
function downloadFile(url, outputPath) {
  console.log('Starting download, writing to', outputPath);
  const file = fs.createWriteStream(outputPath);
  https.get(url, (response) => {
    console.log(`Received response with status code: ${response.statusCode}`);
    if (response.statusCode === 404) {
      console.error(`Error: Repository not found (404)`);
      fs.unlinkSync(outputPath); // Delete the file if it was created
      process.exit(1); // Exit the process with an error code
      return;
    }
    // Follow redirects
    if (response.statusCode >= 300 && response.statusCode < 400) {
      const redirectUrl = response.headers.location;
      console.log(`Redirecting to: ${redirectUrl}`);
      downloadFile(redirectUrl, outputPath); // Call downloadFile recursively with the new URL
      return;
    }
    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        console.log(`Downloaded ${outputPath}`);
        unzipFile(outputPath);
      });
    });
  }).on('error', (err) => {
    fs.unlink(outputPath); // Delete the file on error
    console.error(`Error downloading file: ${err.message}`);
    process.exit(1); // Exit the process with an error code
  });
}

// Function to unzip the downloaded file
function unzipFile(zipFilePath) {
  const tempDir = 'temp'; // Temporary directory for extraction
  console.log(`Creating temporary directory: ${tempDir}`);
  fs.mkdirSync(tempDir, { recursive: true });

  fs.createReadStream(zipFilePath)
    .pipe(unzipper.Extract({ path: tempDir }))
    .on('close', () => {
      console.log(`Repository unzipped to ${tempDir}`);
      moveFiles(tempDir);
      fs.unlinkSync(zipFilePath); // Remove the zip file after extraction
    });
}

// Function to move files from temp directory to current directory
function moveFiles(tempDir) {
  const extractedDir = path.join(tempDir, `${repoName}-main`); // Path to the extracted directory
  console.log(`Moving files from ${extractedDir} to current directory`);

  fs.readdir(extractedDir, (err, files) => {
    if (err) {
      console.error(`Error reading extracted directory: ${err.message}`);
      process.exit(1); // Exit the process with an error code
      return;
    }
    console.log(`Files found in extracted directory: ${files}`);
    files.forEach(file => {
      const oldPath = path.join(extractedDir, file);
      const newPath = path.join(file);
      console.log(`Moving file from ${oldPath} to ${newPath}`);
      fs.rename(oldPath, newPath, (err) => {
        if (err) {
          console.error(`Error moving file: ${err.message}`);
        } else {
          console.log(`Moved ${file} to ./`);
        }
      });
    });
    console.log(`Removed extracted directory: ${extractedDir}`);
    fs.rmdir(tempDir, { recursive: true }, (err) => {
      if (err) {
        console.error(`Error removing temporary directory: ${err.message}`);
      } else {
        console.log(`Removed temporary directory: ${tempDir}`);
      }
      console.log('Process completed successfully.'); // Added message to indicate completion
      process.exit(0); // Exit the process successfully
    });
  });
}

// Start the download
downloadFile(url, outputFile);
