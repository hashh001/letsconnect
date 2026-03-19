# ECA-Connect 🌐

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/eca-connect/releases/tag/v1.0.0)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> **Connect Real People in Real Time**

**ECA-Connect** is a hyper-local social platform designed to solve the biggest friction point in meeting new people: **Scheduling Conflicts**. Instead of relying solely on shared interests, ECA-Connect introduces an *availability-first* methodology, matching users who are free at the exact same minute.

Whether you're looking for a badminton partner for Saturday evening or a coding buddy for Sunday morning, ECA-Connect calculates precise temporal alignment to find groups that fit seamlessly into your schedule and geographical radius.

---

## 🚀 Key Features

### 🕒 Availability-First Matching
*   **Smart Scheduling:** Define your recurring availability windows to the minute.
*   **Instant Calibration:** The system aggressively filters out candidate groups that clash with your schedule.
*   **Time Overlap Score:** Events are mathematically ranked higher if their duration perfectly overlaps with your free time.

### 📍 Hyper-Local Discovery
*   **Radius Filtering:** Set strict geographical bounds for your activities.
*   **Smart Routing:** Integrates **OSRM (Open Source Routing Machine)** to calculate route-aware travel distances rather than naive straight-line paths.
*   **Distance Decay:** Applies a linear decay function to prioritize highly localized groups.

### 🧠 Intelligent Ranking Engine
At the core of ECA-Connect is a custom client-side algorithm that scores every potential match. The Compatibility Score calculates:
*   **Interest Match (40%)**: Overlap between user and group semantic tags.
*   **Time Overlap (30%)**: Minute-by-minute temporal alignment.
*   **Distance (15%)**: OSRM-routed proximity.
*   **Group Health (7%)**: Recency, normalized messaging, and attendance rates.
*   **Skill Level (5%)**: Proficiency alignment.
*   **Text Relevance (3%)**: Semantic search relevance.

### 📄 Research & Architecture
ECA-Connect is backed by formal academic methodologies. Please review the included **[`paper.md`](./paper.md)** for a deep dive into the system design!
*   **Algorithmic Formalization:** Mathematical definitions for Time Overlap and Distance Decay.
*   **System Architecture:** UML and flowchart diagrams (available in the `images/` directory).
*   **Simulated Experiments:** Evaluation protocols for urban and rural deployment scenarios.
*   **Privacy-by-Design:** Double-blind coordination and ephemeral coordinate sharing.

---

## 🛠️ Technology Stack
*   **Frontend**: Vanilla HTML5, CSS3 (Custom Properties/Variables), JavaScript (ES6 Modules).
*   **Backend**: Google Firebase (Authentication, Firestore).
*   **Routing & Maps**: OSRM API (Routing), Nominatim (Geocoding/Reverse Geocoding).
*   **Design**: Custom dual-theme (Dark/Light) WCAG-compliant design system.

---

## 📂 Project Structure
```bash
ECA-Connect/
├── paper.md                # Formal research methodology & architecture
├── LICENSE                 # Apache 2.0 Open Source License
├── images/                 # Architecture flowcharts and UI mockups
├── index.html              # Landing page
├── css/                    # Stylesheets
├── js/                     # Application Logic (Routing, Ranking, Services)
├── pages/                  # App Views (Dashboard, Profile, Auth)
└── firestore.rules         # Database security constraints
```

---

## 🚦 Getting Started

### Prerequisites
*   A modern web browser (Chrome, Firefox, Edge).
*   A local web server (e.g., VS Code "Live Server" extension, Python `http.server`, or `npx live-server`).
*   *(Optional)* Your own Firebase Project credentials.

### Installation
1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/eca-connect.git
    cd eca-connect
    ```
2.  **Configure Firebase**
    Rename the template config file:
    ```bash
    cp js/firebase-config.example.js js/firebase-config.js
    ```
    Replace placeholder values with your Firebase keys. *(Keep this file secure and off public repositories).*
3.  **Run Locally**
    ```bash
    npx live-server .
    ```

---

## 🤝 Contributing
1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License
Distributed under the **Apache License 2.0**. See `LICENSE` for more information.

---
*Developed with ❤️ by the ECA-Connect Team.*
