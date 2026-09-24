export const BLOG_POSTS = [
  {
    id: 'understanding-cardiac-prevention',
    slug: 'understanding-cardiac-prevention',
    title: '5 Preventative Steps for Long-Term Cardiovascular Health',
    category: 'Cardiology',
    readTime: '5 min read',
    date: 'Sep 18, 2026',
    author: 'Dr. John Watson, MD',
    excerpt: 'Cardiologists emphasize that early detection and routine arterial screenings significantly decrease long-term risks. Here is what modern diagnostics look for.',
    content: `
Cardiovascular wellness remains the cornerstone of comprehensive health. While genetic predispositions play a recognized role, proactive lifestyle adaptations and regular clinical diagnostics can prevent up to 80% of premature cardiac events.

### 1. The Role of Regular Lipid Panels
Standard blood pressure checks are essential, but modern cardiology increasingly monitors advanced markers like apolipoprotein B (ApoB) and high-sensitivity C-reactive protein (hs-CRP). These provide a granular evaluation of vascular inflammation.

### 2. Physical Conditioning & Heart Rate Variability
Zone 2 aerobic exercise—sustained physical effort at an intensity where you can comfortably speak in full sentences—builds mitochondrial density and enhances heart rate variability (HRV), a direct proxy of autonomic nervous system health.

### 3. Nutrition Beyond Caloric Counts
A diet rich in soluble fibers, polyphenols, and omega-3 fatty acids helps maintain endothelial lining integrity. Reducing ultra-processed foods lowers systemic metabolic stress.

### 4. Sleep & Cortisol Regulation
Sleep apnea and chronic sleep deprivation elevate nighttime cortisol levels, directly straining the arterial walls. Ensuring 7–8 hours of restorative sleep acts as daily vascular repair.

### 5. Annual Specialist Consultations
Establishing a baseline with a certified cardiologist allows for personalized risk stratification, electrocardiogram (ECG) tracking, and preemptive care strategies.
    `,
  },
  {
    id: 'managing-seasonal-allergies-children',
    slug: 'managing-seasonal-allergies-children',
    title: 'A Pediatrician Guide to Managing Seasonal Allergies in Children',
    category: 'Pediatrics',
    readTime: '4 min read',
    date: 'Sep 12, 2026',
    author: 'Dr. Meredith Grey, MD',
    excerpt: 'Learn how to differentiate between common viral colds and allergic rhinitis in growing children, plus safe pediatric care recommendations.',
    content: `
Seasonal allergies in children can often mimic standard upper respiratory infections. As school terms begin, pediatricians see a noticeable spike in childhood allergic rhinitis.

### Colds vs. Allergies: Key Indicators
- **Fever:** Never present with allergies; common with viral colds.
- **Duration:** Cold symptoms resolve within 7–10 days; allergies persist as long as allergens remain in the environment.
- **Nasal Discharge:** Clear and watery for allergies; thicker and discolored in active viral infections.

### Practical Environmental Controls
- Keep bedroom windows closed during high-pollen morning hours.
- Use HEPA air purifiers in children's sleeping areas.
- Wash clothes and rinse hair immediately after prolonged outdoor playtime.
    `,
  },
  {
    id: 'why-atomic-scheduling-matters',
    slug: 'why-atomic-scheduling-matters',
    title: 'Why Real-Time Atomic Scheduling is Revolutionizing Healthcare',
    category: 'Healthcare Tech',
    readTime: '6 min read',
    date: 'Aug 28, 2026',
    author: 'Docyra Engineering Team',
    excerpt: 'How database-level two-phase locking and ISO standards eliminate double-booking friction and clinic wait times.',
    content: `
Healthcare scheduling has historically been plagued by asynchronous sync delays. When multiple booking portals query a doctor's calendar without atomic transaction isolation, overlapping reservations inevitably occur.

### The Double-Booking Dilemma
In traditional systems, slot status is read and written in separate, non-atomic database calls. Under concurrent load, two competing patients can both read a slot as available and proceed to reserve it.

### Docyra's Concurrency Architecture
Docyra implements MongoDB ACID transactions coupled with unique compound indices on (doctorId, slotStart, slotEnd). When a reservation is attempted:
1. An atomic session begins with write locks.
2. The slot is verified and locked in a single atomic findOneAndUpdate.
3. Competing requests immediately receive deterministic 409 conflict codes rather than corrupted phantom appointments.
    `,
  },
];

export default BLOG_POSTS;
