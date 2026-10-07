import React, { useCallback, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { auth, db, isFirebaseConfigured } from "./firebase.ts";
import phonePreview from "../assets/phone-preview-DOP5Nxe_.png";

const defaultCover = "/ReadJourney/assets/book-C2aK6_m4.jpg";
const featuredBooks = [
  {
    id: "featured-gatsby",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    totalPages: 180,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780743273565-M.jpg",
  },
  {
    id: "featured-pride-prejudice",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    totalPages: 279,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780141439518-M.jpg",
  },
  {
    id: "featured-1984",
    title: "1984",
    author: "George Orwell",
    totalPages: 328,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780451524935-M.jpg",
  },
  {
    id: "featured-mockingbird",
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    totalPages: 336,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780061120084-M.jpg",
  },
  {
    id: "featured-frankenstein",
    title: "Frankenstein",
    author: "Mary Shelley",
    totalPages: 280,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780141439471-M.jpg",
  },
  {
    id: "featured-crime-punishment",
    title: "Crime and Punishment",
    author: "Fyodor Dostoevsky",
    totalPages: 671,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780140449136-M.jpg",
  },
  {
    id: "featured-moby-dick",
    title: "Moby-Dick",
    author: "Herman Melville",
    totalPages: 720,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780142437179-M.jpg",
  },
  {
    id: "featured-brothers-karamazov",
    title: "The Brothers Karamazov",
    author: "Fyodor Dostoevsky",
    totalPages: 824,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780140449266-M.jpg",
  },
  {
    id: "featured-dorian-gray",
    title: "The Picture of Dorian Gray",
    author: "Oscar Wilde",
    totalPages: 254,
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780141439570-M.jpg",
  },
];
const booksPath = (uid) => collection(db, "users", uid, "books");
const readingsPath = (uid, bookId) =>
  collection(db, "users", uid, "books", bookId, "readings");
const errorText = (error) => {
  if (error?.code === "permission-denied") {
    return "Firestore denied this action. Publish the project's firestore.rules in Firebase Console, then try again.";
  }
  if (error?.code === "auth/unauthorized-domain") {
    return "This app's domain is not authorized in Firebase Authentication settings.";
  }
  return (
    error?.message?.replace("Firebase: ", "") ||
    "Something went wrong. Please try again."
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setAuthReady(true);
      return undefined;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), 3600);
  }, []);

  if (!authReady)
    return (
      <main className="loading-screen">
        <span className="spinner" />
        Loading Read Journey…
      </main>
    );

  const firebaseUnavailable = !isFirebaseConfigured;

  return (
    <>
      {firebaseUnavailable && (
        <div className="firebase-warning panel" role="status">
          Firebase is not configured for this deployment yet. Add the
          VITE_FIREBASE_* values to the GitHub Actions environment or local .env
          file and rebuild.
        </div>
      )}
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/recommended" replace />
            ) : (
              <AuthPage mode="welcome" />
            )
          }
        />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/recommended" replace />
            ) : (
              <AuthPage mode="login" notify={notify} />
            )
          }
        />
        <Route
          path="/register"
          element={
            user ? (
              <Navigate to="/recommended" replace />
            ) : (
              <AuthPage mode="register" notify={notify} />
            )
          }
        />
        <Route
          path="/recommended"
          element={
            <Protected user={user}>
              <Shell
                user={user}
                onLogout={async () => {
                  await signOut(auth);
                  notify("You are logged out.");
                }}
              >
                <Recommended user={user} notify={notify} />
              </Shell>
            </Protected>
          }
        />
        <Route
          path="/library"
          element={
            <Protected user={user}>
              <Shell
                user={user}
                onLogout={async () => {
                  await signOut(auth);
                  notify("You are logged out.");
                }}
              >
                <Library user={user} notify={notify} />
              </Shell>
            </Protected>
          }
        />
        <Route
          path="/reading/:bookId"
          element={
            <Protected user={user}>
              <Shell
                user={user}
                onLogout={async () => {
                  await signOut(auth);
                  notify("You are logged out.");
                }}
              >
                <ReadingPage user={user} notify={notify} />
              </Shell>
            </Protected>
          }
        />
        <Route
          path="*"
          element={<Navigate to={user ? "/recommended" : "/"} replace />}
        />
      </Routes>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

function Protected({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

function AuthPage({ mode, notify }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const welcome = mode === "welcome";
  const register = mode === "register";

  async function submit(event) {
    event.preventDefault();
    if (!auth || !db) {
      notify(
        "Firebase is not configured yet. Add the app configuration and rebuild the project.",
      );
      return;
    }
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    if (register && name.length < 2)
      return notify("Enter your name (at least 2 characters).");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return notify("Enter a valid email address.");
    if (password.length < 7)
      return notify("Password must contain at least 7 characters.");
    setBusy(true);
    try {
      if (register) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(credential.user, { displayName: name });
        await setDoc(doc(db, "users", credential.user.uid), {
          displayName: name,
          email,
          createdAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate("/recommended", { replace: true });
    } catch (error) {
      notify(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  if (welcome)
    return (
      <main className="welcome-page">
        <section className="welcome-card">
          <Brand />
          <div className="welcome-copy">
            <h1>
              Expand your
              <br />
              mind, reading <span>a book</span>
            </h1>
            <div className="welcome-actions">
              <Link className="button primary" to="/register">
                Get started
              </Link>
              <Link className="button secondary" to="/login">
                Log in
              </Link>
            </div>
          </div>
        </section>
        <aside className="welcome-art" aria-hidden="true">
          <img
            className="phone-preview"
            src={phonePreview}
            alt=""
            width="411"
            height="656"
          />
        </aside>
      </main>
    );

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Brand />
        <h1 className="auth-title">
          Expand your
          <br />
          mind, reading <span>a book</span>
        </h1>
        <form className="auth-form" onSubmit={submit}>
          {register && (
            <label>
              Name
              <input
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                minLength="2"
                required
              />
            </label>
          )}
          <label>
            Mail:
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Your@email.com"
              required
            />
          </label>
          <label>
            Password:
            <span className="password-input">
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                placeholder="Yourpasswordhere"
                minLength="7"
                required
              />
              <span className="password-eye" aria-hidden="true">
                ◎
              </span>
            </span>
          </label>
          <div className="auth-submit-row">
            <button className="button primary" disabled={busy}>
              {busy ? "Please wait…" : register ? "Registration" : "Log in"}
            </button>
            <Link
              className="auth-inline-link"
              to={register ? "/login" : "/register"}
            >
              {register ? "Already have an account?" : "Don't have an account?"}
            </Link>
          </div>
        </form>
      </section>
      <aside className="auth-art" aria-hidden="true">
        <img
          className="phone-preview"
          src={phonePreview}
          alt=""
          width="411"
          height="656"
        />
      </aside>
      <Link className="auth-back" to="/">
        ← Back to home
      </Link>
    </main>
  );
}

function Brand() {
  return (
    <Link to="/" className="brand">
      <img className="brand-logo" src="/ReadJourney/Logo-1.svg" alt="" />
      <span>READ JOURNEY</span>
    </Link>
  );
}

function Shell({ user, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
        >
          ☰
        </button>
        <nav className={menuOpen ? "main-nav open" : "main-nav"}>
          <Link to="/recommended" onClick={() => setMenuOpen(false)}>
            Discover
          </Link>
          <Link to="/library" onClick={() => setMenuOpen(false)}>
            My library
          </Link>
        </nav>
        <div className="user-menu">
          <span className="avatar">
            {(user.displayName || user.email || "R").slice(0, 1).toUpperCase()}
          </span>
          <span className="user-name">{user.displayName || user.email}</span>
          <button className="text-button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="content-wrap">{children}</main>
      <footer className="footer">
        A little reading goes a long way. <span>Read Journey</span>
      </footer>
    </div>
  );
}

function PageIntro({ eyebrow, title, description, action }) {
  return (
    <div className="page-intro">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function useUserBooks(user) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!user?.uid || !db) {
      setBooks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await getDocs(
        query(booksPath(user.uid), orderBy("createdAt", "desc"), limit(100)),
      );
      setBooks(result.docs.map((item) => ({ id: item.id, ...item.data() })));
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);
  useEffect(() => {
    if (!db || !user?.uid) {
      setBooks([]);
      setLoading(false);
      return;
    }
    refresh().catch(() => setLoading(false));
  }, [refresh, user?.uid]);
  return { books, loading, refresh };
}

function Recommended({ user, notify }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [titleInput, setTitleInput] = useState("");
  const [authorInput, setAuthorInput] = useState("");
  const [filters, setFilters] = useState({ title: "", author: "" });
  const [showManualForm, setShowManualForm] = useState(false);
  const { books, refresh: refreshLibrary } = useUserBooks(user);
  const [busyId, setBusyId] = useState("");

  const firebaseUnavailable = !db;

  useEffect(() => {
    if (!db) {
      setCatalog([]);
      setLoading(false);
      return;
    }

    getDocs(query(collection(db, "catalog"), limit(60)))
      .then((result) => {
        const firestoreBooks = result.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));
        setCatalog(firestoreBooks.length ? firestoreBooks : featuredBooks);
      })
      .catch((error) => {
        setCatalog(featuredBooks);
        notify(errorText(error));
      })
      .finally(() => setLoading(false));
  }, [notify]);

  if (firebaseUnavailable) {
    return (
      <EmptyState
        title="Firebase not configured"
        text="This deployment is missing Firebase keys. Add the project values, then redeploy."
        action={
          <Link className="button primary" to="/">
            Back home
          </Link>
        }
      />
    );
  }

  const owned = new Set(books.map((book) => book.catalogId).filter(Boolean));
  const filtered = catalog.filter((book) => {
    const titleMatches = String(book.title || "")
      .toLowerCase()
      .includes(filters.title.toLowerCase());
    const authorMatches = String(book.author || "")
      .toLowerCase()
      .includes(filters.author.toLowerCase());
    return titleMatches && authorMatches;
  });

  function applyFilters(event) {
    event.preventDefault();
    setFilters({ title: titleInput.trim(), author: authorInput.trim() });
  }

  async function addBook(book) {
    setBusyId(book.id);
    try {
      await addDoc(booksPath(user.uid), {
        title: book.title,
        author: book.author,
        totalPages: Number(book.totalPages) || 0,
        coverUrl: book.coverUrl || "",
        catalogId: book.id,
        status: "unread",
        currentPage: 0,
        createdAt: serverTimestamp(),
      });
      await refreshLibrary();
      notify("Book added to your library.");
    } catch (error) {
      notify(errorText(error));
    } finally {
      setBusyId("");
    }
  }

  async function addManualBook(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    const author = String(data.get("author") || "").trim();
    const totalPages = Number(data.get("totalPages"));
    if (!title || !author || !Number.isInteger(totalPages) || totalPages < 1) {
      return notify("Enter a title, author, and a valid page count.");
    }
    setBusyId("manual");
    try {
      await addDoc(booksPath(user.uid), {
        title,
        author,
        totalPages,
        coverUrl: String(data.get("coverUrl") || "").trim(),
        status: "unread",
        currentPage: 0,
        createdAt: serverTimestamp(),
      });
      await refreshLibrary();
      form.reset();
      setShowManualForm(false);
      notify("Book added to your library.");
    } catch (error) {
      notify(errorText(error));
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="FIND YOUR NEXT READ"
        title="Recommended books"
        description="A good book can take you anywhere. Find one for your next reading session."
      />
      <form className="filter-form" onSubmit={applyFilters}>
        <label className="filter-field">
          <span>Book title</span>
          <input
            value={titleInput}
            onChange={(event) => setTitleInput(event.target.value)}
            placeholder="Enter a book title"
            aria-label="Filter by book title"
          />
        </label>
        <label className="filter-field">
          <span>Author</span>
          <input
            value={authorInput}
            onChange={(event) => setAuthorInput(event.target.value)}
            placeholder="Enter an author name"
            aria-label="Filter by author"
          />
        </label>
        <div className="filter-actions">
          <button className="button primary" type="submit">
            To apply
          </button>
          <span className="result-count" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "book" : "books"}
          </span>
        </div>
      </form>
      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            catalog.length
              ? "No books match your search"
              : "Your discovery shelf is waiting"
          }
          text={
            catalog.length
              ? "Try another title or author."
              : "Add book documents to the Firestore catalog collection to show recommendations here, or add your own books from My library."
          }
          action={
            <button
              className="button primary"
              onClick={() => setShowManualForm((open) => !open)}
            >
              {showManualForm ? "Cancel" : "Add a book to my library"}
            </button>
          }
        />
      ) : (
        <div className="book-grid recommended-grid">
          {filtered.map((book) => (
            <article className="book-card" key={book.id}>
              <Link className="cover-wrap" to="/library">
                <img
                  src={book.coverUrl || defaultCover}
                  alt={`Cover of ${book.title}`}
                  onError={(event) => {
                    event.currentTarget.src = defaultCover;
                  }}
                />
                <span className="cover-overlay">
                  READ MORE <b>↗</b>
                </span>
              </Link>
              <div className="book-info">
                <h2>{book.title}</h2>
                <p>{book.author || "Unknown author"}</p>
                <span className="page-count">
                  {book.totalPages || "—"} pages
                </span>
                <button
                  className="button small primary"
                  disabled={owned.has(book.id) || busyId === book.id}
                  onClick={() => addBook(book)}
                >
                  {owned.has(book.id)
                    ? "In your library"
                    : busyId === book.id
                      ? "Adding…"
                      : "Add to library"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {showManualForm && (
        <form className="add-book-form panel" onSubmit={addManualBook}>
          <div className="form-heading">
            <span className="eyebrow">ADD IT DIRECTLY</span>
            <h2>Book details</h2>
          </div>
          <label>
            Book title
            <input
              name="title"
              placeholder="The Hobbit"
              required
              maxLength="160"
            />
          </label>
          <label>
            Author
            <input
              name="author"
              placeholder="J. R. R. Tolkien"
              required
              maxLength="120"
            />
          </label>
          <label>
            Total pages
            <input
              name="totalPages"
              type="number"
              min="1"
              max="100000"
              placeholder="310"
              required
            />
          </label>
          <label className="wide-field">
            Cover image URL <span className="optional">optional</span>
            <input
              name="coverUrl"
              type="url"
              placeholder="https://example.com/cover.jpg"
            />
          </label>
          <button className="button primary" disabled={busyId === "manual"}>
            {busyId === "manual" ? "Saving…" : "Add to my library"}
          </button>
        </form>
      )}
    </>
  );
}

function Library({ user, notify }) {
  const { books, loading, refresh } = useUserBooks(user);
  const [filter, setFilter] = useState("all");
  const firebaseUnavailable = !db;
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const visibleBooks =
    filter === "all" ? books : books.filter((book) => book.status === filter);

  if (firebaseUnavailable) {
    return (
      <EmptyState
        title="Firebase not configured"
        text="This deployment is missing Firebase keys. Add the project values, then redeploy."
        action={
          <Link className="button primary" to="/">
            Back home
          </Link>
        }
      />
    );
  }

  async function addBook(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    const author = String(data.get("author") || "").trim();
    const totalPages = Number(data.get("totalPages"));
    if (!title || !author || !Number.isInteger(totalPages) || totalPages < 1)
      return notify("Enter a title, author, and a valid page count.");
    setBusy(true);
    try {
      await addDoc(booksPath(user.uid), {
        title,
        author,
        totalPages,
        coverUrl: String(data.get("coverUrl") || "").trim(),
        status: "unread",
        currentPage: 0,
        createdAt: serverTimestamp(),
      });
      form.reset();
      setShowForm(false);
      await refresh();
      notify("Book added to your library.");
    } catch (error) {
      notify(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  async function removeBook(book) {
    if (!window.confirm(`Remove “${book.title}” and its reading diary?`))
      return;
    try {
      const readings = await getDocs(readingsPath(user.uid, book.id));
      await Promise.all(readings.docs.map((item) => deleteDoc(item.ref)));
      await deleteDoc(doc(db, "users", user.uid, "books", book.id));
      await refresh();
      notify("Book removed from your library.");
    } catch (error) {
      notify(errorText(error));
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="YOUR PERSONAL BOOKSHELF"
        title="My library"
        description={`${books.length} ${books.length === 1 ? "book" : "books"} in your reading collection.`}
        action={
          <button
            className="button primary"
            onClick={() => setShowForm((open) => !open)}
          >
            {showForm ? "Close form" : "+ Add a book"}
          </button>
        }
      />
      {showForm && (
        <form className="add-book-form panel" onSubmit={addBook}>
          <div className="form-heading">
            <span className="eyebrow">GROW YOUR SHELF</span>
            <h2>Add a book</h2>
          </div>
          <label>
            Book title
            <input
              name="title"
              placeholder="The book title"
              required
              maxLength="160"
            />
          </label>
          <label>
            Author
            <input
              name="author"
              placeholder="Author name"
              required
              maxLength="120"
            />
          </label>
          <label>
            Total pages
            <input
              name="totalPages"
              type="number"
              min="1"
              max="100000"
              placeholder="320"
              required
            />
          </label>
          <label className="wide-field">
            Cover image URL <span className="optional">optional</span>
            <input
              name="coverUrl"
              type="url"
              placeholder="https://example.com/cover.jpg"
            />
          </label>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Add book"}
          </button>
        </form>
      )}
      <div className="filter-row">
        <div className="filter-tabs" aria-label="Filter library">
          {[
            ["all", "All books"],
            ["unread", "To read"],
            ["reading", "Reading"],
            ["finished", "Finished"],
          ].map(([value, label]) => (
            <button
              className={filter === value ? "filter-tab active" : "filter-tab"}
              key={value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : visibleBooks.length === 0 ? (
        <EmptyState
          title={
            books.length
              ? "Nothing in this filter yet"
              : "Your shelf starts here"
          }
          text={
            books.length
              ? "Choose a different status to see your books."
              : "Add a book manually or find a recommendation to start your personal library."
          }
          action={
            <button
              className="button primary"
              onClick={() => setShowForm(true)}
            >
              + Add a book
            </button>
          }
        />
      ) : (
        <div className="book-grid library-grid">
          {visibleBooks.map((book) => (
            <article className="book-card" key={book.id}>
              <Link className="cover-wrap" to={`/reading/${book.id}`}>
                <img
                  src={book.coverUrl || defaultCover}
                  alt={`Cover of ${book.title}`}
                  onError={(event) => {
                    event.currentTarget.src = defaultCover;
                  }}
                />
                <span className="cover-overlay">
                  OPEN BOOK <b>↗</b>
                </span>
              </Link>
              <div className="book-info">
                <div className="book-title-row">
                  <h2>{book.title}</h2>
                  <button
                    className="icon-button danger"
                    title={`Remove ${book.title}`}
                    aria-label={`Remove ${book.title}`}
                    onClick={() => removeBook(book)}
                  >
                    ×
                  </button>
                </div>
                <p>{book.author}</p>
                <div className="book-progress">
                  <span className={`status-pill ${book.status}`}>
                    {book.status === "finished"
                      ? "Finished"
                      : book.status === "reading"
                        ? "Reading"
                        : "To read"}
                  </span>
                  <span>
                    {book.currentPage || 0}/{book.totalPages} pages
                  </span>
                </div>
                <Link
                  className="button small secondary full"
                  to={`/reading/${book.id}`}
                >
                  View reading details
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function ReadingPage({ user, notify }) {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const firebaseUnavailable = !db;
  const [readings, setReadings] = useState([]);
  const [activeReading, setActiveReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("diary");
  const [complete, setComplete] = useState(false);

  const refresh = useCallback(async () => {
    if (!db || !user?.uid || !bookId) return;
    const bookSnapshot = await getDoc(
      doc(db, "users", user.uid, "books", bookId),
    );
    if (!bookSnapshot.exists()) {
      setBook(null);
      setLoading(false);
      return;
    }
    const nextBook = { id: bookSnapshot.id, ...bookSnapshot.data() };
    setBook(nextBook);
    const diary = await getDocs(
      query(
        readingsPath(user.uid, bookId),
        orderBy("startedAt", "desc"),
        limit(100),
      ),
    );
    setReadings(diary.docs.map((item) => ({ id: item.id, ...item.data() })));
    setActiveReading(
      nextBook.activeReadingId ? nextBook.activeReadingId : null,
    );
    setLoading(false);
  }, [bookId, user.uid]);

  useEffect(() => {
    if (!db || !user?.uid || !bookId) {
      setBook(null);
      setLoading(false);
      return;
    }

    refresh().catch((error) => {
      notify(errorText(error));
      setLoading(false);
    });
  }, [refresh, notify, user?.uid, bookId]);

  if (firebaseUnavailable) {
    return (
      <EmptyState
        title="Firebase not configured"
        text="This deployment is missing Firebase keys. Add the project values, then redeploy."
        action={
          <Link className="button primary" to="/library">
            Back to my library
          </Link>
        }
      />
    );
  }

  async function submitPage(event) {
    event.preventDefault();
    const pageNumber = Number(page);
    if (
      !book ||
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > Number(book.totalPages)
    )
      return notify(
        `Enter a page between 1 and ${book?.totalPages || "the total page count"}.`,
      );
    if (!activeReading && pageNumber < Number(book.currentPage || 0))
      return notify(
        `Start at your current progress (page ${book.currentPage}).`,
      );
    setBusy(true);
    try {
      if (!activeReading) {
        const reading = await addDoc(readingsPath(user.uid, book.id), {
          startPage: pageNumber,
          startedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "users", user.uid, "books", book.id), {
          status: "reading",
          activeReadingId: reading.id,
          currentPage: pageNumber,
        });
        notify("Reading session started.");
      } else {
        const readingRef = doc(
          db,
          "users",
          user.uid,
          "books",
          book.id,
          "readings",
          activeReading,
        );
        const readingSnapshot = await getDoc(readingRef);
        if (!readingSnapshot.exists())
          throw new Error(
            "The active reading session could not be found. Refresh and try again.",
          );
        if (pageNumber < Number(readingSnapshot.data().startPage || 1))
          throw new Error(
            `The stop page cannot be earlier than page ${readingSnapshot.data().startPage}.`,
          );
        const startedAt = readingSnapshot.data().startedAt?.toDate?.();
        const durationMinutes = startedAt
          ? Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000))
          : 1;
        const pagesRead = Math.max(
          0,
          pageNumber - Number(readingSnapshot.data().startPage || 0),
        );
        const finished = pageNumber >= Number(book.totalPages);
        await updateDoc(readingRef, {
          endPage: pageNumber,
          pagesRead,
          durationMinutes,
          finishedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "users", user.uid, "books", book.id), {
          status: finished ? "finished" : "unread",
          currentPage: pageNumber,
          activeReadingId: deleteField(),
        });
        setComplete(finished);
        notify(
          finished
            ? "Book completed—congratulations!"
            : "Reading session saved.",
        );
      }
      setPage("");
      await refresh();
    } catch (error) {
      notify(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  async function deleteReading(readingId) {
    try {
      if (readingId === activeReading) {
        await updateDoc(doc(db, "users", user.uid, "books", bookId), {
          activeReadingId: deleteField(),
          status: "unread",
        });
      }
      await deleteDoc(
        doc(db, "users", user.uid, "books", bookId, "readings", readingId),
      );
      await refresh();
      notify("Reading entry deleted.");
    } catch (error) {
      notify(errorText(error));
    }
  }

  if (loading) return <Loading />;
  if (!book)
    return (
      <EmptyState
        title="Book not found"
        text="This book is not in your library."
        action={
          <Link className="button primary" to="/library">
            Back to my library
          </Link>
        }
      />
    );

  const progress = Math.min(
    100,
    Math.round(
      (Number(book.currentPage || 0) / Number(book.totalPages || 1)) * 100,
    ),
  );
  const totalPagesRead = readings.reduce(
    (sum, item) => sum + Number(item.pagesRead || 0),
    0,
  );
  const totalMinutes = readings.reduce(
    (sum, item) => sum + Number(item.durationMinutes || 0),
    0,
  );
  const averageSpeed = totalMinutes
    ? Math.round((totalPagesRead / totalMinutes) * 60)
    : 0;

  return (
    <>
      <Link className="back-link" to="/library">
        ← Back to my library
      </Link>
      <section className="reading-hero panel">
        <img
          className="reading-cover"
          src={book.coverUrl || defaultCover}
          alt={`Cover of ${book.title}`}
          onError={(event) => {
            event.currentTarget.src = defaultCover;
          }}
        />
        <div className="reading-book-copy">
          <span className="eyebrow">YOUR READING JOURNEY</span>
          <h1>{book.title}</h1>
          <p>{book.author}</p>
          <div className="progress-label">
            <span>
              {book.currentPage || 0} of {book.totalPages} pages
            </span>
            <strong>{progress}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <span className={`status-pill ${book.status}`}>
            {book.status === "finished"
              ? "Finished"
              : book.status === "reading"
                ? "Reading now"
                : "To read"}
          </span>
        </div>
        <div className="reading-form-wrap">
          <span className="eyebrow">
            {activeReading ? "SESSION IN PROGRESS" : "READY WHEN YOU ARE"}
          </span>
          <h2>{activeReading ? "Where did you stop?" : "Start reading"}</h2>
          <form className="page-form" onSubmit={submitPage}>
            <label htmlFor="reading-page">
              {activeReading ? "Last page read" : "Starting page"}
              <input
                id="reading-page"
                type="number"
                min="1"
                max={book.totalPages}
                value={page}
                onChange={(event) => setPage(event.target.value)}
                placeholder={
                  activeReading ? String(book.currentPage || 1) : "1"
                }
                required
              />
            </label>
            <button className="button primary full" disabled={busy}>
              {busy ? "Saving…" : activeReading ? "To stop" : "To start"}
            </button>
          </form>
        </div>
      </section>
      <section className="details-section">
        <div className="details-heading">
          <div>
            <span className="eyebrow">YOUR PROGRESS, YOUR WAY</span>
            <h2>Reading details</h2>
          </div>
          <div className="filter-tabs">
            <button
              className={tab === "diary" ? "filter-tab active" : "filter-tab"}
              onClick={() => setTab("diary")}
            >
              Diary
            </button>
            <button
              className={
                tab === "statistics" ? "filter-tab active" : "filter-tab"
              }
              onClick={() => setTab("statistics")}
            >
              Statistics
            </button>
          </div>
        </div>
        {tab === "diary" ? (
          <section className="diary-list panel">
            {readings.length === 0 ? (
              <div className="empty-inline">
                <span>✳</span>
                <h3>Your reading diary starts here</h3>
                <p>
                  Reading sessions will appear here with dates, pages, and time
                  spent.
                </p>
              </div>
            ) : (
              readings.map((entry) => (
                <article className="diary-entry" key={entry.id}>
                  <div className="diary-date">
                    <strong>
                      {entry.startedAt?.toDate
                        ? entry.startedAt
                            .toDate()
                            .toLocaleDateString(undefined, { day: "2-digit" })
                        : "—"}
                    </strong>
                    <span>
                      {entry.startedAt?.toDate
                        ? entry.startedAt
                            .toDate()
                            .toLocaleDateString(undefined, {
                              month: "short",
                              year: "numeric",
                            })
                        : "Pending"}
                    </span>
                  </div>
                  <div className="diary-summary">
                    <h3>
                      {entry.finishedAt ? "Reading session" : "In progress"}
                    </h3>
                    <p>
                      Pages {entry.startPage}
                      {entry.endPage
                        ? `–${entry.endPage}`
                        : " · session active"}
                    </p>
                  </div>
                  <div className="diary-stats">
                    <span>
                      <strong>{entry.pagesRead || 0}</strong> pages
                    </span>
                    <span>
                      <strong>{entry.durationMinutes || 0}</strong> min
                    </span>
                    <span>
                      <strong>
                        {book.totalPages
                          ? Math.round(
                              ((entry.endPage || book.currentPage || 0) /
                                book.totalPages) *
                                100,
                            )
                          : 0}
                        %
                      </strong>{" "}
                      complete
                    </span>
                  </div>
                  <button
                    className="icon-button danger"
                    aria-label="Delete reading entry"
                    title="Delete reading entry"
                    onClick={() => deleteReading(entry.id)}
                  >
                    ×
                  </button>
                </article>
              ))
            )}
          </section>
        ) : (
          <Statistics
            readings={readings}
            totalPages={book.totalPages}
            currentPage={book.currentPage}
            totalMinutes={totalMinutes}
            totalPagesRead={totalPagesRead}
            averageSpeed={averageSpeed}
          />
        )}
      </section>
      {complete && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setComplete(false)}
        >
          <section
            className="completion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="completion-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="completion-icon">✦</span>
            <span className="eyebrow">A STORY WELL READ</span>
            <h2 id="completion-title">You did it!</h2>
            <p>
              You have finished <strong>{book.title}</strong>. Take a moment to
              celebrate this little big achievement.
            </p>
            <button
              className="button primary full"
              onClick={() => setComplete(false)}
            >
              Lovely, thanks
            </button>
          </section>
        </div>
      )}
    </>
  );
}

function Statistics({
  readings,
  totalPages,
  currentPage,
  totalMinutes,
  totalPagesRead,
  averageSpeed,
}) {
  const chartItems = [...readings].reverse().filter((item) => item.finishedAt);
  const values = chartItems.map((item) => Number(item.pagesRead || 0));
  const max = Math.max(...values, 1);
  return (
    <section className="statistics-grid">
      <article className="stat-card panel">
        <span className="eyebrow">READING PACE</span>
        <div className="stat-value">
          {averageSpeed}
          <small> pages / hour</small>
        </div>
        <p>Average speed across finished sessions</p>
      </article>
      <article className="stat-card panel">
        <span className="eyebrow">TIME WELL SPENT</span>
        <div className="stat-value">
          {Math.floor(totalMinutes / 60)}
          <small> h </small>
          {totalMinutes % 60}
          <small> min</small>
        </div>
        <p>Total time spent with this book</p>
      </article>
      <article className="stat-card panel">
        <span className="eyebrow">BOOK PROGRESS</span>
        <div className="stat-value">
          {totalPages
            ? Math.min(
                100,
                Math.round((Number(currentPage || 0) / totalPages) * 100),
              )
            : 0}
          <small> %</small>
        </div>
        <p>
          {currentPage || 0} of {totalPages} pages reached
        </p>
      </article>
      <article className="chart-card panel">
        <div className="chart-heading">
          <div>
            <span className="eyebrow">SESSION BY SESSION</span>
            <h3>Pages read</h3>
          </div>
          <span className="chart-total">{values.length} sessions</span>
        </div>
        {values.length ? (
          <div
            className="bar-chart"
            role="img"
            aria-label="Pages read in each completed session"
          >
            {values.map((value, index) => (
              <div className="bar-column" key={`${index}-${value}`}>
                <span className="bar-value">{value}</span>
                <div className="bar-track">
                  <span
                    style={{ height: `${Math.max(5, (value / max) * 100)}%` }}
                  />
                </div>
                <span className="bar-label">{index + 1}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-inline">
            <span>↗</span>
            <h3>Your progress is taking shape</h3>
            <p>Finish a reading session to see your pace and pages here.</p>
          </div>
        )}
      </article>
    </section>
  );
}

function Loading() {
  return (
    <div className="loading-block">
      <span className="spinner" />
      Loading your reading space…
    </div>
  );
}
function EmptyState({ title, text, action }) {
  return (
    <section className="empty-state panel">
      <span className="empty-spark">✳</span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </section>
  );
}

export default App;
