/* league-data.js — Complete league dataset and xG coefficients for the Football Portal */

var LEAGUE_DATA = {
  'Premier League': {
    country: 'England', tier: 1, season: '2024-25', color: '#8b5cf6',
    avgGoalsPerMatch: 2.76, avgXGPerMatch: 2.68, avgShotsPerMatch: 24.8,
    conversionRate: 11.1, avgXGPerShot: 0.108,
    teams: [
      { name: 'Liverpool', xGFor: 77.2, xGAgainst: 32.1, goalsFor: 81, goalsAgainst: 29, shots: 618, shotsOnTarget: 219 },
      { name: 'Arsenal', xGFor: 72.5, xGAgainst: 34.8, goalsFor: 75, goalsAgainst: 31, shots: 630, shotsOnTarget: 210 },
      { name: 'Man City', xGFor: 68.3, xGAgainst: 38.2, goalsFor: 72, goalsAgainst: 41, shots: 605, shotsOnTarget: 198 },
      { name: 'Chelsea', xGFor: 62.1, xGAgainst: 42.5, goalsFor: 67, goalsAgainst: 39, shots: 590, shotsOnTarget: 185 },
      { name: 'Aston Villa', xGFor: 55.8, xGAgainst: 44.1, goalsFor: 58, goalsAgainst: 47, shots: 520, shotsOnTarget: 170 },
      { name: 'Newcastle', xGFor: 58.2, xGAgainst: 40.3, goalsFor: 61, goalsAgainst: 43, shots: 545, shotsOnTarget: 178 },
      { name: 'Brighton', xGFor: 53.4, xGAgainst: 46.8, goalsFor: 55, goalsAgainst: 50, shots: 560, shotsOnTarget: 175 },
      { name: 'Tottenham', xGFor: 60.1, xGAgainst: 48.5, goalsFor: 63, goalsAgainst: 52, shots: 575, shotsOnTarget: 182 },
      { name: 'Man United', xGFor: 48.2, xGAgainst: 50.1, goalsFor: 44, goalsAgainst: 53, shots: 510, shotsOnTarget: 160 },
      { name: 'Bournemouth', xGFor: 49.5, xGAgainst: 47.3, goalsFor: 52, goalsAgainst: 48, shots: 490, shotsOnTarget: 158 }
    ],
    shotDistribution: [
      { zone: 'Inside 6-yard box', pct: 8, avgXG: 0.38 },
      { zone: '6yd to penalty spot', pct: 22, avgXG: 0.15 },
      { zone: 'Penalty area (wide)', pct: 25, avgXG: 0.08 },
      { zone: 'Edge of box (18-24m)', pct: 28, avgXG: 0.04 },
      { zone: 'Long range (24m+)', pct: 17, avgXG: 0.02 }
    ]
  },
  'La Liga': {
    country: 'Spain', tier: 1, season: '2024-25', color: '#f59e0b',
    avgGoalsPerMatch: 2.62, avgXGPerMatch: 2.55, avgShotsPerMatch: 23.5,
    conversionRate: 11.1, avgXGPerShot: 0.109,
    teams: [
      { name: 'Barcelona', xGFor: 82.1, xGAgainst: 30.5, goalsFor: 90, goalsAgainst: 28, shots: 680, shotsOnTarget: 240 },
      { name: 'Real Madrid', xGFor: 71.3, xGAgainst: 35.2, goalsFor: 76, goalsAgainst: 32, shots: 620, shotsOnTarget: 215 },
      { name: 'Atletico Madrid', xGFor: 58.7, xGAgainst: 32.8, goalsFor: 55, goalsAgainst: 30, shots: 510, shotsOnTarget: 170 },
      { name: 'Athletic Bilbao', xGFor: 55.2, xGAgainst: 38.4, goalsFor: 57, goalsAgainst: 36, shots: 495, shotsOnTarget: 165 },
      { name: 'Villarreal', xGFor: 52.8, xGAgainst: 41.2, goalsFor: 56, goalsAgainst: 44, shots: 505, shotsOnTarget: 162 }
    ],
    shotDistribution: [
      { zone: 'Inside 6-yard box', pct: 7, avgXG: 0.37 },
      { zone: '6yd to penalty spot', pct: 21, avgXG: 0.14 },
      { zone: 'Penalty area (wide)', pct: 24, avgXG: 0.07 },
      { zone: 'Edge of box (18-24m)', pct: 30, avgXG: 0.04 },
      { zone: 'Long range (24m+)', pct: 18, avgXG: 0.02 }
    ]
  },
  'Bundesliga': {
    country: 'Germany', tier: 1, season: '2024-25', color: '#ef4444',
    avgGoalsPerMatch: 3.14, avgXGPerMatch: 3.02, avgShotsPerMatch: 25.2,
    conversionRate: 12.5, avgXGPerShot: 0.120,
    teams: [
      { name: 'Bayern Munich', xGFor: 82.5, xGAgainst: 33.1, goalsFor: 87, goalsAgainst: 35, shots: 650, shotsOnTarget: 230 },
      { name: 'Bayer Leverkusen', xGFor: 68.7, xGAgainst: 36.5, goalsFor: 72, goalsAgainst: 34, shots: 580, shotsOnTarget: 200 },
      { name: 'Borussia Dortmund', xGFor: 62.3, xGAgainst: 42.8, goalsFor: 65, goalsAgainst: 45, shots: 555, shotsOnTarget: 185 },
      { name: 'RB Leipzig', xGFor: 58.1, xGAgainst: 40.2, goalsFor: 60, goalsAgainst: 38, shots: 530, shotsOnTarget: 175 },
      { name: 'Stuttgart', xGFor: 55.6, xGAgainst: 43.5, goalsFor: 58, goalsAgainst: 46, shots: 510, shotsOnTarget: 168 }
    ],
    shotDistribution: [
      { zone: 'Inside 6-yard box', pct: 9, avgXG: 0.40 },
      { zone: '6yd to penalty spot', pct: 23, avgXG: 0.16 },
      { zone: 'Penalty area (wide)', pct: 24, avgXG: 0.08 },
      { zone: 'Edge of box (18-24m)', pct: 27, avgXG: 0.04 },
      { zone: 'Long range (24m+)', pct: 17, avgXG: 0.02 }
    ]
  },
  'Serie A': {
    country: 'Italy', tier: 1, season: '2024-25', color: '#3b82f6',
    avgGoalsPerMatch: 2.68, avgXGPerMatch: 2.62, avgShotsPerMatch: 24.2,
    conversionRate: 11.1, avgXGPerShot: 0.108,
    teams: [
      { name: 'Inter Milan', xGFor: 72.8, xGAgainst: 32.4, goalsFor: 76, goalsAgainst: 30, shots: 610, shotsOnTarget: 210 },
      { name: 'Napoli', xGFor: 68.5, xGAgainst: 35.8, goalsFor: 72, goalsAgainst: 33, shots: 590, shotsOnTarget: 195 },
      { name: 'AC Milan', xGFor: 60.2, xGAgainst: 42.1, goalsFor: 62, goalsAgainst: 40, shots: 550, shotsOnTarget: 180 },
      { name: 'Juventus', xGFor: 55.8, xGAgainst: 33.5, goalsFor: 50, goalsAgainst: 31, shots: 520, shotsOnTarget: 168 },
      { name: 'Atalanta', xGFor: 65.3, xGAgainst: 38.2, goalsFor: 70, goalsAgainst: 42, shots: 570, shotsOnTarget: 190 }
    ],
    shotDistribution: [
      { zone: 'Inside 6-yard box', pct: 7, avgXG: 0.36 },
      { zone: '6yd to penalty spot', pct: 22, avgXG: 0.14 },
      { zone: 'Penalty area (wide)', pct: 25, avgXG: 0.07 },
      { zone: 'Edge of box (18-24m)', pct: 29, avgXG: 0.04 },
      { zone: 'Long range (24m+)', pct: 17, avgXG: 0.02 }
    ]
  },
  'Ligue 1': {
    country: 'France', tier: 1, season: '2024-25', color: '#a3e635',
    avgGoalsPerMatch: 2.58, avgXGPerMatch: 2.50, avgShotsPerMatch: 23.8,
    conversionRate: 10.8, avgXGPerShot: 0.105,
    teams: [
      { name: 'PSG', xGFor: 78.5, xGAgainst: 28.2, goalsFor: 82, goalsAgainst: 25, shots: 660, shotsOnTarget: 235 },
      { name: 'Monaco', xGFor: 58.2, xGAgainst: 40.1, goalsFor: 62, goalsAgainst: 38, shots: 530, shotsOnTarget: 175 },
      { name: 'Marseille', xGFor: 55.8, xGAgainst: 42.3, goalsFor: 58, goalsAgainst: 44, shots: 520, shotsOnTarget: 168 },
      { name: 'Lille', xGFor: 52.1, xGAgainst: 38.5, goalsFor: 48, goalsAgainst: 36, shots: 490, shotsOnTarget: 158 },
      { name: 'Lyon', xGFor: 54.3, xGAgainst: 45.8, goalsFor: 57, goalsAgainst: 48, shots: 510, shotsOnTarget: 165 }
    ],
    shotDistribution: [
      { zone: 'Inside 6-yard box', pct: 7, avgXG: 0.36 },
      { zone: '6yd to penalty spot', pct: 20, avgXG: 0.13 },
      { zone: 'Penalty area (wide)', pct: 24, avgXG: 0.07 },
      { zone: 'Edge of box (18-24m)', pct: 30, avgXG: 0.04 },
      { zone: 'Long range (24m+)', pct: 19, avgXG: 0.02 }
    ]
  },
  'Championship': {
    country: 'England', tier: 2, season: '2024-25', color: '#f97316',
    avgGoalsPerMatch: 2.51, avgXGPerMatch: 2.45, avgShotsPerMatch: 23.1,
    conversionRate: 10.9, avgXGPerShot: 0.106,
    teams: [
      { name: 'Leeds United', xGFor: 68.5, xGAgainst: 38.2, goalsFor: 72, goalsAgainst: 40, shots: 580, shotsOnTarget: 195 },
      { name: 'Burnley', xGFor: 62.3, xGAgainst: 40.5, goalsFor: 65, goalsAgainst: 38, shots: 550, shotsOnTarget: 180 },
      { name: 'Sheffield United', xGFor: 55.8, xGAgainst: 42.1, goalsFor: 52, goalsAgainst: 44, shots: 510, shotsOnTarget: 165 },
      { name: 'Sunderland', xGFor: 52.5, xGAgainst: 44.8, goalsFor: 55, goalsAgainst: 47, shots: 495, shotsOnTarget: 160 },
      { name: 'Middlesbrough', xGFor: 50.2, xGAgainst: 43.5, goalsFor: 48, goalsAgainst: 42, shots: 480, shotsOnTarget: 155 }
    ],
    shotDistribution: [
      { zone: 'Inside 6-yard box', pct: 7, avgXG: 0.35 },
      { zone: '6yd to penalty spot', pct: 20, avgXG: 0.13 },
      { zone: 'Penalty area (wide)', pct: 24, avgXG: 0.07 },
      { zone: 'Edge of box (18-24m)', pct: 30, avgXG: 0.04 },
      { zone: 'Long range (24m+)', pct: 19, avgXG: 0.02 }
    ]
  }
};

// Logistic regression coefficients for xG model
var XG_COEFF = { b0: -0.85, b1: 0.21, b2: -0.08, b3: -0.005, b4: 0.001 };
