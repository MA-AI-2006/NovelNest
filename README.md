# 📚 NovelNest Reader — Your Aesthetic AI Reading Sanctuary

> **Live Deployed URL:** [https://novelnest-917375306060.asia-southeast1.run.app](https://novelnest-917375306060.asia-southeast1.run.app)

---

## 🌟 Concept & Problem Solver

### The Real-World Problem
Modern reading apps are often sterile, transaction-focused marketplaces or cluttered data grids that treat reading like a chore to log. They lack soul, offer no warm interactive engagement, and fail to provide a cohesive, distraction-free environment that encourages readers to stay immersed. Furthermore, when readers want to talk about their books, they face two massive hurdles:
1. **The Spoiler Minefield:** Looking up details, character descriptions, or asking questions about a book midway through reading almost always results in major plot twists being spoiled.
2. **Reviewer Block:** After completing a great book, writing an eloquent review for the community can feel daunting, leading to blank-page anxiety.

### The Solution: NovelNest
**NovelNest** is an aesthetic, cozy, and distractions-free sanctuary designed to make reading delightful, social, and deeply personal. It solves the core problems of modern readers by introducing:
*   **A Page-by-Page Interactive Reader:** Read classic public-domain literature in a gorgeous, fully customized digital reader.
*   **The Spoiler-Safe Companion:** An AI sidekick that walks with you page-by-page, dynamically locking its knowledge base to the exact page you are on so you can ask questions without ever spoiling the ending.
*   **The Lazy Reviewer:** A fun, casual review-generator that turns quick multi-choice reactions (like "who did you want to throw into the sun?") into beautiful, articulate book reviews.
*   **Vibe-Based Discovery:** An atmospheric search tool that recommends books based on a requested mood (e.g., "rainy coffee shop with a hint of mystery").
*   **Witty Monthly Wrap-Ups:** A playful, slightly sassy AI reading mentor that roasts or celebrates your reading traits, DNF habits, and rating streaks.
*   **Cozy Community Forum:** A fully active social timeline where users share milestones, thoughts, and reviews, allowing real-time interaction (likes and replies).

---

## ⚡ Core Features

1.  **Digital Book Shelf & Library Catalog:** Organize your personal library. Filter books by status (*To Read*, *Reading*, *Completed*, *DNF - Did Not Finish*), track page-level progress, and rate your books.
2.  **Global Search & Dynamic Ingest:** Search global book catalogs. If the external Google Books API is down or throttled, a **Gemini AI Fallback Engine** takes over, generating structured, real-world search matches on the fly.
3.  **Digital Page-by-Page Reader:** A responsive, elegant digital e-reader with tracking margins, adjustable typography, and integrated reading statistics.
4.  **Community Forum Hub:** Write custom discussion posts, review books, and post reading milestones. Users can toggle likes and add nested replies to engage in cozy community book circles.
5.  **Streak & Habit Dashboard:** Visualize your consistency with an elegant, retro-inspired streak calendar. Monitor consecutive active reading days, longest streaks, and total reading hours.
6.  **Secure Authentication Options:** Access the portal instantly in **Guest Offline Mode**, log in securely via standard email credentials, or authenticate using client-side **Google Sign-In** with automatic fallback to server-side **Google Sandbox OAuth** if running inside preview environments.
7.  **Server-Synced Cloud Backup:** All books, reading progress, streaks, and community posts sync automatically to a secure **Firebase Firestore** cloud database whenever you are logged in.

---

## 🤖 The AI Features & Prompts Behind Them

NovelNest integrates **five distinct, fully-realized server-side AI endpoints** powered by the **Gemini 2.5/3.5 Flash** models using the modern `@google/genai` SDK.

### 1. Spoiler-Safe Reading Companion
An intelligent reading companion that answers questions about characters, themes, or plotlines up to the user's exact current page, refusing to reveal any future events.

*   **How it works:** When you open the digital reader, the companion panel appears. It passes your current page number to the backend to create a dynamic, sandboxed context window.
*   **System Prompt:**
    ```text
    You are a helpful, delightful, and spoiler-safe reading companion for the book "{bookTitle}" by {bookAuthor || 'Unknown'}.
    The user is currently reading this book and has read up to page {currentPage} out of a total of {pageCount} pages.
    Your absolute highest-priority directive is: STRICTLY do NOT reveal, hint at, discuss, or reference any events, plot twists, character developments, character deaths, or details that occur AFTER page {currentPage} of this book.
    Answer the user's questions about the plot, characters, theme, or structure using ONLY plot details and events up to page {currentPage}.
    If answering a question requires referencing events from page {currentPage + 1} or later, you MUST politely decline to answer, explaining that doing so would reveal spoilers beyond page {currentPage}.
    Keep your responses friendly, insightful, cozy, and concise.
    ```

### 2. Vibe-Based Book Discovery
Recommend custom literary masterpieces matching a exact atmospheric sentiment rather than traditional genres.

*   **How it works:** Input a personalized vibe or mood (e.g., *"foggy Victorian streets with a dark secret"*). The AI scans your existing library catalog to suggest fitting internal items, and fills remaining recommendations with acclaimed books from world literature.
*   **Instructions:**
    ```text
    The user is looking for book recommendations based on this custom vibe or atmosphere: "{vibePrompt}".
    Here is a list of books they currently have in their local library catalog:
    {bookCatalogSummary}
    
    Recommend exactly 3 books that perfectly fit this vibe. You can recommend some from their catalog if they match, or recommend acclaimed books from standard literature that fit the atmosphere beautifully.
    For each book, provide:
    - title: string
    - author: string
    - description: string (2-3 sentences explaining what the book is about)
    - reason: string (1-2 sentences explaining exactly why this book matches the requested atmosphere/vibe)
    - matchPercentage: integer (between 80 and 100, representing how well it matches)
    - genre: string (the main genre or theme)
    - pageCount: integer (an estimate or real page count)
    ```

### 3. Witty Monthly Wrap-Up (The Sassy Reading Mentor)
An affectionate, slightly cheeky reading mentor that analyzes your shelf, ratings, active streaks, and DNFs to write an entertaining, highly personalized profile wrap-up.

*   **How it works:** Computes your current shelf stats and streak patterns and generates a structured, conversational roaster story.
*   **Instructions:**
    ```text
    Analyze the following user's reading history, bookshelf, and stats:
    {catalogDetails}
    Streak Info: {streakDetails}
    
    Write a highly humorous, witty, and personalized reading profile wrap-up story.
    Act as an affectionate but slightly sassy AI reading mentor. Poke gentle, loving fun at their reading traits, DNF books, perfect 5-star ratings, page-logging streaks, and favorite genres. Tell them exactly what kind of reader they are in a funny custom profile title (e.g. "The Sleep-Deprived Space Cadet" or "The Tragedy Hoarder").
    Write in a structured, conversational style using standard Markdown (e.g. bold accents, lists).
    Keep it engaging, entertaining, and around 200-300 words.
    ```

### 4. The Lazy Reviewer
Transforms short, spontaneous, multi-choice feelings and opinions into full-length, beautifully structured, and natural-sounding book reviews.

*   **How it works:** Instead of staring at an empty textbox, answer three fun questions: (1) How did the ending make you feel? (2) Which character did you want to throw into the sun? (3) Describe the pacing in one word. The AI synthesizes these raw inputs into a warm, human-like book review.
*   **Instructions:**
    ```text
    Draft an expressive, lively, and engaging book review for the book "{title}" by {author}.
    The user has completed this book and gave these quick, fun multi-choice answers about their reading experience:
    1. How did the ending make you feel? Answer: "{q1}"
    2. Which character did you want to throw into the sun, and why? Answer: "{q2}"
    3. Describe the book's pacing in one word or short phrase: Answer: "{q3}"
    
    Write the review from a first-person perspective ("I"). It should sound spontaneous, heartfelt, fun, and authentic—like a warm, active member of a cozy community reading circle sharing their honest thoughts in a chat channel or forum.
    Write the review text directly, without any intro like "Here is your review". Keep it between 100 to 180 words.
    ```

### 5. AI Search Fallback Engine
Automatically steps in when Google Books API limits or throttling occur.

*   **How it works:** Synthesizes realistic, high-quality, and highly accurate volume items, structured precisely according to the Google Books schema, complete with Unsplash cover placeholders.
*   **Instructions:**
    ```text
    The user is searching for books using the search term: "{q}".
    Generate a list of up to {maxResults} relevant real-world books that match this search term perfectly.
    For each book, provide standard details: title, authors, categories, estimated page count, description, and publication date.
    Generate a high-quality Unsplash image representing reading or books for each book cover thumbnail.
    ```

---

## 🛠️ Stack & Technologies Used

*   **Frontend UI:** React 18 with Vite, designed with **Tailwind CSS v4** for a high-contrast sand-and-charcoal visual layout.
*   **Animations & Micro-interactions:** Powered by `motion` (`motion/react`) for smooth page flips, menu slips, and modal transitions.
*   **Vector Icons:** Extensively styled using `lucide-react`.
*   **Full-Stack Backend:** Node.js with Express running on port `3000`.
*   **Server-Side AI SDK:** Google's new official `@google/genai` TypeScript SDK.
*   **Durable Cloud Database:** Google Cloud Firestore (Firebase).
*   **Client & Server Synchronization:** Built-in dual fallbacks to local storage and `db.json` filesystem structures when offline or when database credentials are not loaded, guaranteeing zero friction for the user.
*   **Production Deployment:** Containerized and hosted live on **Google Cloud Run**.

---

## 📸 Application Screenshots (Core Views)

1.  **📚 The Aesthetic Bookshelf (Primary Dashboard)**
    *   *Description:* A beautiful, retro-modern dashboard containing your active reading lists, progress slider bars, sorting cards, and a live tracking calendar of your reading streak consistency.
2.  **📖 The Digital Reader & Spoiler-Safe Companion**
    *   *Description:* A minimalist display showing public classic texts side-by-side with an integrated chat pane. Here, your page-locked AI companion answers questions while keeping future twists completely safe.
3.  **💬 Cozy Community Forum**
    *   *Description:* An interactive board showing thoughts, reviews, and achievements uploaded by fellow readers. Users can post, add comments, and like posts directly.

---

## 🚀 How to Run the Project Locally

### Prerequisites
*   Node.js (v18+)
*   A Gemini API Key (obtained from [Google AI Studio](https://aistudio.google.com/))
*   *(Optional)* A Firebase Web Config for cloud-syncing profiles.

### Installation Steps

1.  **Clone the Repository:**
    ```bash
    git clone <your-public-github-repo-link>
    cd novelnest
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Set Up Environment Variables:**
    Create a `.env` file in the root directory and add your keys (never commit this file to GitHub):
    ```env
    PORT=3000
    GEMINI_API_KEY=your_gemini_api_key_here
    
    # Optional - Google Client ID / Secret for OAuth
    CLIENT_ID=your_google_client_id
    CLIENT_SECRET=your_google_client_secret
    
    # Optional - Deployed Application URL
    APP_URL=http://localhost:3000
    ```

4.  **Run in Development Mode:**
    ```bash
    npm run dev
    ```
    This starts the full-stack server. Open your browser and navigate to `http://localhost:3000` to start reading!

5.  **Build for Production:**
    ```bash
    npm run build
    ```
    This compiles the client asset bundle using Vite and compiles the Express backend server into `dist/server.cjs` using `esbuild`.

6.  **Start Production Server:**
    ```bash
    npm run start
    ```

---

## 🎖️ Honor Code & Originality Statement
This project is built as an original final project submission. All AI integrations, database synchronizations, e-reader layouts, and community features have been crafted specifically to address real-world reading habits. No third-party templates, code-copying, or tutorial clones were used.
