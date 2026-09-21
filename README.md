# ⚡ StudyOS

> **An offline-first, deliberate English acquisition operating system built with React, Vite, and Neo-Brutalist design principles.**

---

## 🌐 English Overview

**StudyOS** is a specialized learning environment designed for advanced language acquisition (B2 → C1). Built entirely with an offline-first architecture, it eliminates external server dependencies, distractions, and cognitive friction by running local spaced retrieval algorithms, acoustic synthesis, and offline lexicons directly inside the browser.

### ✨ Key Features

- **🧠 SM-2 Spaced Retrieval Engine:** Custom implementation of the SuperMemo SM-2 algorithm with dynamic ease-factor scaling, duedate indexing, and an overload prevention cap (daily review limits).
- **📖 Oxford 5000 Integrated Lexicon:** Full offline search index covering 5,900+ CEFR-graded entries (A1–C1), OPAL academic wordlists, grammatical patterns, collocations, and one-click cloze flashcard conversion.
- **🎙️ Deliberate Output Rituals:**
  - **Acoustic Shadowing Timer:** High-intensity articulation tracker equipped with a **25-minute vocal cord rest guard**.
  - **5-Minute Micro-Writing Sprints:** Fast daily synthesis prompts with auto word-count analytics.
- **🛡️ Dual Audio Channels & Tactile Ergonomics:** Independent volume and mute controls for Web Audio UI chimes and text-to-speech pronunciation channels.
- **🎨 Neo-Brutalist Interface:** High-contrast, tactile design system with graph-paper geometry, zero-layout-shift state management, and unified **Vazirmatn** Persian typography.
- **🔒 Zero Tracking & Local Vault:** 100% client-side privacy. Full JSON vault export and import for seamless multi-device backups without databases.

### 🛠️ Tech Stack

- **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler:** [Vite](https://vitejs.dev/) + `vite-plugin-singlefile` (Single HTML delivery)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Audio:** Native Web Audio API Synthesizer
- **Typography:** Space Grotesk, JetBrains Mono, Vazirmatn

### 🚀 Getting Started

```bash
# Clone the repository
git clone [https://github.com/Rouhbakhsh/StudyOS.git](https://github.com/Rouhbakhsh/StudyOS.git)

# Navigate to project directory
cd StudyOS

# Install dependencies
npm install

# Start development server
npm run dev

# Build standalone production release
npm run build