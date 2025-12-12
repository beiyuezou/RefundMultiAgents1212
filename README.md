# Refund Multi-Agents (旅行退款多智能体系统)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange)

An accessible, local-first AI web application designed to help travelers fight for refunds. It uses a multi-agent AI system to extract evidence, analyze legal policies, and generate professional appeal letters.

## 🌟 Features

*   **Multi-Agent Workflow**:
    *   🕵️‍♂️ **Sherlock (Extraction Agent)**: Reads receipts, tickets, and audio notes to extract structured data.
    *   ⚖️ **Watson (Policy Agent)**: Analyzes the situation against international consumer laws to estimate refund probability.
    *   ✍️ **Writer Agent**: Generates formal, legally-sound appeal letters in seconds.
*   **Multimodal Input**: Upload images, PDFs, videos, or use **Voice Recording** (Speech-to-Text) to explain your situation.
*   **Local-First Privacy**: All your case history and files are stored locally in your browser (IndexedDB). Nothing is sent to a backend server (except strictly to the Gemini API for processing).
*   **Accessibility First**:
    *   High Contrast Mode.
    *   Adjustable Font Sizes.
    *   Screen Reader Friendly.
*   **Multilingual Support**: Full support for English, Chinese (Simplified), and Spanish.

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript, Tailwind CSS.
*   **AI**: Google Gemini API (`gemini-2.5-flash` for speed, `gemini-3-pro-preview` for reasoning).
*   **Storage**: IndexedDB (via native API, no external libs).
*   **Tooling**: Vite (implied structure), ES Modules.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18+)
*   A Google Cloud Project with the **Gemini API** enabled.
*   An API Key.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/refund-multi-agents.git
    cd refund-multi-agents
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**
    Create a `.env` file in the root directory:
    ```env
    API_KEY=your_google_gemini_api_key_here
    ```

4.  **Run the application**
    ```bash
    npm start
    ```

## 📂 Project Structure

```
/
├── components/         # UI Components (AgentCard, ChatBot, etc.)
├── services/          
│   ├── geminiService.ts # AI Logic (Multi-agent orchestration)
│   └── db.ts            # IndexedDB Wrapper
├── types.ts            # TypeScript Interfaces
├── constants.ts        # Translations & Templates
├── App.tsx             # Main Logic Controller
└── index.tsx           # Entry Point
```

## 🛡️ Privacy & Security

*   **No Backend**: We do not store your data. Everything lives in your browser.
*   **API Usage**: Data is sent to Google Gemini API for processing. Please review [Google's Generative AI Terms](https://policies.google.com/terms) regarding data usage.

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
