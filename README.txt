AQUAGUARD - COMPLETE PROJECT
============================

WHAT IS INCLUDED
- Responsive dashboard
- District filter for Nandyal, Annamayya and YSR Kadapa
- Village shortage ranking using a priority score
- Greedy + priority-based tanker dispatch schedule
- Interactive map with illustrative village markers
- Add village form
- Excel import and export
- Express backend and MySQL schema

IMPORTANT DATA NOTE
The 30 village rows in data/villages.json are DEMONSTRATION DATA, not verified official statistics.
Replace them with verified government/field data before describing them as real data.
Map pins are approximate district-area placeholders until you add verified latitude/longitude.
The map does NOT show real GPS vehicle tracking. Real-time tracking requires a GPS device/API.
The schedule is a project simulation, not a real dispatch service.

RUN ON WINDOWS
1. Install Node.js LTS from https://nodejs.org/
2. Restart the laptop after installation.
3. Open the extracted AQUAGUARD_Complete_Project folder in VS Code.
4. In VS Code select Terminal > New Terminal.
5. Run: npm install
6. Run: npm start
7. Open: http://localhost:8080

If 'npm is not recognised':
- Install Node.js LTS from nodejs.org
- Close all VS Code windows and open VS Code again.
- In terminal run: node -v
- Then run: npm -v
If both show version numbers, run npm install.

DATABASE
The project runs immediately using local JSON storage. This is convenient for the first demo.
For MySQL setup:
1. Open MySQL Workbench.
2. Open database/schema.sql and execute it.
3. Set these environment variables before starting:
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=water_tanker_db

Note: this starter currently uses local JSON storage for village CRUD and scheduling.
The SQL schema is supplied as the MySQL database design for your academic explanation;
MySQL persistence still needs to be wired into the API before claiming the live data is stored in MySQL.

EXCEL COLUMNS
District Name
Village Name
Population
Total Water Requirement (L)
Available Water (L)
Shortage Severity
Distance (km)

ALGORITHM
Priority score =
(Shortage Severity * 0.6)
+ (min(Population / 1000, 10) * 0.4)
+ (Water Shortage / Required Water * 20)

The dispatch API sorts villages by priority score (highest first), then allocates tanker capacity until the available fleet is used or the deficits are covered.
