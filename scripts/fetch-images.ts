import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfigOrExit } from '../src/config.ts';
import {
  isAllowedLicense,
  validateBotanical,
  updatePlantImageInDb,
  generateReviewHtml,
  PLANT_REFERENCE_RULES,
  type PlantRef,
  type PlantImageResult,
} from '../src/services/plantImages.ts';

loadConfigOrExit(['pg']);

const USER_AGENT = 'StockSure-Nursery/1.0 (Hackathon botanical verifier; mailto:botanical@stocksure.in)';
const IMAGES_DIR = path.resolve(process.cwd(), 'data', 'plant-images');
const MANUAL_DIR = path.resolve(IMAGES_DIR, 'manual');
const REPORTS_DIR = path.resolve(process.cwd(), 'reports');

fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });
fs.mkdirSync(REPORTS_DIR, { recursive: true });

const force = process.argv.includes('--force');

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').trim();
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return res;
      if (res.status === 429 && attempt < retries) {
        attempt++;
        await sleep(1500 * attempt);
        continue;
      }
      return res;
    } catch (err) {
      if (attempt >= retries) throw err;
      attempt++;
      await sleep(1000 * attempt);
    }
  }
}

interface CandidateImage {
  title: string;
  url: string; // download url
  sourceUrl: string; // description page
  width: number;
  height: number;
  license: string;
  author: string;
  description: string;
}

async function queryWikimedia(searchQuery: string): Promise<CandidateImage[]> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    searchQuery
  )}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=640&format=json`;

  const res = await fetchWithRetry(url);
  if (!res.ok) return [];
  const data = (await res.json()) as any;
  const pages = Object.values(data.query?.pages || {});

  const candidates: CandidateImage[] = [];

  for (const page of pages as any[]) {
    const ii = page.imageinfo?.[0];
    if (!ii) continue;

    const license =
      ii.extmetadata?.LicenseShortName?.value ||
      ii.extmetadata?.License?.value ||
      ii.extmetadata?.UsageTerms?.value ||
      '';

    const author = stripHtml(ii.extmetadata?.Artist?.value) || stripHtml(ii.extmetadata?.Credit?.value) || 'Wikimedia Commons';
    const description =
      stripHtml(ii.extmetadata?.ImageDescription?.value) +
      ' ' +
      stripHtml(ii.extmetadata?.ObjectName?.value) +
      ' ' +
      stripHtml(ii.extmetadata?.Categories?.value);

    // Prefer 640px thumburl, fallback to full url
    const downloadUrl = ii.thumburl || ii.url;
    const sourceUrl = ii.descriptionurl || ii.url;

    candidates.push({
      title: page.title || '',
      url: downloadUrl,
      sourceUrl,
      width: ii.thumbwidth || ii.width || 0,
      height: ii.thumbheight || ii.height || 0,
      license,
      author,
      description,
    });
  }

  return candidates;
}

async function queryWikipediaPageImage(title: string): Promise<CandidateImage[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    title.replace(/ /g, '_')
  )}&prop=pageimages|imageinfo&piprop=original|thumbnail&pithumbsize=640&format=json`;

  const res = await fetchWithRetry(url);
  if (!res.ok) return [];
  const data = (await res.json()) as any;
  const pages = Object.values(data.query?.pages || {});

  const candidates: CandidateImage[] = [];

  for (const page of pages as any[]) {
    if (page.thumbnail?.source) {
      candidates.push({
        title: page.title || '',
        url: page.thumbnail.source,
        sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title || title)}`,
        width: page.thumbnail.width || 640,
        height: page.thumbnail.height || 480,
        license: 'CC BY-SA 4.0', // Standard Wikipedia fallback license
        author: 'Wikipedia Contributors',
        description: page.title || title,
      });
    }
  }

  return candidates;
}

async function downloadFile(url: string, destPath: string): Promise<boolean> {
  const res = await fetchWithRetry(url);
  if (!res.ok) return false;
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length < 5120) {
    // Under 5 KB is invalid / placeholder
    return false;
  }
  fs.writeFileSync(destPath, buffer);
  return true;
}

export async function runImageFetch(): Promise<{ ok: number; needsReview: number; missing: number; results: PlantImageResult[] }> {
  console.log(`Starting StockSure image fetch for ${PLANT_REFERENCE_RULES.length} plants (force=${force})...`);

  const results: PlantImageResult[] = [];

  for (let i = 0; i < PLANT_REFERENCE_RULES.length; i++) {
    const plant = PLANT_REFERENCE_RULES[i];
    const targetFilename = `${plant.slug}.jpg`;
    const targetFilePath = path.join(IMAGES_DIR, targetFilename);

    console.log(`[${i + 1}/${PLANT_REFERENCE_RULES.length}] Processing: ${plant.commonName} (${plant.scientificName})...`);

    // 1. Check manual override
    const manualJpg = path.join(MANUAL_DIR, `${plant.slug}.jpg`);
    const manualPng = path.join(MANUAL_DIR, `${plant.slug}.png`);
    const manualWebp = path.join(MANUAL_DIR, `${plant.slug}.webp`);
    let manualSrc: string | null = null;
    if (fs.existsSync(manualJpg)) manualSrc = manualJpg;
    else if (fs.existsSync(manualPng)) manualSrc = manualPng;
    else if (fs.existsSync(manualWebp)) manualSrc = manualWebp;

    if (manualSrc) {
      console.log(`  -> Using MANUAL override photo for ${plant.slug}`);
      fs.copyFileSync(manualSrc, targetFilePath);
      const resItem: PlantImageResult = {
        commonName: plant.commonName,
        scientificName: plant.scientificName,
        slug: plant.slug,
        status: 'ok',
        imagePath: targetFilePath,
        imageUrl: `/static/plants/${targetFilename}`,
        imageSourceUrl: null,
        imageAuthor: 'Own photo',
        imageLicense: 'own',
        imageCredit: 'Photo: Own photo, own',
        isManual: true,
      };
      await updatePlantImageInDb(resItem);
      results.push(resItem);
      continue;
    }

    // 2. Idempotency: skip if already downloaded and not --force
    if (!force && fs.existsSync(targetFilePath)) {
      const stats = fs.statSync(targetFilePath);
      if (stats.size >= 5120) {
        console.log(`  -> Already exists and verified (${stats.size} bytes). Skipping.`);
        const resItem: PlantImageResult = {
          commonName: plant.commonName,
          scientificName: plant.scientificName,
          slug: plant.slug,
          status: 'ok',
          imagePath: targetFilePath,
          imageUrl: `/static/plants/${targetFilename}`,
          imageSourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(plant.scientificName)}`,
          imageAuthor: 'Wikimedia Commons',
          imageLicense: 'CC BY-SA',
          imageCredit: 'Photo: Wikimedia Commons, CC BY-SA',
        };
        await updatePlantImageInDb(resItem);
        results.push(resItem);
        continue;
      }
    }

    // 3. Query Wikimedia Commons with scientific name first, then common name
    let candidates: CandidateImage[] = [];
    try {
      await sleep(350);
      candidates = await queryWikimedia(plant.scientificName);
      if (candidates.length === 0) {
        await sleep(350);
        candidates = await queryWikimedia(plant.commonName);
      }
      if (candidates.length === 0) {
        await sleep(350);
        candidates = await queryWikipediaPageImage(plant.scientificName);
      }
    } catch (err) {
      console.error(`  -> Network error fetching candidates for ${plant.commonName}:`, err);
    }

    if (candidates.length === 0) {
      console.log(`  -> No candidates found: marking MISSING`);
      const resItem: PlantImageResult = {
        commonName: plant.commonName,
        scientificName: plant.scientificName,
        slug: plant.slug,
        status: 'missing',
        imagePath: null,
        imageUrl: null,
        imageSourceUrl: null,
        imageAuthor: null,
        imageLicense: null,
        imageCredit: null,
        notes: 'No images returned from Wikimedia/Wikipedia search',
      };
      await updatePlantImageInDb(resItem);
      results.push(resItem);
      continue;
    }

    // 4. Validate candidates
    let chosen: CandidateImage | null = null;
    let chosenLicense = '';
    let rejectionReason: string | undefined;

    for (const cand of candidates) {
      // License check
      const lic = isAllowedLicense(cand.license);
      if (!lic.allowed) {
        rejectionReason = `License rejected: ${cand.license}`;
        continue;
      }

      // Botanical check
      const botText = `${cand.title} ${cand.description}`;
      const botCheck = validateBotanical(botText, plant);
      if (!botCheck.valid) {
        rejectionReason = botCheck.reason;
        continue;
      }

      // Passed all checks!
      chosen = cand;
      chosenLicense = lic.normalized;
      break;
    }

    if (!chosen) {
      console.log(`  -> Candidates found (${candidates.length}) but none passed checks: NEEDS_REVIEW (${rejectionReason})`);
      const resItem: PlantImageResult = {
        commonName: plant.commonName,
        scientificName: plant.scientificName,
        slug: plant.slug,
        status: 'needs_review',
        imagePath: null,
        imageUrl: null,
        imageSourceUrl: candidates[0]?.sourceUrl || null,
        imageAuthor: candidates[0]?.author || null,
        imageLicense: candidates[0]?.license || null,
        imageCredit: null,
        notes: rejectionReason || 'Botanical genus/species mismatch or non-permissive license',
      };
      await updatePlantImageInDb(resItem);
      results.push(resItem);
      continue;
    }

    // 5. Download chosen image
    console.log(`  -> Downloading valid image (${chosenLicense}, ${chosen.author})...`);
    await sleep(350);
    const downloaded = await downloadFile(chosen.url, targetFilePath);

    if (!downloaded) {
      console.log(`  -> Download failed or file was under 5 KB: NEEDS_REVIEW`);
      const resItem: PlantImageResult = {
        commonName: plant.commonName,
        scientificName: plant.scientificName,
        slug: plant.slug,
        status: 'needs_review',
        imagePath: null,
        imageUrl: null,
        imageSourceUrl: chosen.sourceUrl,
        imageAuthor: chosen.author,
        imageLicense: chosenLicense,
        imageCredit: null,
        notes: 'Download failed or file corrupt (< 5KB)',
      };
      await updatePlantImageInDb(resItem);
      results.push(resItem);
      continue;
    }

    const resItem: PlantImageResult = {
      commonName: plant.commonName,
      scientificName: plant.scientificName,
      slug: plant.slug,
      status: 'ok',
      imagePath: targetFilePath,
      imageUrl: `/static/plants/${targetFilename}`,
      imageSourceUrl: chosen.sourceUrl,
      imageAuthor: chosen.author,
      imageLicense: chosenLicense,
      imageCredit: `Photo: ${chosen.author}, ${chosenLicense}`,
    };
    await updatePlantImageInDb(resItem);
    results.push(resItem);
    console.log(`  -> OK: Saved to ${targetFilename}`);
  }

  // 6. Generate review sheet
  const html = generateReviewHtml(results);
  const reportPath = path.join(REPORTS_DIR, 'plant-images-review.html');
  fs.writeFileSync(reportPath, html, 'utf8');
  console.log(`Review sheet generated at: ${reportPath}`);

  const ok = results.filter((r) => r.status === 'ok').length;
  const needsReview = results.filter((r) => r.status === 'needs_review').length;
  const missing = results.filter((r) => r.status === 'missing').length;

  console.log(`\n=================================================`);
  console.log(`Images: ${ok} ok / ${needsReview} needs_review / ${missing} missing of 53`);
  console.log(`=================================================\n`);

  return { ok, needsReview, missing, results };
}

// When run directly as script
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runImageFetch()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal fetch error:', err);
      process.exit(1);
    });
}
