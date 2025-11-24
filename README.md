# Stealth PNG Info Viewer

A static web application for viewing hidden metadata in PNG files, specifically designed for AI-generated images (Stable Diffusion).

## Features

- **Drag & Drop Interface**: Upload PNG files by dragging them anywhere on the screen
- **Multiple File Support**: Upload multiple PNGs at once; new files appear at the top
- **Global Diff Highlighting**: Automatically compares all displayed images
  - Highlights chunks that are NOT present in ALL images
  - Phrase-level comparison (e.g., "averting eyes" vs "upturned eyes")
  - Handles "BREAK" keywords and commas correctly
- **Smart Formatting**: "BREAK" keywords are visually separated with line breaks
- **Responsive Design**: Adapts to desktop and mobile with grid layout
- **Calm Aesthetic**: Green & grey color scheme for comfortable viewing
- **Card Management**: Individual remove buttons for each image

## Tech Stack

- **Framework**: Vite + Vanilla JavaScript
- **Styling**: Vanilla CSS with glassmorphism design
- **Testing**: Vitest for unit tests
- **Deployment**: GitHub Pages with GitHub Actions

## Project Structure

```
stealth-png-info-viewer/
├── src/
│   ├── main.js              # Main application logic
│   ├── png-parser.js        # PNG chunk parsing
│   ├── diff-utils.js        # Diff highlighting logic
│   ├── diff-utils.test.js   # Unit tests
│   └── style.css            # Styles
├── index.html               # Entry point
├── package.json             # Dependencies
└── .github/workflows/       # CI/CD
    └── deploy.yml           # GitHub Pages deployment
```

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd stealth-png-info-viewer

# Install dependencies
npm install
```

### Development

```bash
# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

1. **Open the app** in your browser (locally or via GitHub Pages)
2. **Drag and drop** PNG files anywhere on the screen, or click "Open File"
3. **View metadata**: The app displays:
   - Image preview
   - Prompt (with BREAK formatting)
   - Negative Prompt
   - Other Parameters (Steps, Sampler, CFG Scale, etc.)
   - Raw Metadata (collapsible)
4. **Compare images**: Upload multiple images to see highlighted differences
   - Chunks unique to each image are highlighted
   - Common chunks (present in ALL images) are not highlighted
5. **Remove images**: Click the × button on any card to remove it

## Diff Logic

The diff highlighting uses **global comparison**:
- Collects all chunks from ALL displayed images
- Creates a set of "common chunks" (present in ALL images)
- Highlights chunks that are NOT in the common set
- Position-independent comparison

Example:
```
Image 1: "looking up, alice, bob"
Image 2: "looking up, charlie, alice"
Image 3: "looking up, david, charlie"

Common: "looking up"
Image 1 highlights: "alice", "bob"
Image 2 highlights: "charlie", "alice"
Image 3 highlights: "david", "charlie"
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

Tests cover:
- Basic diff highlighting
- Global comparison logic
- Multi-word phrase handling
- BREAK keyword formatting
- Edge cases (masterpiece, armored dress, etc.)

## Deployment

The app is configured for automatic deployment to GitHub Pages:

1. Push to `main` branch
2. GitHub Actions builds and deploys automatically
3. Access at `https://<username>.github.io/<repo-name>/`

## License

MIT

## Acknowledgments

- Built with Vite
- Tested with Vitest
- Deployed on GitHub Pages
