export const sampleImages = {
  hero: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=85',
  installation: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=1000&q=80',
  fabrication: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=80',
  maintenance: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1000&q=80',
  event: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80',
  office: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80',
}
export const serviceImageById: Record<string,string> = { print: sampleImages.event, build: sampleImages.fabrication, install: sampleImages.installation, maintain: sampleImages.maintenance, site: sampleImages.office, custom: sampleImages.event }
export const providerImageById: Record<string,string> = { signal: sampleImages.installation, northside: sampleImages.fabrication, fixright: sampleImages.maintenance, anytask: sampleImages.office }
