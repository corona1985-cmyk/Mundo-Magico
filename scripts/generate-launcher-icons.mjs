/**
 * Genera iconos de launcher Android desde public/logo-mundo-magico.png
 */
import sharp from 'sharp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'public', 'logo-mundo-magico.png');

// Tamaños estándar Capacitor/Android para adaptive foreground + legacy round
const foreground = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

const legacy = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function main() {
  const base = sharp(src).ensureAlpha();
  for (const [folder, size] of Object.entries(foreground)) {
    const dir = join(root, 'android', 'app', 'src', 'main', 'res', folder);
    await base
      .clone()
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(join(dir, 'ic_launcher_foreground.png'));
  }
  for (const [folder, size] of Object.entries(legacy)) {
    const dir = join(root, 'android', 'app', 'src', 'main', 'res', folder);
    const resized = base.clone().resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    });
    await resized.clone().png().toFile(join(dir, 'ic_launcher.png'));
    await resized.clone().png().toFile(join(dir, 'ic_launcher_round.png'));
  }
  console.log('Launcher icons generated OK.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
