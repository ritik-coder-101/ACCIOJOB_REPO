# 🚀 AI-Driven Micro-Frontend Playground

## 📖 Overview

This project is a sophisticated, full-stack, AI-driven platform designed to empower developers to rapidly generate, preview, and iteratively refine React, HTML, and CSS components. Leveraging Google's Gemini 1.5 Flash LLM, it transforms natural language prompts (including image inputs) into live, interactive code, all within a secure, in-browser sandbox.

It stands as a testament to modern web development principles, combining conversational AI with micro-frontend architecture and robust state management.

## ✨ Features & Highlights

* **User Authentication & Persistence:**
    * Secure Email/Password Signup & Login with JWT (JSON Web Tokens).
    * Protected API routes ensuring data security.
    * Stateful sessions: Users can create new "workspaces" and load previous sessions, preserving full chat history, generated code, and UI editor state.

* **Conversational AI for Component Generation:**
    * Intuitive chat interface for submitting prompts to the AI backend.
    * **Multimodal Input:** Supports both text and image uploads for richer AI context (e.g., "build a component that looks like this image").
    * AI (Google Gemini 1.5 Flash) intelligently processes prompts and responds with component code (JSX/TSX, CSS, HTML).
    * **Iterative Refinement:** The AI understands conversational context, allowing users to send follow-up prompts to modify and "patch" existing components.

* **Live Component Preview (Micro-Frontend Sandbox):**
    * Dedicated "Render" button per AI message to instantly bring specific generated code to life.
    * Secure `<iframe>` sandbox dynamically renders HTML/React components, completely isolated from the main application to prevent conflicts and ensure safety.
    * Leverages client-side Babel transpilation (`@babel/standalone`) and `eval()` for on-the-fly code execution within the iframe.

* **Code Inspection & Export:**
    * Interactive tabs (JSX, CSS, HTML) within the live preview modal for easy code inspection.
    * Syntax highlighting (using `react-syntax-highlighter`) for enhanced readability.
    * "Copy to Clipboard" buttons for individual code snippets.
    * "Download All (.zip)" functionality (using `jszip` and `file-saver`) to export complete components.

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** MongoDB Atlas (Cloud-hosted NoSQL)
* **AI/LLM:** Google Gemini 1.5 Flash (via `@google/generative-ai` SDK)
* **Frontend:** React, Next.js (App Router), TypeScript, Tailwind CSS
* **Deployment:** Render (Backend), Vercel (Frontend)
* **Key Libraries:** `bcryptjs`, `jsonwebtoken`, `mongoose`, `cors`, `jszip`, `file-saver`, `react-syntax-highlighter`, `@babel/standalone`.

## 📐 Architecture & Design Decisions

### **Monorepo Structure**
The project is organized as a monorepo (`ACCIOJOB_REPO`) containing two distinct applications:
* `ACCIOJOB-BACK`: Node.js Express API.
* `ACCIOJOB-FRONT`: Next.js React frontend.
This separation facilitates independent development, scaling, and deployment.

### **State Management & Persistence Strategy**
* **Backend Persistence:** User accounts and all session data (chat history, `generated_code`, `ui_editor_state`) are robustly stored in **MongoDB Atlas**. Mongoose schemas define the flexible document structure.
* **Frontend State:** React's `useState` and `useRef` manage local component state. A custom `AuthContext` (using `createContext` and `useContext`) provides global authentication state (`user`, `token`, `loading`) accessible throughout the app, persisted across page reloads via `localStorage`.
* **Auto-Save:** User prompts and AI responses trigger an automatic `PUT` request to the backend, ensuring work is continuously saved to the database.

### **AI Integration Flow**
1.  **Frontend (`DashboardPage`):** Collects `promptInput` (text + optional `imageFile` converted to Base64), and sends `chat_history` and `currentGeneratedCode` from `selectedSession` as context.
2.  **Backend (`aiRoutes.js`):**
    * Receives multimodal input and context.
    * Constructs a detailed `contents` array for `model.generateContent`, incorporating `systemInstruction` for explicit AI behavior (e.g., formatting code in Markdown, avoiding `import` statements).
    * Calls Google Gemini 1.5 Flash API.
    * Parses the AI's full response to extract `aiText`, `generatedJsx`, `generatedCss`, and `generatedHtml` using regular expressions.
    * Sends this structured response back to the frontend.
3.  **Iterative Refinement:** By providing `chat_history` and `currentGeneratedCode` with each prompt, the AI gains "memory" and "awareness" of the previous component state, enabling it to intelligently modify its output based on follow-up instructions.

### **Micro-Frontend Live Preview (Key Decisions)**
* **`<iframe>` Sandbox:** Chosen for strong security and isolation. Dynamically executed AI code runs within its own document context, preventing CSS/JS conflicts or malicious code from affecting the parent application.
* **`public/preview-frame.html`:** A dedicated HTML file loaded into the `iframe`. This allows for explicit loading of `React`, `ReactDOM`, and `@babel/standalone` CDNs directly within the sandbox, providing a lightweight, self-contained execution environment.
* **`window.postMessage()`:** Used for secure, bidirectional communication between the main app (parent) and the `iframe` (child). Code snippets are sent this way.
* **Dynamic Code Execution (`eval()` with caution):**
    * AI-generated JSX/TSX/HTML is dynamically rendered.
    * Babel Standalone (`@babel/standalone`) transpiles JSX/TSX to plain JavaScript in the browser.
    * `eval()` is used to execute the transpiled JavaScript. This is acceptable in a controlled, sandboxed `iframe` environment where external script access is limited by `sandbox` attributes, and code is coming from a trusted AI source.
    * **Stripping Logic:** Robust regular expressions are applied to `jsxCode` to remove `import`, `export`, `useNavigate`, `styled-components`, and other problematic module-specific or external library syntax *before* transpilation, ensuring the code is pure and executable by `eval()` in a non-module context.
    * **Global Component Assignment:** Generated React components are explicitly assigned to `window.DynamicGeneratedComponent` within the iframe's scope to ensure `ReactDOM.createRoot().render()` can access them by a known name.

### **CORS Management**
* Backend (`server.js`) explicitly whitelists allowed origins (localhost, Vercel frontend URL) for `cors` middleware, ensuring secure cross-origin communication in production.

## 🚀 Live Demo & Deployment

* **Live Frontend URL:** [**https://acciojob-repo.vercel.app/**](https://acciojob-repo.vercel.app/)
* **Live Backend URL:** [**https://ritik-acciojob-repo.onrender.com**](https://ritik-acciojob-repo.onrender.com)

## ⚡ Quick Start (Local Development)

To run this project locally, follow these steps:

1.  **Clone the Monorepo:**
    ```bash
    git clone [https://github.com/YOUR_GITHUB_USERNAME/ACCIOJOB_REPO.git](https://github.com/YOUR_GITHUB_USERNAME/ACCIOJOB_REPO.git)
    cd ACCIOJOB_REPO
    ```

2.  **Backend Setup (`ACCIOJOB-BACK`):**
    * Navigate into the backend directory:
        ```bash
        cd ACCIOJOB-BACK
        ```
    * Install dependencies:
        ```bash
        npm install
        ```
    * Create a `.env` file in `ACCIOJOB-BACK` with the following:
        ```env
        PORT=5000
        MONGO_URI="YOUR_MONGODB_ATLAS_CONNECTION_STRING_HERE" # Replace with your Atlas URI
        JWT_SECRET="YOUR_LOCAL_JWT_SECRET" # A long, random string
        JWT_EXPIRES_IN="1d"
        GEMINI_API_KEY="YOUR_GOOGLE_GEMINI_API_KEY"
        ```
    * Start the backend server:
        ```bash
        npm run dev
        ```
    * Ensure your local MongoDB instance is running, or that your MongoDB Atlas development IP is whitelisted.

3.  **Frontend Setup (`ACCIOJOB-FRONT`):**
    * Open a **new terminal** and navigate into the frontend directory:
        ```bash
        cd ACCIOJOB-FRONT
        ```
    * Install dependencies:
        ```bash
        npm install
        ```
    * Create a `.env.local` file in `ACCIOJOB-FRONT` with the following:
        ```env
        NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"
        ```
    * Start the frontend development server:
        ```bash
        npm run dev
        ```

4.  **Access Locally:**
    * Open your browser and visit `http://localhost:3000`.

## 📄 Deliverables Checklist (Completed)

* [x] Signup / Login (email+password)
* [x] Protected routes; validate tokens server-side.
* [x] Load Previous Sessions: list and select saved “work.”
* [x] Create New Session: initialize an empty slate.
* [x] Side-panel chat (text + image inputs) → submits prompts to AI.
* [x] AI responds with component code (JSX/TSX, CSS, HTML).
* [x] Render generated component live in the central viewport as a micro-frontend.
* [x] Below the preview: show tabs for “JSX/TSX,” “CSS,” “HTML” (syntax-highlighted).
* [x] Provide Copy and Download (.zip) buttons for the entire code.
* [x] Iterative Refinement: Further prompts patch existing component; re-invoke AI, apply deltas, and re-render.
* [x] Statefulness & Resume: Auto-save after every chat turn; full chat history, latest generated code, and rendered preview state resume on login/page reload (user clicks render).

---
