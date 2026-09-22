/**
 * Q-Pack Normalized Material Specification
 * Q-Pack polymailers are derived from two natural waste-based raw material sources:
 * 1. Kulit Singkong (Cassava peel waste) -> Cellulose / nanocellulose reinforcement
 * 2. Sisik Ikan (Fish scale waste) -> Chitosan support component
 */

export const QPACK_CANONICAL_MATERIALS = [
  {
    name: "Kulit Singkong",
    role: "Sumber selulosa/nanocellulose sebagai penguat material",
    description: "Berasal dari limbah kulit singkong.",
    image_url: "/assets/images/bahan-baku-kulit-singkong.png"
  },
  {
    name: "Sisik Ikan",
    role: "Sumber chitosan sebagai komponen pendukung matriks biopolimer",
    description: "Berasal dari limbah sisik ikan.",
    image_url: "/assets/images/sisik-ikan.png"
  }
];

export function sanitizeMaterialName(name) {
  if (!name) return 'Pati Singkong Nabati & Kitosan Sisik Ikan';
  return name
    .replace(/Chitosan Sisik Ikan & Ekstrak Alga Cokelat/gi, 'Chitosan Sisik Ikan & Selulosa Kulit Singkong')
    .replace(/Ekstrak Alga Cokelat/gi, 'Selulosa Kulit Singkong')
    .replace(/algae/gi, 'selulosa')
    .replace(/alga/gi, 'selulosa')
    .replace(/seaweed/gi, 'selulosa')
    .replace(/rumput laut/gi, 'limbah kulit singkong');
}

export function sanitizeMaterialDesc(desc) {
  if (!desc) return '';
  return desc
    .replace(/algae/gi, 'selulosa')
    .replace(/alga/gi, 'selulosa')
    .replace(/seaweed/gi, 'selulosa')
    .replace(/rumput laut/gi, 'limbah kulit singkong')
    .replace(/Memanfaatkan sampingan sisik ikan dari industri perikanan pesisir Jawa\. Memiliki sifat antibakteri alami dan larut air panas 80°C\./gi, 'Memanfaatkan sampingan sisik ikan dari industri perikanan pesisir dan selulosa limbah kulit singkong. Memiliki sifat antibakteri alami dan terurai ramah lingkungan.');
}

export function sanitizeSustainabilityInfo(info) {
  if (!info) return '100% Biodegradable dalam 180 hari di tanah alami. Diproduksi dari limbah kulit singkong dan sisik ikan lokal secara sirkular.';
  return info
    .replace(/Mengurangi jejak emisi karbon hingga 65% dibandingkan kantong plastik PE\./gi, 'Diproduksi dari limbah kulit singkong dan sisik ikan lokal secara sirkular.')
    .replace(/Mengurangi jejak emisi karbon.*?dibandingkan kantong plastik PE\./gi, 'Diproduksi dari limbah kulit singkong dan sisik ikan lokal secara sirkular.')
    .replace(/-?65%?\s*(emisi\s*)?co2?/gi, '')
    .trim();
}

