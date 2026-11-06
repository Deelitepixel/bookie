/* ─────────────────────────────────────────
   BOOKIE – script.js
   All data lives in localStorage.
───────────────────────────────────────── */

'use strict';

// ── State ──────────────────────────────
const STORAGE_KEY = 'bookie_books';
let books = [];
let activeFilter = 'all';
let searchQuery  = '';
let pendingDeleteId = null;

// ── DOM refs ───────────────────────────
const bookList       = document.getElementById('bookList');
const emptyState     = document.getElementById('emptyState');
const noResults      = document.getElementById('noResults');
const totalCount     = document.getElementById('totalCount');
const readCount      = document.getElementById('readCount');
const unreadCount    = document.getElementById('unreadCount');
const searchInput    = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const filterTabs     = document.querySelectorAll('.tab');
const toast          = document.getElementById('toast');

// Modal – add/edit
const modalOverlay  = document.getElementById('modalOverlay');
const modalTitle    = document.getElementById('modalTitle');
const bookForm      = document.getElementById('bookForm');
const bookIdInput   = document.getElementById('bookId');
const bookTitleInput= document.getElementById('bookTitle');
const bookAuthorInput=document.getElementById('bookAuthor');
const bookReadInput = document.getElementById('bookRead');
const titleError    = document.getElementById('titleError');
const authorError   = document.getElementById('authorError');

// Modal – confirm delete
const confirmOverlay    = document.getElementById('confirmOverlay');
const confirmBookTitle  = document.getElementById('confirmBookTitle');

// ── Persistence ────────────────────────
function load() {
  try {
    books = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { books = []; }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

// ── Helpers ────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function escHtml(str) {
  return str
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── Toast ──────────────────────────────
let toastTimer;
function showToast(msg, icon = '✅') {
  clearTimeout(toastTimer);
  toast.innerHTML = `<span>${icon}</span> ${msg}`;
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2600);
}

// ── Render ─────────────────────────────
function getFiltered() {
  let list = [...books];
  if (activeFilter === 'read')   list = list.filter(b => b.read);
  if (activeFilter === 'unread') list = list.filter(b => !b.read);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q)
    );
  }
  return list;
}

function render() {
  const filtered = getFiltered();

  // Stats (always show totals for all books)
  const total  = books.length;
  const read   = books.filter(b => b.read).length;
  const unread = total - read;
  totalCount.textContent  = total;
  readCount.textContent   = read;
  unreadCount.textContent = unread;

  // Clear list
  bookList.innerHTML = '';

  // Determine empty states
  emptyState.classList.add('hidden');
  noResults.classList.add('hidden');

  if (books.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  if (filtered.length === 0) {
    noResults.classList.remove('hidden');
    return;
  }

  // Build cards
  filtered.forEach(book => {
    const card = document.createElement('div');
    card.className = `book-card ${book.read ? 'read' : 'unread'}`;
    card.dataset.id = book.id;

    card.innerHTML = `
      <div class="book-spine"></div>
      <div class="book-info">
        <div class="book-title">${escHtml(book.title)}</div>
        <div class="book-author">by ${escHtml(book.author)}</div>
        <div class="book-meta">
          <span class="badge ${book.read ? 'badge-read' : 'badge-unread'}">
            ${book.read ? '✓ Read' : '○ Unread'}
          </span>
          <span class="book-date">${fmtDate(book.addedAt)}</span>
        </div>
      </div>
      <div class="book-actions">
        <button class="btn-icon edit-btn"   title="Edit book"   aria-label="Edit ${escHtml(book.title)}">✏️</button>
        <button class="btn-icon delete delete-btn" title="Delete book" aria-label="Delete ${escHtml(book.title)}">🗑️</button>
      </div>
    `;

    // Toggle read on badge click
    card.querySelector('.badge').addEventListener('click', () => toggleRead(book.id));
    card.querySelector('.edit-btn').addEventListener('click',   () => openEdit(book.id));
    card.querySelector('.delete-btn').addEventListener('click', () => openConfirmDelete(book.id));

    bookList.appendChild(card);
  });
}

// ── CRUD ───────────────────────────────
function addBook(title, author, read) {
  const book = { id: uid(), title, author, read, addedAt: new Date().toISOString() };
  books.unshift(book);
  save();
  render();
  showToast('Book added to your shelf!', '📚');
}

function updateBook(id, title, author, read) {
  books = books.map(b => b.id === id ? { ...b, title, author, read } : b);
  save();
  render();
  showToast('Book updated!', '✏️');
}

function deleteBook(id) {
  books = books.filter(b => b.id !== id);
  save();
  render();
  showToast('Book removed from shelf.', '🗑️');
}

function toggleRead(id) {
  books = books.map(b => b.id === id ? { ...b, read: !b.read } : b);
  save();
  render();
  const book = books.find(b => b.id === id);
  if (book) showToast(book.read ? 'Marked as Read! 🎉' : 'Marked as Unread.', book.read ? '✅' : '📖');
}

// ── Modal – Add / Edit ──────────────────
function clearForm() {
  bookIdInput.value     = '';
  bookTitleInput.value  = '';
  bookAuthorInput.value = '';
  bookReadInput.checked = false;
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
  bookReadInput.checked = book.read;
  modalTitle.textContent = 'Edit Book';
  document.getElementById('saveBtn').textContent = 'Update Book';
  modalOverlay.classList.remove('hidden');
  bookTitleInput.focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  clearForm();
}

function validateForm() {
  let valid = true;
  titleError.textContent = '';
  authorError.textContent = '';
  bookTitleInput.classList.remove('error');
  bookAuthorInput.classList.remove('error');

  if (!bookTitleInput.value.trim()) {
    titleError.textContent = 'Title is required.';
    bookTitleInput.classList.add('error');
    valid = false;
  }
  if (!bookAuthorInput.value.trim()) {
    authorError.textContent = 'Author is required.';
    bookAuthorInput.classList.add('error');
    valid = false;
  }
  return valid;
}

bookForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateForm()) return;

  const title  = bookTitleInput.value.trim();
  const author = bookAuthorInput.value.trim();
  const read   = bookReadInput.checked;
  const id     = bookIdInput.value;

  if (id) {
    updateBook(id, title, author, read);
  } else {
    addBook(title, author, read);
  }
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
function closeConfirmDelete() {
  confirmOverlay.classList.add('hidden');
  pendingDeleteId = null;
}

// ── Search ──────────────────────────────
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  clearSearchBtn.classList.toggle('hidden', !searchQuery);
  render();
});
clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearchBtn.classList.add('hidden');
  searchInput.focus();
  render();
});

// ── Filter tabs ─────────────────────────
filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    render();
  });
});

// ── Button wiring ───────────────────────
document.getElementById('openAddModal').addEventListener('click', openAdd);
document.getElementById('closeModal').addEventListener('click',  closeModal);
document.getElementById('cancelModal').addEventListener('click', closeModal);
document.getElementById('cancelDelete').addEventListener('click', closeConfirmDelete);

document.getElementById('confirmDelete').addEventListener('click', () => {
  if (pendingDeleteId) deleteBook(pendingDeleteId);
  closeConfirmDelete();
});

// Close modals on overlay click
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
confirmOverlay.addEventListener('click', e => { if (e.target === confirmOverlay) closeConfirmDelete(); });

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeConfirmDelete();
  }
});

// ── Boot ───────────────────────────────
load();
render();

