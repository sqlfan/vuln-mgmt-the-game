Vuln Management: Secure The Business

Vuln Management is a turn-based resource management simulation game where you step into the shoes of a Security Engineer / CISO. Your mission is to balance the demanding pressure of business objectives against the rising tide of cybersecurity threats.

🎮 Gameplay Overview

Each turn represents a Sprint (2 weeks). You have a limited amount of Capacity (Action Points) to spend on competing priorities.

Core Resources

Business Health (HP): Represents system uptime and integrity. If this hits 0, the system is compromised and you lose.

Business Output (Score): Represents value delivered to the company. Earn points by shipping features and completing work items.

Capacity: Your team's bandwidth. Used to patch, build, train, or automate.

The Threats 🛡️

CVEs (Vulnerabilities): These spawn randomly. Each has a CVSS score (Severity).

SLA Timers: You have a specific number of days to patch based on severity (e.g., Criticals = 7 days).

Breach: If a CVE goes overdue, it deals double damage.

Zero-Days: Some threats appear without a patch available. You must survive until the vendor releases a fix.

Mandatory Work Items: Blue cards represent business requirements (Audits, Upgrades). These MUST be completed in the current sprint or you face heavy penalties.

Strategic Actions

Patch: Remove a vulnerability permanently.

Exception (Defer): Stop the clock on a vulnerability. Costs 1 Capacity/Sprint to maintain. Risk: Significantly increases the chance of a random Malicious Exploit event.

Build Features: Convert remaining capacity into Business Output. Risk: Increases the spawn rate of bugs/vulnerabilities in the next sprint.

Train Team: Permanently reduces the rate at which new vulnerabilities appear.

Automate: Permanently reduces the capacity cost of patching.

🕹️ Game Modes

Standard Operation: Survive 365 Days (26 Sprints). Reach the end to win.

Endless Defense: Play until your infrastructure is compromised. High score run.

🚀 Getting Started

Prerequisites

Node.js (v18+)

npm

Installation

Clone the repository:

git clone [https://github.com/YOUR_USERNAME/vuln-mgmt-the-game.git](https://github.com/YOUR_USERNAME/vuln-mgmt-the-game.git)
cd vuln-mgmt-the-game


Install dependencies:

npm install


Run the development server:

npm run dev


Open your browser to the local URL provided (usually http://localhost:5173).

📦 Deployment

This project is configured for GitHub Actions.

Go to your repository Settings > Pages.

Set Source to GitHub Actions.

Push your changes to the main or master branch.

The workflow in .github/workflows/deploy.yml will automatically build and deploy the game to GitHub Pages.

🛠️ Built With

React - UI Framework

Vite - Build Tool

Tailwind CSS - Styling

Lucide React - Icons

📄 License

This project is open source and available under the MIT License.
