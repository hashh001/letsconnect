# ECA-Connect 🌐

> **Connect Real People in Real Time**

**ECA-Connect** is a location-based social platform designed to solve the biggest problem in meeting new people: **Scheduling Conflicts**. Instead of just matching interests, ECA-Connect matches users who are free at the *exact same time*.

Whether you're looking for a badminton partner for Saturday evening or a coding buddy for Sunday morning, ECA-Connect finds groups that fit your schedule and location.

---

## 🚀 Key Features

### 🕒 Availability-First Matching
*   **Smart Scheduling:** Define your clear availability windows (e.g., "Saturday 18:00-21:00").
*   **Instant Calibration:** The system filters out groups that clash with your schedule.
*   **Time Overlap Score:** Groups are ranked higher if their event duration perfectly overlaps with your free time.

### 📍 Hyper-Local Discovery
*   **Radius Filtering:** Find activities within your preferred distance (e.g., 5km, 10km).
*   **Smart Routing:** Uses **OSRM (Open Source Routing Machine)** to calculate real driving/walking distances, not just straight-line paths.
*   **Visual Distances:** See exactly how far a group meets from your location.

### 🧠 Intelligent Ranking Engine
Our custom `ranking-engine-fixed.js` scores every potential group match based on a weighted mathematical algorithm. The system computes a Compatibility Score (`S`) using the formula: `S = Σ(wi * Ci)`, comprising:

*   **Interest Match (40%)**: Jaccard-like intersection computing percentage overlap between user tags and group tags.
*   **Time Overlap (30%)**: The exact minute-by-minute overlap between the user's free time window and the event duration.
*   **Distance (15%)**: A linear decay function based on proximity within the user's radius using OSRM routed distances.
*   **Group Health (7%)**: A composite score measuring group recency, normalized message activity, and member attendance rates.
*   **Skill Level (5%)**: Matches beginners with beginners, experts with experts.
*   **Text Relevance (3%)**: Semantic relevance of search queries against group metadata.

### 📄 Research & Evaluation
To formally document the architecture and evaluate the availability-first matching paradigm, an academic research paper (`research_paper.pdf`) has been developed alongside the platform. 

The paper details:
- Simulated urban and suburban experimental designs.
- Formal definitions of the Time Overlap and Distance Decay formulas.
- Complexity analysis of the client-side ranking engine.
- A Privacy-by-design data retention policy utilizing Firestore and OSRM.

---

## 🛠️ Technology Stack

*   **Frontend**: Vanilla HTML5, CSS3 (Custom Properties/Variables), JavaScript (ES6 Modules).
*   **Backend / Database**: Google Firebase (Authentication, Firestore).
*   **Routing & Maps**: OSRM API (Routing), Nominatim (Geocoding/Reverse Geocoding).
*   **Design**: Custom CSS design system (no external UI frameworks).

---

## 📂 Project Structure

```bash
ECA-Connect/
├── index.html              # Landing page
├── css/                    # Stylesheets
│   └── styles.css          # Main variables & component styles
├── js/                     # Application Logic
│   ├── services/           # Firebase & Data interactions
│   │   ├── auth-service.js
│   │   ├── firestore-service.js
│   │   └── group-service.js
│   ├── ranking-engine.js   # Core matching algorithm
│   ├── route-utils.js      # OSRM & Geocoding helpers
│   └── app.js              # Main application controller
├── pages/                  # App Views
│   ├── dashboard.html      # Main user interface
│   ├── profile.html        # User profile management
│   ├── create-group.html   # Group creation wizard
│   └── login/signup.html   # Auth pages
└── firestore.rules         # Database security rules
```

---

## 🚦 Getting Started

### Prerequisites
*   A modern web browser (Chrome, Firefox, Edge).
*   A local web server (e.g., VS Code "Live Server" extension, Python `http.server`, or `npm install -g live-server`).
*   *(Optional)* A Firebase project if you want to connect your own backend.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/eca-connect.git
    cd eca-connect
    ```

2.  **Configure Firebase**
    *   A template config file is included in the repo. Copy and rename it:
    ```bash
    cp js/firebase-config.example.js js/firebase-config.js
    ```
    *   Open `js/firebase-config.js` and replace the placeholder values with your own Firebase project keys (found in [Firebase Console](https://console.firebase.google.com/) → Project Settings → Your apps).
    > **Note:** `firebase-config.js` is listed in `.gitignore` and will never be committed — keep your real credentials safe and never share them publicly.

3.  **Run Locally**
    *   If using VS Code, right-click `index.html` and select **"Open with Live Server"**.
    *   Or run via command line:
        ```bash
        npx live-server .
        ```

4.  **Access the App**
    *   Open `http://localhost:5500` (or the port provided by your server).

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the project.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Developed with ❤️ by the ECA-Connect Team.
