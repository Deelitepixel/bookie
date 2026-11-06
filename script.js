'use strict';

// ── State ──────────────────────────────
const STORAGE_KEY = 'bookie_books_v2';
let books        = [];
let activeFilter = 'all';
let searchQuery  = '';
let sortOrder    = 'newest';
let pendingDeleteId = null;

// ── DOM ────────────────────────────────
const sectionsContainer = document.getElementById('sectionsContainer');
const emptyState        = document.getElementById('emptyState');
const noResults         = document.getElementById('noResults');
const totalCount        = document.getElementById('totalCount');
const readCount         = document.getElementById('readCount');
const unreadCount       = document.getElementById('unreadCount');
const avgRatingEl       = document.getElementById('avgRating');
const searchInput       = document.getElementById('searchInput');
const clearSearchBtn    = document.getElementById('clearSearch');
const sortSelect        = document.getElementById('sortSelect');
const toast             = document.getElementById('toast');

// Modal – add/edit
const modalOverlay   = document.getElementById('modalOverlay');
const modalTitle     = document.getElementById('modalTitle');
const bookForm       = document.getElementById('bookForm');
const bookIdInput    = document.getElementById('bookId');
const bookTitleInput = document.getElementById('bookTitle');
const bookAuthorInput= document.getElementById('bookAuthor');
const bookGenreInput = document.getElementById('bookGenre');
const bookRatingInput= document.getElementById('bookRating');
const bookReviewInput= document.getElementById('bookReview');
const bookReadInput  = document.getElementById('bookRead');
const titleError     = document.getElementById('titleError');
const authorError    = document.getElementById('authorError');
const starPicker     = document.getElementById('starPicker');
const starLabel      = document.getElementById('starLabel');
const charCount      = document.getElementById('charCount');

// Modal – confirm delete
const confirmOverlay    = document.getElementById('confirmOverlay');
const confirmBookTitle  = document.getElementById('confirmBookTitle');

// Modal – full review
const reviewOverlay    = document.getElementById('reviewOverlay');
const reviewModalTitle = document.getElementById('reviewModalTitle');
const reviewStarsLg    = document.getElementById('reviewStarsLg');
const reviewAuthorTag  = document.getElementById('reviewAuthorTag');
const reviewFullText   = document.getElementById('reviewFullText');

// ── Genre → icon map ───────────────────
const GENRE_ICONS = {
  'Fiction':           '🧩',
  'Non-Fiction':       '📰',
  'Self Help':         '🌱',
  'Science Fiction':   '🚀',
  'Fantasy':           '🧙',
  'Mystery & Thriller':'🔍',
  'Biography':         '👤',
  'History':           '🏛️',
  'Science':           '🔬',
  'Business':          '💼',
  'Romance':           '💕',
  'Horror':            '👻',
  'Children':          '🧸',
  'Other':             '📦',
  'Uncategorized':     '📚',
};

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

// ── Persistence ────────────────────────
function load() {
  try { books = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { books = []; }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(books)); }

// ── Helpers ────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escHtml(str = '') {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function starsHTML(rating, cls = 'stars-display') {
  let html = `<span class="${cls}">`;
  for (let i = 1; i <= 5; i++) {
    html += `<span class="s${i <= rating ? ' on' : ''}">★</span>`;
  }
  html += '</span>';
  return html;
}

function avgOf(list) {
  const rated = list.filter(b => b.rating > 0);
  if (!rated.length) return null;
  return (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1);
}

// ── Toast ──────────────────────────────
let toastTimer;
function showToast(msg, icon = '✅') {
  clearTimeout(toastTimer);
  toast.innerHTML = `<span>${icon}</span> ${msg}`;
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2600);
}

// ── Filtering & Sorting ────────────────
function getFiltered() {
  let list = [...books];
  if (activeFilter === 'read')   list = list.filter(b => b.read);
  if (activeFilter === 'unread') list = list.filter(b => !b.read);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(b =>
      b.title.toLowerCase().includes(q)  ||
      b.author.toLowerCase().includes(q) ||
      (b.review || '').toLowerCase().includes(q)
    );
  }
  // Sort
  list.sort((a, b) => {
    switch (sortOrder) {
      case 'newest':      return new Date(b.addedAt) - new Date(a.addedAt);
      case 'oldest':      return new Date(a.addedAt) - new Date(b.addedAt);
      case 'rating-high': return (b.rating || 0) - (a.rating || 0);
      case 'rating-low':  return (a.rating || 0) - (b.rating || 0);
      case 'title-az':    return a.title.localeCompare(b.title);
      case 'title-za':    return b.title.localeCompare(a.title);
      default:            return 0;
    }
  });
  return list;
}

function groupByGenre(list) {
  const map = {};
  list.forEach(b => {
    const g = b.genre || 'Uncategorized';
    if (!map[g]) map[g] = [];
    map[g].push(b);
  });
  // Sort genres alphabetically, Uncategorized last
  return Object.entries(map).sort(([a], [b]) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });
}

// ── Render ─────────────────────────────
function render() {
  const filtered = getFiltered();

  // Stats (always from full books list)
  const total  = books.length;
  const read   = books.filter(b => b.read).length;
  const unread = total - read;
  const avg    = avgOf(books);
  totalCount.textContent  = total;
  readCount.textContent   = read;
  unreadCount.textContent = unread;
  avgRatingEl.textContent = avg ? `${avg}★` : '—';

  // Clear
  sectionsContainer.innerHTML = '';
  emptyState.classList.add('hidden');
  noResults.classList.add('hidden');

  if (books.length === 0) { emptyState.classList.remove('hidden'); return; }
  if (filtered.length === 0) { noResults.classList.remove('hidden'); return; }

  // Group into sections
  const groups = groupByGenre(filtered);

  groups.forEach(([genre, booksInGroup]) => {
    const icon   = GENRE_ICONS[genre] || '📚';
    const secAvg = avgOf(booksInGroup);

    const section = document.createElement('div');
    section.className = 'book-section';
    section.innerHTML = `
      <div class="section-header">
        <span class="section-icon">${icon}</span>
        <span class="section-title">${escHtml(genre)}</span>
        <span class="section-count">${booksInGroup.length} book${booksInGroup.length !== 1 ? 's' : ''}</span>
        ${secAvg ? `<span class="section-avg"><span class="stars-sm">★</span> ${secAvg} avg</span>` : ''}
      </div>
      <div class="book-grid" id="grid-${encodeURIComponent(genre)}"></div>
    `;
    sectionsContainer.appendChild(section);

    const grid = section.querySelector('.book-grid');
    booksInGroup.forEach(book => grid.appendChild(buildCard(book)));
  });
}

// ── Build a single card ─────────────────
function buildCard(book) {
  const card = document.createElement('div');
  card.className = `book-card ${book.read ? 'read' : 'unread'}`;
  card.dataset.id = book.id;

  const hasReview    = book.review && book.review.trim().length > 0;
  const reviewSnip   = hasReview
    ? escHtml(book.review.trim().slice(0, 160)) + (book.review.trim().length > 160 ? '…' : '')
    : '';
  const longReview   = hasReview && book.review.trim().length > 160;

  const ratingRow = book.rating > 0
    ? `<div class="card-rating-row">
        ${starsHTML(book.rating)}
        <span class="rating-number">${book.rating}.0</span>
        <span class="rating-label">${STAR_LABELS[book.rating]}</span>
       </div>`
    : `<div class="card-rating-row"><span class="rating-label" style="color:var(--text-muted)">Not rated yet</span></div>`;

  const reviewSection = hasReview
    ? `<p class="card-review">${reviewSnip}</p>
       ${longReview ? '<button class="read-more-btn" data-action="expand">Read full review</button>' : ''}`
    : `<p class="no-review">No review written yet.</p>`;

  card.innerHTML = `
    <div class="card-top-bar"></div>
    <div class="card-body">
      <div class="card-title-row">
        <div class="book-title">${escHtml(book.title)}</div>
        <span class="read-badge-pill ${book.read ? 'badge-read' : 'badge-unread'}">${book.read ? '✓ Read' : '○ Unread'}</span>
      </div>
      <div class="book-author">by <span>${escHtml(book.author)}</span></div>
      ${ratingRow}
      ${reviewSection}
    </div>
    <div class="card-footer">
      <span class="card-date">Added ${fmtDate(book.addedAt)}</span>
      <div class="card-actions">
        <button class="btn-icon edit-btn"   title="Edit"   aria-label="Edit ${escHtml(book.title)}">✏️</button>
        <button class="btn-icon delete delete-btn" title="Delete" aria-label="Delete ${escHtml(book.title)}">🗑️</button>
      </div>
    </div>
  `;

  // Events
  card.querySelector('.edit-btn').addEventListener('click',   () => openEdit(book.id));
  card.querySelector('.delete-btn').addEventListener('click', () => openConfirmDelete(book.id));

  const expandBtn = card.querySelector('[data-action="expand"]');
  if (expandBtn) {
    expandBtn.addEventListener('click', () => openReviewModal(book.id));
  }

  // Click badge to toggle read
  card.querySelector('.read-badge-pill').addEventListener('click', () => toggleRead(book.id));

  return card;
}

// ── CRUD ───────────────────────────────
function addBook(data) {
  books.unshift({ id: uid(), addedAt: new Date().toISOString(), ...data });
  save(); render();
  showToast('Book added to your shelf!', '📚');
}
function updateBook(id, data) {
  books = books.map(b => b.id === id ? { ...b, ...data } : b);
  save(); render();
  showToast('Book updated!', '✏️');
}
function deleteBook(id) {
  books = books.filter(b => b.id !== id);
  save(); render();
  showToast('Book removed from shelf.', '🗑️');
}
function toggleRead(id) {
  books = books.map(b => b.id === id ? { ...b, read: !b.read } : b);
  save(); render();
  const book = books.find(b => b.id === id);
  if (book) showToast(book.read ? 'Marked as Read! 🎉' : 'Marked as Unread.', book.read ? '✅' : '📖');
}

// ── Star picker wiring ─────────────────
let currentRating = 0;
function setRating(val) {
  currentRating = val;
  bookRatingInput.value = val;
  starPicker.querySelectorAll('.star-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.val) <= val);
  });
  starLabel.textContent = val > 0 ? `${STAR_LABELS[val]} (${val}/5)` : 'Not rated';
}

starPicker.querySelectorAll('.star-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = parseInt(btn.dataset.val);
    // Click same star again → clear rating
    setRating(currentRating === val ? 0 : val);
  });
  btn.addEventListener('mouseenter', () => {
    starPicker.querySelectorAll('.star-btn').forEach(b => {
      b.style.color = parseInt(b.dataset.val) <= parseInt(btn.dataset.val)
        ? 'var(--star-on)' : 'var(--star-off)';
    });
  });
});
starPicker.addEventListener('mouseleave', () => {
  starPicker.querySelectorAll('.star-btn').forEach(b => {
    b.style.color = '';
    b.classList.toggle('active', parseInt(b.dataset.val) <= currentRating);
  });
});

// Char counter
bookReviewInput.addEventListener('input', () => {
  charCount.textContent = `${bookReviewInput.value.length} / 1000`;
});

// ── Modal – Add / Edit ─────────────────
function clearForm() {
  bookIdInput.value     = '';
  bookTitleInput.value  = '';
  bookAuthorInput.value = '';
  bookGenreInput.value  = 'Uncategorized';
  bookReviewInput.value = '';
  bookReadInput.checked = false;
  charCount.textContent = '0 / 1000';
  setRating(0);
  titleError.textContent  = '';
  authorError.textContent = '';
  bookTitleInput.classList.remove('error');
  bookAuthorInput.classList.remove('error');
}

function openAdd() {
  clearForm();
  modalTitle.textContent = 'Add a New Book';
  document.getElementById('saveBtn').textContent = 'Save Book';
  modalOverlay.classList.remove('hidden');
  bookTitleInput.focus();
}

function openEdit(id) {
  const book = books.find(b => b.id === id);
  if (!book) return;
  clearForm();
  bookIdInput.value     = book.id;
  bookTitleInput.value  = book.title;
  bookAuthorInput.value = book.author;
  bookGenreInput.value  = book.genre || 'Uncategorized';
  bookReviewInput.value = book.review || '';
  bookReadInput.checked = book.read;
  charCount.textContent = `${(book.review || '').length} / 1000`;
  setRating(book.rating || 0);
  modalTitle.textContent = 'Edit Book';
  document.getElementById('saveBtn').textContent = 'Update Book';
  modalOverlay.classList.remove('hidden');
  bookTitleInput.focus();
}

function closeModal() { modalOverlay.classList.add('hidden'); clearForm(); }

function validateForm() {
  let valid = true;
  titleError.textContent = ''; authorError.textContent = '';
  bookTitleInput.classList.remove('error'); bookAuthorInput.classList.remove('error');
  if (!bookTitleInput.value.trim()) {
    titleError.textContent = 'Title is required.';
    bookTitleInput.classList.add('error'); valid = false;
  }
  if (!bookAuthorInput.value.trim()) {
    authorError.textContent = 'Author is required.';
    bookAuthorInput.classList.add('error'); valid = false;
  }
  return valid;
}

bookForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateForm()) return;
  const data = {
    title:  bookTitleInput.value.trim(),
    author: bookAuthorInput.value.trim(),
    genre:  bookGenreInput.value,
    rating: parseInt(bookRatingInput.value) || 0,
    review: bookReviewInput.value.trim(),
    read:   bookReadInput.checked,
  };
  const id = bookIdInput.value;
  if (id) updateBook(id, data); else addBook(data);
  closeModal();
});

// ── Confirm Delete ──────────────────────
function openConfirmDelete(id) {
  const book = books.find(b => b.id === id);
  if (!book) return;
  pendingDeleteId = id;
  confirmBookTitle.textContent = `"${book.title}"`;
  confirmOverlay.classList.remove('hidden');
}
function closeConfirmDelete() { confirmOverlay.classList.add('hidden'); pendingDeleteId = null; }

// ── Full Review Modal ───────────────────
function openReviewModal(id) {
  const book = books.find(b => b.id === id);
  if (!book) return;
  reviewModalTitle.textContent = escHtml(book.title);
  reviewStarsLg.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement('span');
    s.className = 's' + (i <= book.rating ? ' on' : '');
    s.textContent = '★';
    reviewStarsLg.appendChild(s);
  }
  reviewAuthorTag.textContent = `by ${book.author}`;
  reviewFullText.textContent  = book.review || '';
  reviewOverlay.classList.remove('hidden');
}
function closeReviewModal() { reviewOverlay.classList.add('hidden'); }

// ── Search & filter wiring ──────────────
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  clearSearchBtn.classList.toggle('hidden', !searchQuery);
  render();
});
clearSearchBtn.addEventListener('click', () => {
  searchInput.value = ''; searchQuery = '';
  clearSearchBtn.classList.add('hidden');
  searchInput.focus(); render();
});
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    render();
  });
});
sortSelect.addEventListener('change', () => { sortOrder = sortSelect.value; render(); });

// ── Button wiring ───────────────────────
document.getElementById('openAddModal').addEventListener('click', openAdd);
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelModal').addEventListener('click', closeModal);
document.getElementById('cancelDelete').addEventListener('click', closeConfirmDelete);
document.getElementById('confirmDelete').addEventListener('click', () => {
  if (pendingDeleteId) deleteBook(pendingDeleteId);
  closeConfirmDelete();
});
document.getElementById('closeReview').addEventListener('click', closeReviewModal);

// Close on overlay click
modalOverlay.addEventListener('click',  e => { if (e.target === modalOverlay)  closeModal(); });
confirmOverlay.addEventListener('click',e => { if (e.target === confirmOverlay) closeConfirmDelete(); });
reviewOverlay.addEventListener('click', e => { if (e.target === reviewOverlay)  closeReviewModal(); });

// Escape key
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closeModal(); closeConfirmDelete(); closeReviewModal();
});

// ── Seed data (first run only) ──────────
function seedIfEmpty() {
  if (books.length > 0) return;
  const seeds = [
    {
      title: 'Atomic Habits', author: 'James Clear', genre: 'Self Help',
      rating: 5, read: true,
      review: 'Life-changing. Clear breaks down the science of habit formation into actionable strategies. The idea of "1% better every day" has completely shifted how I approach personal growth. A must-read for anyone wanting to build better routines.',
      addedAt: new Date(Date.now() - 8640000 * 10).toISOString()
    },
    {
      title: 'The Hobbit', author: 'J.R.R. Tolkien', genre: 'Fantasy',
      rating: 5, read: true,
      review: 'A timeless adventure. Tolkien\'s world-building is unmatched and Bilbo\'s journey feels both epic and deeply personal. Perfect escapism from start to finish.',
      addedAt: new Date(Date.now() - 8640000 * 20).toISOString()
    },
    {
      title: 'Dune', author: 'Frank Herbert', genre: 'Science Fiction',
      rating: 4, read: true,
      review: 'Dense but rewarding. The political intrigue, ecology, and philosophy woven through this story are extraordinary. It demands patience but pays off beautifully.',
      addedAt: new Date(Date.now() - 8640000 * 15).toISOString()
    },
    {
      title: 'Project Hail Mary', author: 'Andy Weir', genre: 'Science Fiction',
      rating: 5, read: false,
      review: '',
      addedAt: new Date(Date.now() - 8640000 * 3).toISOString()
    },
    {
      title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'Non-Fiction',
      rating: 4, read: true,
      review: 'A sweeping, thought-provoking tour through human history. Some sections feel a little speculative, but Harari has a gift for making big ideas feel accessible and urgent.',
      addedAt: new Date(Date.now() - 8640000 * 30).toISOString()
    },
    {
      title: 'The Psychology of Money', author: 'Morgan Housel', genre: 'Business',
      rating: 5, read: true,
      review: 'Short chapters, big ideas. Housel reframes how we think about wealth, greed, and happiness. The writing is punchy and the insights are genuinely surprising.',
      addedAt: new Date(Date.now() - 8640000 * 7).toISOString()
    },
    {
      title: 'Gone Girl', author: 'Gillian Flynn', genre: 'Mystery & Thriller',
      rating: 4, read: false,
      review: '',
      addedAt: new Date(Date.now() - 8640000 * 2).toISOString()
    },
    {
      title: 'The Name of the Wind', author: 'Patrick Rothfuss', genre: 'Fantasy',
      rating: 5, read: false,
      review: 'Only 3 chapters in but already hooked. The prose is stunning.',
      addedAt: new Date(Date.now() - 8640000 * 1).toISOString()
    },
  ];
  seeds.forEach(s => books.push({ id: uid(), ...s }));
  save();
}

// ── Boot ────────────────────────────────
load();
seedIfEmpty();
render();
