const https = require('https');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

const repoOwner = 'lanmower'; // Repository owner's username
const repoName = 'bolt.new'; // Repository name
const outputFile = `${repoName}.zip`;

// Remove the zip file if it exists
if (fs.existsSync(outputFile)) {
  fs.unlinkSync(outputFile);
}

const url = `https://github.com/${repoOwner}/${repoName}/archive/refs/heads/main.zip`;

// Function to download the file
function downloadFile(url, outputPath) {
  const file = fs.createWriteStream(outputPath);
  https.get(url, (response) => {
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
  });
}

// Function to unzip the downloaded file
function unzipFile(zipFilePath) {
  const tempDir = path.join(__dirname, 'temp'); // Temporary directory for extraction
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

  fs.readdir(extractedDir, (err, files) => {
    if (err) {
      console.error(`Error reading extracted directory: ${err.message}`);
      return;
    }
    files.forEach(file => {
      const oldPath = path.join(extractedDir, file);
      const newPath = path.join(__dirname, file);
      fs.rename(oldPath, newPath, (err) => {
        if (err) {
          console.error(`Error moving file: ${err.message}`);
        } else {
          console.log(`Moved ${file} to ${__dirname}`);
        }
      });
    });
    fs.rmdirSync(extractedDir); // Remove the extracted directory after moving files
    fs.rmdirSync(tempDir); // Remove the temporary directory
  });
}

// Start the download
downloadFile(url, outputFile);
