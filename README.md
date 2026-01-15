# 📋 Copy-Paste App

A modern, secure Progressive Web App (PWA) for storing and quickly copying your frequently used text snippets. Built with vanilla JavaScript, no external dependencies.

![Copy-Paste App](https://img.shields.io/badge/PWA-Ready-blue) ![Security](https://img.shields.io/badge/Security-Hardened-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### Core Functionality
- **📝 Add Content** - Store text snippets with custom labels
- **📋 One-Click Copy** - Instantly copy content to clipboard
- **✏️ Edit Items** - Modify labels, tags, and content anytime
- **🗑️ Delete Items** - Remove unwanted snippets
- **🔄 Drag & Drop Reorder** - Organize items by dragging rows

### Organization
- **🏷️ Tag System** - Create custom tags to categorize content
- **📑 Tab Filtering** - Filter view by tags (All, specific tag, Untagged)
- **⚙️ Manage Tags** - Create, view, and delete tags

### Data Management
- **💾 Local Storage** - All data stored in browser (private & secure)
- **📥 Export** - Download all data as JSON backup
- **📤 Import** - Restore data from JSON backup
- **🔄 Auto-Save** - Changes saved automatically

### Validation
- **🚫 Duplicate Prevention** - Blocks duplicate labels in same tag group
- **⚠️ Warning System** - Alerts if label exists in other tags

### PWA Features
- **📱 Installable** - Add to home screen on mobile/desktop
- **🔌 Offline Support** - Works without internet (service worker)
- **🎨 Modern UI** - Dark theme with glassmorphism design

## 🔒 Security Features

| Feature | Description |
|---------|-------------|
| **No External Calls** | Zero third-party APIs or CDNs |
| **Local Storage Only** | Data never leaves your browser |
| **XSS Protection** | HTML escaping on all user input |
| **CSP Headers** | Content Security Policy enabled |
| **Security Headers** | X-Frame-Options, X-Content-Type-Options, etc. |

## 🛠️ Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom properties, Flexbox, Grid, Animations
- **Vanilla JavaScript** - No frameworks, no dependencies
- **PWA** - Service Worker, Web App Manifest
- **LocalStorage API** - Client-side data persistence

## 📁 Project Structure

```
copy-paste-app/
├── index.html      # Main app (single-file with inline CSS/JS)
├── manifest.json   # PWA manifest configuration
├── sw.js           # Service worker for offline support
├── _headers        # Netlify security headers
├── netlify.toml    # Netlify deployment configuration
├── start.bat       # Local development server (Windows)
└── README.md       # This file
```

## 🚀 Getting Started

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/kkr313/copy-paste.git
   cd copy-paste
   ```

2. **Start local server** (Windows)
   ```bash
   # Double-click start.bat or run:
   python -m http.server 8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```


## 📖 Usage Guide

### Adding Content
1. Enter a **Label** (e.g., "Work Email", "API Key")
2. Select a **Tag** (optional, for organization)
3. Enter the **Content** you want to store
4. Click **➕ Add Content**

### Managing Tags
1. Click **⚙️ Manage Tags**
2. Enter tag name and click **Add**
3. Use tabs to filter by tag

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Escape` | Close modal |
| `Enter` | Add tag (in tag input) |

### Data Backup
- **Export**: Click 📥 Export to download JSON
- **Import**: Click 📤 Import to restore from JSON

## 🎨 UI Features

- **Dark Theme** - Easy on the eyes
- **Gradient Accents** - Purple to pink color scheme
- **Glassmorphism** - Modern blur effects
- **Responsive Design** - Works on all screen sizes
- **Smooth Animations** - Fade-in, slide effects
- **Toast Notifications** - Success, warning, error feedback

## 🔐 Privacy

Your data is **100% private**:
- ✅ Stored locally in your browser
- ✅ Never sent to any server
- ✅ No analytics or tracking
- ✅ No cookies (except service worker cache)
- ✅ No external dependencies

## 📱 Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full |
| Edge | ✅ Full |
| Mobile Chrome | ✅ Full + Install |
| Mobile Safari | ✅ Full + Install |

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

MIT License - feel free to use for personal or commercial projects.

---

**Made with ❤️ for productivity**
