# 📚 Bookie — My Reading List App

A clean, mobile-friendly reading list manager built with **pure HTML, CSS & JavaScript** — no backend, no server, no login required. All data is saved in your browser via `localStorage`.

## ✨ Features

- **Add books** with title, author, and read status
- **Edit** any book inline via modal
- **Delete** with confirmation prompt
- **Search** by title or author (live filter)
- **Filter tabs** — All / Read / Unread
- **Stats bar** — total, read, and unread counts
- **Friendly empty state** when the shelf is empty
- **Persistent storage** — data survives page refresh
- **Mobile responsive** — works great on phones

## 🎨 Design

- Dark theme inspired by **Linktree** (deep navy + gradient greens)
- Card layout inspired by **Amazon KDP**
- Smooth animations, toast notifications, and modal transitions

## 🚀 Live Demo

👉 **[Open Bookie](https://deelitepixel.github.io/bookie/)**

## 🗂️ Project Structure

```
bookie/
├── index.html   # App markup & structure
├── style.css    # All styles (dark theme, responsive)
└── script.js    # App logic + localStorage
```

## 🛠️ Run Locally

No build step needed. Just open `index.html` in any browser:

```bash
# Clone the repo
git clone https://github.com/Deelitepixel/bookie.git

# Open in browser
start bookie/index.html
```

## 📦 Tech Stack

| Layer | Tech |
|---|---|
| Markup | HTML5 |
| Styles | CSS3 (custom properties, flexbox, animations) |
| Logic | Vanilla JavaScript (ES6+) |
| Storage | `localStorage` |
| Hosting | GitHub Pages |

---

> Built with ❤️ — no frameworks, no dependencies, just the web platform.
