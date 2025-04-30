import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import https from 'https';
import url from 'url';

const prisma = new PrismaClient();

// Configuration
const BATCH_SIZE = 100;
const PROGRESS_FILE = 'image-migration-progress.json';

// Progress tracking interface
interface ProgressData {
  images: {
    completed: boolean;
    total: number;
    processed: number;
    successful: number;
    failed: number;
    lastProcessedId: number;
    batchSize: number;
    startTime: string;
    lastUpdateTime: string;
  };
}

// Create /files directory if it doesn't exist
const filesDir = path.join(process.cwd(), 'files');
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
}

// Load progress data from file
function loadProgressData(): ProgressData {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading progress file:', error);
    }
  }

  // Create default progress data
  return {
    images: {
      completed: false,
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      lastProcessedId: 0,
      batchSize: BATCH_SIZE,
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString()
    }
  };
}

// Save progress data to file
function saveProgressData(progress: ProgressData) {
  progress.images.lastUpdateTime = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

  // If completed, create a backup with timestamp
  if (progress.images.completed) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    fs.copyFileSync(
      PROGRESS_FILE,
      `${PROGRESS_FILE}.completed_${timestamp}`
    );
  }
}

// Download an image from a URL
async function downloadImage(imageUrl: string, destinationPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Skip if the file already exists
    if (fs.existsSync(destinationPath)) {
      console.log(`File already exists: ${destinationPath}`);
      return resolve(true);
    }

    // Skip invalid URLs
    if (!imageUrl || !imageUrl.startsWith('http')) {
      console.log(`Invalid URL: ${imageUrl}`);
      return resolve(false);
    }

    const file = fs.createWriteStream(destinationPath);

    https.get(imageUrl, {
      rejectUnauthorized: false // Bypass certificate verification
    }, (response) => {
      if (response.statusCode !== 200) {
        console.error(`Failed to download: ${imageUrl} (Status: ${response.statusCode})`);
        if (fs.existsSync(destinationPath)) {
          fs.unlinkSync(destinationPath); // Remove partial file
        }
        return resolve(false);
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${destinationPath}`);
        resolve(true);
      });
    }).on('error', (err) => {
      if (fs.existsSync(destinationPath)) {
        fs.unlinkSync(destinationPath); // Remove partial file
      }
      console.error(`Error downloading ${imageUrl}: ${err.message}`);
      resolve(false);
    });
  });
}

// Main function to process validations in batches
async function updateValidationImages() {
  // Load progress data
  const progress = loadProgressData();

  try {
    if (progress.images.completed) {
      console.log('Migration already completed according to progress file.');
      return;
    }

    // Get total count of validations with validacioneshn.com in URL if not already counted
    if (progress.images.total === 0) {
      const count = await prisma.validation.count({
        where: {
          imageUrl: {
            contains: 'validacioneshn.com'
          }
        }
      });

      progress.images.total = count;
      saveProgressData(progress);

      console.log(`Found ${count} validations with validacioneshn.com URLs`);
    } else {
      console.log(`Resuming migration: ${progress.images.processed}/${progress.images.total} processed`);
    }

    // Process in batches until all are done
    let continueProcessing = true;

    while (continueProcessing) {
      // Get next batch of validations
      const validations = await prisma.validation.findMany({
        where: {
          id: { gt: progress.images.lastProcessedId },
          imageUrl: {
            contains: 'validacioneshn.com'
          }
        },
        orderBy: { id: 'asc' },
        take: progress.images.batchSize
      });

      if (validations.length === 0) {
        // No more validations to process
        progress.images.completed = true;
        saveProgressData(progress);
        continueProcessing = false;
        console.log('All validations processed successfully!');
        break;
      }

      console.log(`Processing batch of ${validations.length} validations...`);

      // Process each validation in this batch
      for (const validation of validations) {
        progress.images.lastProcessedId = validation.id;

        if (!validation.imageUrl) {
          progress.images.processed++;
          continue;
        }

        // Parse the URL to get the filename
        const parsedUrl = url.parse(validation.imageUrl);
        if (!parsedUrl.pathname) {
          progress.images.processed++;
          progress.images.failed++;
          continue;
        }

        const filename = path.basename(parsedUrl.pathname);
        const newFilePath = path.join(filesDir, filename);

        // Download the image
        const success = await downloadImage(validation.imageUrl, newFilePath);

        if (success) {
          // Update the image URL in the database
          const newImageUrl = validation.imageUrl.replace(
            'validacioneshn.com/api/validation/files/',
            'satt.transporte.gob.hn:5702/files/'
          );

          await prisma.validation.update({
            where: { id: validation.id },
            data: { imageUrl: newImageUrl }
          });

          console.log(`Updated validation ID ${validation.id}: ${validation.imageUrl} → ${newImageUrl}`);
          progress.images.successful++;
        } else {
          console.error(`Failed to process validation ID ${validation.id}`);
          progress.images.failed++;
        }

        progress.images.processed++;

        // Save progress every 10 items
        if (progress.images.processed % 10 === 0) {
          saveProgressData(progress);

          // Log progress percentage
          const percent = ((progress.images.processed / progress.images.total) * 100).toFixed(2);
          console.log(`Progress: ${progress.images.processed}/${progress.images.total} (${percent}%)`);
        }
      }

      // Save progress after each batch
      saveProgressData(progress);
    }

    console.log('\nFinal Summary:');
    console.log(`Total: ${progress.images.total}`);
    console.log(`Processed: ${progress.images.processed}`);
    console.log(`Successful: ${progress.images.successful}`);
    console.log(`Failed: ${progress.images.failed}`);

    // Mark as completed
    if (progress.images.processed >= progress.images.total) {
      progress.images.completed = true;
      saveProgressData(progress);
    }

  } catch (error) {
    console.error('Error processing validations:', error);
    saveProgressData(progress); // Save progress even if there's an error
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateValidationImages()
  .then(() => console.log('Done!'))
  .catch(console.error);
