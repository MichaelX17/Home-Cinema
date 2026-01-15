# 🎬 Home Cinema

A modern, feature-rich home cinema web application built with **Next.js & Tailwind CSS** that automatically scans your local movie library and provides a beautiful interface for browsing and watching your collection.

---

## ✨ Features

### 🎥 Smart Media Management
- **Automatic Library Scanning** - Scans specified folders for movies and series
- **File Format Support** - Handles various video formats (MP4, MKV, AVI, etc.)

### 🎨 Modern UI/UX
- **Dark Mode Design** optimized for home theater viewing
- **Responsive Layout** that works on desktop, tablet, and mobile
- **Movie Cards** with posters and essential information
- **Smooth Animations** with Tailwind CSS transitions

### 🎬 Video Experience
- **Integrated Video Player** with full playback controls
- **Fullscreen Support** for immersive viewing
- **Playback Resumption** - Remembers where you left off

### 🔧 Smart Functionality
- **One-Click Playback** - Just click to start watching
- **Metadata Display** - Shows movie/series information on player page
- **Responsive Design** - Optimized for all screen sizes
- **Fast Navigation** - Instant loading with Next.js routing

---

## 🎨 Design System

### Dark Theme (Default)
- Cinema-optimized dark backgrounds
- High contrast text for readability
- Accent colors that enhance viewing experience
- Glassmorphism effects for modern look

---

## 📸 Interface Preview

| Home Page | Video Player |
|:---:|:---:|
| <img width="400" alt="Home" src="https://github.com/user-attachments/assets/0a7d4dca-5e58-43f3-bcbd-f4e9c8792c2d" /> | <img width="400" alt="Player" src="https://github.com/user-attachments/assets/3d71aa44-6127-4221-9373-209152f075c6" /> |
| *Movie library with card grid layout* | *Full-featured video player with info sidebar* |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer)
- npm, yarn, or pnpm
- Local movie/series collection in organized folders

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MichaelX17/Home-Cinema.git
   cd home-cinema
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Configure your media library**
   - Update the media directory path in the configuration
   - Organize your movies in folders (optional but recommended)

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

---

## 🛠️ Technical Stack

### Core Technologies
- **Next.js 16.1.1** with App Router for optimal performance
- **React 19.2.3** with modern hooks
- **TypeScript** for type safety
- **Tailwind CSS** for utility-first styling

---

## 📱 Usage Guide

### Setting Up Your Library
1. **Organize Your Media** - Place movies/series in the configured folder
2. **Folder Structure** (recommended):
   ```
   public/
   ├── movies/
   │   ├── Movie/Serie Title (Year)/
   │   │   ├── movie.mp4
   │   │   ├── info.json
   │   │   └── cover.jpg
   |   |
   │   ├── Series Name/
   │   │   ├── season01/
   │   │   │   ├── S01E01.mp4
   │   │   │   └── S01E02.mp4
   │   │   ├── info.json
   |   │   └── cover.jpg
   ```

### Using the App
1. **Browse Your Collection** - View all movies/series as cards on the home page
2. **Click to Play** - Select any item to open the video player
3. **Watch with Controls** - Use the built-in player controls
4. **View Information** - See metadata on the player page

---

## 🔧 Configuration

### Customization
- Edit `tailwind.config.js` for theme colors
- Modify `app/globals.css` for global styles
- Update components in `app/components/` for UI changes

---

## 🐛 Troubleshooting

### Common Issues
- **Media not appearing**: Check folder permissions and path configuration
- **Video won't play**: Ensure file format is browser-supported (MP4, WebM, AVI, prefered)
- **Slow loading**: Optimize video files or implement lazy loading
- **Missing metadata**: Check file naming conventions

### Performance Tips
- Use MP4 with H.264 encoding for best compatibility
- Keep posters under 500KB for fast loading
- Implement pagination for large libraries
- Use Next.js Image optimization for posters

---

## 👨‍💻 Development

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Tailwind CSS for styling
- Modular component architecture

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👤 Developed By

**Miguel Farfan**
- Computer Science Engineer | Full-Stack Developer
- 📧 mfpersonal777@gmail.com  
- 🌐 [GitHub](https://github.com/MichaelX17)
- 💼 [LinkedIn](https://linkedin.com/in/miguelfarfan) 
- 💼 [Workana](https://www.workana.com/freelancer/9da9f40c57fe3491650d3ddfdc37af91)

---

*Note: This is a personal media server application. Ensure you have the rights to any content you stream through this application.*
