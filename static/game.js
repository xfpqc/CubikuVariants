/**
 * Cubiku Variants v61 — Killer 3D Sudoku (Heuristic Logic Engine)
 */

let currentVariant = "killer";
let currentCages = [];
let cageMap = [];

/* High-contrast, vibrant cage colors */
const CAGE_COLORS = [
    'rgba(255, 87, 87, 0.35)',    /* Red */
    'rgba(51, 153, 255, 0.35)',  /* Blue */
    'rgba(255, 204, 0, 0.35)',   /* Gold */
    'rgba(46, 204, 113, 0.35)',  /* Emerald */
    'rgba(155, 89, 182, 0.35)',  /* Purple */
    'rgba(255, 128, 0, 0.35)',   /* Orange */
    'rgba(0, 230, 230, 0.35)',   /* Cyan */
    'rgba(255, 105, 180, 0.35)', /* Pink */
    'rgba(160, 212, 104, 0.35)', /* Lime */
    'rgba(186, 139, 238, 0.35)', /* Violet */
    'rgba(241, 196, 15, 0.35)',  /* Amber */
    'rgba(52, 152, 219, 0.35)'   /* Sky Blue */
];

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function isValid(grid, x, y, z, num, n = 3, variant = currentVariant) {
  for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
          if (grid[z][i][j] === num) return false;
          if (grid[i][y][j] === num) return false;
          if (grid[i][j][x] === num) return false;
      }
  }
  return true;
}

function generateSolvedGrid(grid, n = 3, variant = 'standard') {
  const cells = [];
  for (let z = 0; z < n; z++) {
      for (let y = 0; y < n; y++) {
          for (let x = 0; x < n; x++) cells.push({ z, y, x });
      }
  }

  for (const { z, y, x } of cells) {
      if (grid[z][y][x] === 0) {
          let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
          shuffleArray(nums);

          for (const num of nums) {
              if (isValid(grid, x, y, z, num, n, variant)) {
                  grid[z][y][x] = num;
                  if (generateSolvedGrid(grid, n, variant)) return true;
                  grid[z][y][x] = 0;
              }
          }
          return false;
      }
  }
  return true;
}

function generateCages(solvedGrid) {
    const cages = [];
    const unassigned = [];
    for (let z = 0; z < 3; z++)
        for (let y = 0; y < 3; y++)
            for (let x = 0; x < 3; x++)
                unassigned.push({ z, y, x });
    
    shuffleArray(unassigned);
    let cageId = 0;

    while (unassigned.length > 0) {
        const start = unassigned.pop();
        const targetSize = Math.floor(Math.random() * 3) + 2; 
        const cageCells = [start];
        let sum = solvedGrid[start.z][start.y][start.x];

        for (let i = 1; i < targetSize; i++) {
            const neighbors = [];
            for (const cell of cageCells) {
                const offsets = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
                for (const [dz, dy, dx] of offsets) {
                    const nz = cell.z + dz, ny = cell.y + dy, nx = cell.x + dx;
                    if (nz >= 0 && nz < 3 && ny >= 0 && ny < 3 && nx >= 0 && nx < 3) {
                        const idx = unassigned.findIndex(u => u.z === nz && u.y === ny && u.x === nx);
                        if (idx !== -1 && !neighbors.includes(idx)) {
                            const adjVal = solvedGrid[nz][ny][nx];
                            const hasDuplicate = cageCells.some(c => solvedGrid[c.z][c.y][c.x] === adjVal);
                            if (!hasDuplicate) neighbors.push(idx);
                        }
                    }
                }
            }
            if (neighbors.length > 0) {
                shuffleArray(neighbors);
                const chosenIdx = neighbors[0];
                const chosenCell = unassigned.splice(chosenIdx, 1)[0];
                cageCells.push(chosenCell);
                sum += solvedGrid[chosenCell.z][chosenCell.y][chosenCell.x];
            } else {
                break;
            }
        }
        
        if (cageCells.length === 1 && cages.length > 0) {
            const loneCell = cageCells[0];
            const loneVal = solvedGrid[loneCell.z][loneCell.y][loneCell.x];
            const offsets = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
            let merged = false;
            
            for (const [dz, dy, dx] of offsets) {
                const nz = loneCell.z + dz, ny = loneCell.y + dy, nx = loneCell.x + dx;
                const adjCage = cages.find(c => c.cells.some(cell => cell.z === nz && cell.y === ny && cell.x === nx));
                if (adjCage && adjCage.cells.length < 5) {
                    const hasDuplicate = adjCage.cells.some(c => solvedGrid[c.z][c.y][c.x] === loneVal);
                    if (!hasDuplicate) {
                        adjCage.cells.push(loneCell);
                        adjCage.sum += loneVal;
                        merged = true;
                        break;
                    }
                }
            }
            if (!merged) {
                cages.push({ id: cageId, cells: cageCells, sum: sum, color: CAGE_COLORS[cageId % CAGE_COLORS.length] });
                cageId++;
            }
        } else {
            cages.push({ id: cageId, cells: cageCells, sum: sum, color: CAGE_COLORS[cageId % CAGE_COLORS.length] });
            cageId++;
        }
    }

    for (const cage of cages) {
        cage.cells.sort((a, b) => {
            if (a.z !== b.z) return a.z - b.z;
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
        });
    }

    return cages;
}

// ---------------------------------------------------------
// HEURISTIC LOGIC FILTER (THE AUTOMATED PLAYER)
// ---------------------------------------------------------
const COMBOS = {};
function getCombos(targetSum, numCells, excludeDigits = []) {
    const key = `${targetSum}-${numCells}-${excludeDigits.sort().join('')}`;
    if (COMBOS[key]) return COMBOS[key];
    const results = [];
    function search(currentSum, currentCombo, startDigit) {
        if (currentCombo.length === numCells) {
            if (currentSum === targetSum) results.push([...currentCombo]);
            return;
        }
        for (let d = startDigit; d <= 9; d++) {
            if (!excludeDigits.includes(d) && currentSum + d <= targetSum) {
                currentCombo.push(d);
                search(currentSum + d, currentCombo, d + 1);
                currentCombo.pop();
            }
        }
    }
    search(0, [], 1);
    COMBOS[key] = results;
    return results;
}

function solveLogically(cagesTest) {
    const grid = emptyGrid();
    const cands = emptyGrid();
    for (let z = 0; z < 3; z++) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) cands[z][y][x] = (1 << 9) - 1; // 511

    let progress = true;
    let maxTier = 0;

    function placeDigit(z, y, x, d) {
        if (grid[z][y][x] !== 0) return grid[z][y][x] === d;
        grid[z][y][x] = d;
        cands[z][y][x] = 0;
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
            cands[z][i][j] &= ~(1 << (d - 1));
            cands[i][y][j] &= ~(1 << (d - 1));
            cands[i][j][x] &= ~(1 << (d - 1));
        }
        return true;
    }

    // Build Planar and Volumetric Regions (45 and 90 rules)
    const regions = [];
    for(let z=0; z<3; z++) { let r=[]; for(let y=0; y<3; y++) for(let x=0; x<3; x++) r.push({z,y,x}); regions.push({target: 45, cells: r}); }
    for(let y=0; y<3; y++) { let r=[]; for(let z=0; z<3; z++) for(let x=0; x<3; x++) r.push({z,y,x}); regions.push({target: 45, cells: r}); }
    for(let x=0; x<3; x++) { let r=[]; for(let z=0; z<3; z++) for(let y=0; y<3; y++) r.push({z,y,x}); regions.push({target: 45, cells: r}); }
    
    // Double Planes (Volumetric 90)
    regions.push({target: 90, cells: [...regions[0].cells, ...regions[1].cells]});
    regions.push({target: 90, cells: [...regions[1].cells, ...regions[2].cells]});

    while (progress) {
        progress = false;

        // Tier 0: Naked Singles
        for (let z = 0; z < 3; z++) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
            if (grid[z][y][x] === 0) {
                let mask = cands[z][y][x];
                if (mask === 0) return { solved: false }; 
                if ((mask & (mask - 1)) === 0) {
                    let d = Math.log2(mask) + 1;
                    if (!placeDigit(z, y, x, d)) return { solved: false };
                    progress = true;
                }
            }
        }
        if (progress) { maxTier = Math.max(maxTier, 0); continue; }

        // Tier 0: Cage Combinations
        for (const cage of cagesTest) {
            let currentSum = 0;
            let emptyCells = [];
            let placedDigits = [];
            for (const c of cage.cells) {
                let val = grid[c.z][c.y][c.x];
                if (val > 0) { currentSum += val; placedDigits.push(val); }
                else emptyCells.push(c);
            }
            if (emptyCells.length === 0) {
                if (currentSum !== cage.sum) return { solved: false };
                continue;
            }
            let target = cage.sum - currentSum;
            let combos = getCombos(target, emptyCells.length, placedDigits);
            if (combos.length === 0) return { solved: false };

            let validMask = 0;
            for (const combo of combos) for (const d of combo) validMask |= (1 << (d - 1));
            
            for (const c of emptyCells) {
                let oldMask = cands[c.z][c.y][c.x];
                let newMask = oldMask & validMask;
                if (newMask !== oldMask) {
                    cands[c.z][c.y][c.x] = newMask;
                    progress = true;
                }
            }
        }
        if (progress) { maxTier = Math.max(maxTier, 0); continue; }

        // Tier 1 & 2: Planar 45 and Volumetric 90 (Innies and Outies)
        for (const region of regions) {
            // Find intersecting cages
            const intersectingCages = [];
            const regionStrs = new Set(region.cells.map(c => `${c.z},${c.y},${c.x}`));
            for (const cage of cagesTest) {
                if (cage.cells.some(c => regionStrs.has(`${c.z},${c.y},${c.x}`))) {
                    intersectingCages.push(cage);
                }
            }
            
            // Limit combinatorial explosion on messy geometry
            if (intersectingCages.length > 12) continue; 
            
            for (let i = 1; i < (1 << intersectingCages.length); i++) {
                let subSum = 0;
                const subStrs = new Set();
                const subCells = [];
                for (let j = 0; j < intersectingCages.length; j++) {
                    if ((i & (1 << j))) {
                        subSum += intersectingCages[j].sum;
                        for (const c of intersectingCages[j].cells) {
                            subStrs.add(`${c.z},${c.y},${c.x}`);
                            subCells.push(c);
                        }
                    }
                }
                
                // Outie = 1 cell outside region. Innie = 1 cell missing inside region
                if (subSum < region.target - 9 || subSum > region.target + 9) continue;

                const innies = region.cells.filter(c => !subStrs.has(`${c.z},${c.y},${c.x}`));
                const outies = subCells.filter(c => !regionStrs.has(`${c.z},${c.y},${c.x}`));

                if (innies.length === 1 && outies.length === 0) {
                    let val = region.target - subSum;
                    let c = innies[0];
                    if (val >= 1 && val <= 9 && grid[c.z][c.y][c.x] === 0) {
                        if (placeDigit(c.z, c.y, c.x, val)) progress = true;
                    }
                } else if (outies.length === 1 && innies.length === 0) {
                    let val = subSum - region.target;
                    let c = outies[0];
                    if (val >= 1 && val <= 9 && grid[c.z][c.y][c.x] === 0) {
                        if (placeDigit(c.z, c.y, c.x, val)) progress = true;
                    }
                }
                if (progress) break;
            }
            if (progress) break;
        }
        
        if (progress) { maxTier = Math.max(maxTier, 1); continue; }
    }

    let isSolved = true;
    for (let z = 0; z < 3; z++) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
        if (grid[z][y][x] === 0) isSolved = false;
    }

    return { solved: isSolved, maxTier, grid };
}

function yieldToMain() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

async function generateGame(targetDiff = currentDifficulty) {
    let attempts = 0;
    const diffMap = { 0: 'easy', 1: 'medium', 2: 'hard' };

    while (attempts < 250) {
        attempts++;
        if (attempts % 5 === 0) await yieldToMain();

        const grid = emptyGrid();
        generateSolvedGrid(grid, 3, 'standard');
        const candidateCages = generateCages(grid);
        
        const logicResult = solveLogically(candidateCages);

        if (logicResult.solved) {
            const mappedDiff = diffMap[logicResult.maxTier] || 'hard';
            // Return exactly if it hits target difficulty, OR if we're taking too long, return whatever we found.
            if (mappedDiff === targetDiff || attempts > 150) {
                console.log(`Board generated in ${attempts} attempts. Difficulty: ${mappedDiff}`);
                cageMap = emptyGrid();
                for (const cage of candidateCages) {
                    for (const cell of cage.cells) cageMap[cell.z][cell.y][cell.x] = cage;
                }
                return { clues: [], solvedGrid: grid, cages: candidateCages };
            }
        }
    }
    
    // Emergency Fallback if the engine generates chaotic geometry constantly
    console.warn("Could not meet logical constraints. Returning safe fallback.");
    const fallbackGrid = emptyGrid();
    generateSolvedGrid(fallbackGrid, 3, 'standard');
    const fallbackCages = generateCages(fallbackGrid);
    cageMap = emptyGrid();
    for (const cage of fallbackCages) {
        for (const cell of cage.cells) cageMap[cell.z][cell.y][cell.x] = cage;
    }
    return { clues: [], solvedGrid: fallbackGrid, cages: fallbackCages };
}

// ---------------------------------------------------------
// DOM & GAME STATE
// ---------------------------------------------------------
function check3SSC(grid, n = 3, variant = currentVariant) {
  const conflicts = new Set();
  const addConflict = (z, y, x) => conflicts.add(`${z},${y},${x}`);

  for (let z = 0; z < n; z++) {
      for (let y = 0; y < n; y++) {
          for (let x = 0; x < n; x++) {
              const v = grid[z][y][x];
              if (typeof v !== 'number' || v < 1 || v > 9) {
                  return { valid: false, message: "Some cells are still empty or contain invalid values.", conflicts: [] };
              }
          }
      }
  }

  for (let z = 0; z < n; z++) {
      const seen = {};
      for (let y = 0; y < n; y++) {
          for (let x = 0; x < n; x++) {
              const num = grid[z][y][x];
              if (!seen[num]) seen[num] = [];
              seen[num].push({ y, x });
          }
      }
      for (const num in seen) {
          if (seen[num].length > 1) seen[num].forEach(({ y, x }) => addConflict(z, y, x));
      }
  }

  for (let y = 0; y < n; y++) {
      const seen = {};
      for (let z = 0; z < n; z++) {
          for (let x = 0; x < n; x++) {
              const num = grid[z][y][x];
              if (!seen[num]) seen[num] = [];
              seen[num].push({ z, x });
          }
      }
      for (const num in seen) {
          if (seen[num].length > 1) seen[num].forEach(({ z, x }) => addConflict(z, y, x));
      }
  }

  for (let x = 0; x < n; x++) {
      const seen = {};
      for (let z = 0; z < n; z++) {
          for (let y = 0; y < n; y++) {
              const num = grid[z][y][x];
              if (!seen[num]) seen[num] = [];
              seen[num].push({ z, y });
          }
      }
      for (const num in seen) {
          if (seen[num].length > 1) seen[num].forEach(({ z, y }) => addConflict(z, y, x));
      }
  }

  if (variant === 'killer' && currentCages.length > 0) {
      for (const cage of currentCages) {
          let currentSum = 0;
          const cageSeen = new Set();
          for (const {z, y, x} of cage.cells) {
              const num = grid[z][y][x];
              currentSum += num;
              if (cageSeen.has(num)) {
                  cage.cells.forEach(c => addConflict(c.z, c.y, c.x));
              }
              cageSeen.add(num);
          }
          if (currentSum !== cage.sum) {
              cage.cells.forEach(c => addConflict(c.z, c.y, c.x));
          }
      }
  }

  if (conflicts.size > 0) {
      return {
          valid: false,
          message: "Constraints violated — conflicting cells highlighted.",
          conflicts: Array.from(conflicts).map(c => c.split(',').map(Number))
      };
  }
  return { valid: true, message: "Puzzle solved correctly! 🎉", conflicts: [] };
}

function emptyGrid() {
  return Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => Array(3).fill(0)));
}
function emptyDrafts() {
  return Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => new Set())));
}

let state        = emptyGrid();  
let drafts       = emptyDrafts();
let initialGrid  = emptyGrid(); 
let solvedGrid   = null;
let clueSet      = new Set();         
let selected     = null;            
let undoStack    = [];

let activeNumber = null;
let inspectedNumber = null;
let currentDifficulty = "medium";
let currentTheme = "cyan";
let stickyKeysEnabled = false; 
let pencilMode = false;
let isGameComplete = false; 

let stats = {
  easy:   { wins: 0, bestTime: null, totalTime: 0, lastTime: null },
  medium: { wins: 0, bestTime: null, totalTime: 0, lastTime: null },
  hard:   { wins: 0, bestTime: null, totalTime: 0, lastTime: null }
};

function savePreferences() {
  localStorage.setItem('cubiku_killer_prefs', JSON.stringify({ theme: currentTheme, sticky: stickyKeysEnabled, difficulty: currentDifficulty }));
}

function loadPreferences() {
  const savedPrefs = localStorage.getItem('cubiku_killer_prefs');
  if (savedPrefs) {
    try {
      const prefs = JSON.parse(savedPrefs);
      currentTheme = prefs.theme || "cyan";
      stickyKeysEnabled = !!prefs.sticky;
      currentDifficulty = prefs.difficulty || "medium";
      
      document.body.setAttribute('data-theme', currentTheme);
      const themeSelect = document.getElementById('theme-select');
      if (themeSelect) themeSelect.value = currentTheme;
      
      const stickyToggle = document.getElementById('toggle-sticky-keys');
      if (stickyToggle) stickyToggle.checked = stickyKeysEnabled;
      
      const diffSelect = document.getElementById('difficulty-select');
      if (diffSelect) diffSelect.value = currentDifficulty;
    } catch(e) {}
  }
}

function saveStats() {
  localStorage.setItem('cubiku_killer_stats_v2', JSON.stringify(stats));
  updateStatsUI();
}

function loadStats() {
  const savedStats = localStorage.getItem('cubiku_killer_stats_v2');
  if (savedStats) {
    try { stats = JSON.parse(savedStats); } catch(e) {}
  } 
  updateStatsUI();
}

function resetStats() {
  const diff = currentDifficulty;
  if (confirm(`Are you sure you want to erase your statistics for ${diff} mode? This cannot be undone.`)) {
    stats[diff] = { wins: 0, bestTime: null, totalTime: 0, lastTime: null };
    saveStats();
    showMessage(`Statistics reset.`, "info");
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) settingsPanel.style.display = 'none';
  }
}

function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return "--:--";
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

function updateStatsUI() {
  const currentStats = stats[currentDifficulty] || stats['medium'];
  const elWins = document.getElementById('stat-wins');
  if (elWins) elWins.textContent = currentStats.wins;
  const elBest = document.getElementById('stat-best');
  if (elBest) elBest.textContent = formatTime(currentStats.bestTime);
  const elAvg = document.getElementById('stat-avg');
  if (elAvg) {
    const avg = currentStats.wins > 0 ? Math.floor(currentStats.totalTime / currentStats.wins) : null;
    elAvg.textContent = formatTime(avg);
  }
  const elLast = document.getElementById('stat-last');
  if (elLast) elLast.textContent = formatTime(currentStats.lastTime);
}

function saveGame() {
  if (clueSet.size === 0 && currentCages.length === 0) return; 
  const saveData = {
    state, drafts: drafts.map(zLevel => zLevel.map(row => row.map(cellSet => Array.from(cellSet)))),
    initialGrid, solvedGrid, clues: Array.from(clueSet), cages: currentCages, difficulty: currentDifficulty, timer: timerSeconds
  };
  localStorage.setItem('cubiku_killer_save', JSON.stringify(saveData));
}

function clearSave() { localStorage.removeItem('cubiku_killer_save'); }

function loadGame() {
  const saved = localStorage.getItem('cubiku_killer_save');
  if (!saved) return false;
  
  try {
    const data = JSON.parse(saved);
    state = data.state;
    
    if (data.drafts) {
        drafts = data.drafts.map(zLevel => zLevel.map(row => row.map(cellArray => new Set(cellArray))));
    } else {
        drafts = emptyDrafts();
    }

    initialGrid = data.initialGrid || emptyGrid();
    solvedGrid = data.solvedGrid || emptyGrid();
    clueSet = new Set(data.clues);
    currentCages = data.cages || [];
    currentDifficulty = data.difficulty || "medium";
    
    cageMap = emptyGrid();
    for (const cage of currentCages) {
        for (const cell of cage.cells) cageMap[cell.z][cell.y][cell.x] = cage;
    }

    timerSeconds = data.timer;
    undoStack = [];
    isGameComplete = false; 
    pencilMode = false;
    activeNumber = null;
    
    document.querySelectorAll('.key-btn').forEach(btn => btn.classList.remove('control-disabled'));
    const diffSelect = document.getElementById('difficulty-select');
    if (diffSelect) diffSelect.value = currentDifficulty;

    updateStatsUI(); 
    renderState();
    updateDepletion();
    startTimer(); 
    showMessage('Game resumed.', 'info');
    return true;
  } catch (e) {
    clearSave();
    return false;
  }
}

let timerSeconds  = 0;
let timerInterval = null;

function startTimer() { stopTimer(); updateTimerDisplay(); timerInterval = setInterval(() => { timerSeconds++; updateTimerDisplay(); saveGame(); }, 1000); }
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  if (!display) return;
  display.textContent = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(timerSeconds % 60).padStart(2, '0')}`;
}

let zenMode = false;
function toggleZen() {
  zenMode = !zenMode;
  const timerBar = document.getElementById('timer-bar');
  if (timerBar) timerBar.classList.toggle('zen', zenMode);
  
  const eyeOpen = document.getElementById('icon-eye-open');
  const eyeClosed = document.getElementById('icon-eye-closed');
  if (eyeOpen) eyeOpen.style.display = zenMode ? 'none' : '';
  if (eyeClosed) eyeClosed.style.display = zenMode ? '' : 'none';
  
  const btnZen = document.getElementById('btn-zen');
  if (btnZen) btnZen.title = zenMode ? 'Zen Mode — show timer' : 'Zen Mode — hide timer';
}

function toggleMenu() {
  const panel = document.getElementById('settings-panel');
  if (panel) panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'flex' : 'none';
}

function cellId(z, row, col) { return `cell-${z}-${row}-${col}`; }
function getCell(z, row, col) { return document.getElementById(cellId(z, row, col)); }

function showMessage(text, type = 'info') {
  const bar = document.getElementById('message-bar');
  if (!bar) return;
  bar.textContent = text;
  bar.className   = `message-bar ${type}`;
}

function hideMessage() {
  const bar = document.getElementById('message-bar');
  if (bar) bar.className = 'message-bar hidden';
}

function clearHighlights() {
  document.querySelectorAll('.cell.active-cell, .cell.constraint-highlight, .cell.cage-highlight')
    .forEach(el => el.classList.remove('active-cell', 'constraint-highlight', 'cage-highlight'));
}

function applyCrosshair(selZ, selRow, selCol) {
  for (let z = 0; z < 3; z++) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (r !== selRow && c !== selCol) continue;
        const el = getCell(z, r, c);
        if (!el) continue;
        if (z === selZ && r === selRow && c === selCol) {
          el.classList.add('active-cell');
        } else {
          el.classList.add('constraint-highlight');
        }
      }
    }
  }

  if (cageMap && cageMap[selZ] && cageMap[selZ][selRow] && cageMap[selZ][selRow][selCol]) {
    const cage = cageMap[selZ][selRow][selCol];
    for (const c of cage.cells) {
      const el = getCell(c.z, c.y, c.x);
      if (el) el.classList.add('cage-highlight');
    }
  }
}

function selectCell(z, row, col) {
  clearHighlights();
  inspectedNumber = null;
  selected = clueSet.has(`${z},${row},${col}`) ? null : { z, row, col };
  applyCrosshair(z, row, col);
  updateNumberHighlights();
}

function clearSelection() { clearHighlights(); selected = null; inspectedNumber = null; updateNumberHighlights(); }

function updateNumberHighlights() {
  document.querySelectorAll('.cell').forEach(el => el.classList.remove('number-highlight'));
  
  const targetVal = activeNumber !== null && activeNumber !== 'erase' && activeNumber !== 'undo' && activeNumber !== 'pencil' 
                    ? Number(activeNumber) : (inspectedNumber !== null ? Number(inspectedNumber) : null);
  if (targetVal === null) return;

  for (let z = 0; z < 3; z++) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (state[z][r][c] === targetVal) {
          const el = getCell(z, r, c);
          if (el) el.classList.add('number-highlight');
        }
      }
    }
  }
}

function updateKeyboardUI() {
  document.body.classList.toggle('pencil-mode-active', pencilMode);
  document.querySelectorAll('.key-btn').forEach(b => {
    const val = b.dataset.val;
    if (val === 'pencil') { b.classList.toggle('active', pencilMode); return; }
    if (val === activeNumber) b.classList.add('active'); else b.classList.remove('active');
    b.style.transform = ''; b.style.fontWeight = ''; b.style.border = '';
  });
}

function buildGrids() {
  for (let z = 0; z < 3; z++) {
    const container = document.getElementById(`grid-z${z}`);
    if (!container) continue;
    container.innerHTML = '';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cell = document.createElement('div');
        cell.id         = cellId(z, row, col);
        cell.className   = 'cell';
        cell.dataset.z   = z;
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.tabIndex    = 0;
        cell.setAttribute('aria-label', `Slice z=${z} row ${row + 1} col ${col + 1}`);

        const cageSumSpan = document.createElement('span');
        cageSumSpan.className = 'cage-sum';
        cell.appendChild(cageSumSpan);

        const mainVal = document.createElement('span');
        mainVal.className = 'main-value';
        cell.appendChild(mainVal);

        for (let i = 1; i <= 9; i++) {
            const cand = document.createElement('span');
            cand.className = `candidate cand-${i}`;
            cand.textContent = i;
            cell.appendChild(cand);
        }

        cell.addEventListener('focus', onCellFocus);
        cell.addEventListener('keydown', onCellKeydown);
        cell.addEventListener('pointerdown', onCellPointerDown);
        container.appendChild(cell);
      }
    }
  }
}

function renderState() {
  for (let z = 0; z < 3; z++) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const el = getCell(z, row, col);
        if (!el) continue;
        const isClue = clueSet.has(`${z},${row},${col}`);
        const val = state[z][row][col];
        const cellDrafts = drafts[z][row][col];

        el.tabIndex = isClue ? -1 : 0;
        el.classList.toggle('clue', isClue);
        el.classList.remove('conflict', 'flash-conflict');

        const mainValSpan = el.querySelector('.main-value');
        const cageSumSpan = el.querySelector('.cage-sum');
        
        if (cageMap && cageMap[z][row][col]) {
            const cage = cageMap[z][row][col];
            el.style.backgroundColor = cage.color;
            if (cage.cells[0].z === z && cage.cells[0].y === row && cage.cells[0].x === col) {
                cageSumSpan.textContent = cage.sum;
            } else { cageSumSpan.textContent = ''; }
        } else {
            el.style.backgroundColor = '';
            cageSumSpan.textContent = '';
        }
        
        for (let i = 1; i <= 9; i++) {
            const cand = el.querySelector(`.cand-${i}`);
            if (cand) { cand.style.display = 'none'; cand.classList.remove('visible'); }
        }
        
        if (val > 0) {
            el.classList.remove('draft-mode');
            if (mainValSpan) mainValSpan.textContent = val;
        } else {
            if (mainValSpan) mainValSpan.textContent = '';
            if (cellDrafts && cellDrafts.size > 0) {
                el.classList.add('draft-mode');
                for (const digit of cellDrafts) {
                    const cand = el.querySelector(`.cand-${digit}`);
                    if (cand) { cand.style.display = 'block'; cand.classList.add('visible'); }
                }
            } else {
                el.classList.remove('draft-mode');
            }
        }
      }
    }
  }
  updateNumberHighlights();
}

function setLoading(on) {
  document.querySelectorAll('.grid').forEach(g => g.classList.toggle('loading', on));
  const newGameBtn = document.getElementById('btn-new-game');
  if (newGameBtn) newGameBtn.disabled = on;
}

function undoLastAction() {
  if (isGameComplete || undoStack.length === 0) return;
  const action = undoStack.pop();

  if (action.type === 'auto_draft_clear') {
      action.cells.forEach(({z: az, r: ar, c: ac}) => { drafts[az][ar][ac].add(action.digit); });
      undoLastAction();
      return; 
  }

  const el = getCell(action.z, action.row, action.col);
  if (!el) return;

  if (action.type === 'draft') drafts[action.z][action.row][action.col] = action.before;
  else if (action.type === 'value') {
      state[action.z][action.row][action.col] = action.before;
      if (action.beforeDrafts) drafts[action.z][action.row][action.col] = action.beforeDrafts;
  } else if (action.type === 'clear') {
      state[action.z][action.row][action.col] = action.beforeVal;
      drafts[action.z][action.row][action.col] = action.beforeDrafts;
  } else state[action.z][action.row][action.col] = action.before;

  el.classList.remove('conflict', 'flash-conflict');
  updateDepletion(); saveGame(); renderState(); checkAutoComplete();
}

function removeDraftFromPeers(z, row, col, digit) {
    const affected = [];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if ((i !== row || j !== col) && drafts[z][i][j].has(digit)) affected.push({z, r: i, c: j});
            if ((i !== z || j !== col) && drafts[i][row][j].has(digit)) affected.push({z: i, r: row, c: j});
            if ((i !== z || j !== row) && drafts[i][j][col].has(digit)) affected.push({z: i, r: j, c: col});
        }
    }
    if (currentVariant === 'killer' && cageMap && cageMap[z][row][col]) {
        for (const c of cageMap[z][row][col].cells) {
            if ((c.z !== z || c.y !== row || c.x !== col) && drafts[c.z][c.y][c.x].has(digit)) {
                affected.push({z: c.z, r: c.y, c: c.x});
            }
        }
    }
    
    const uniqueAffected = []; const seen = new Set();
    for (const cell of affected) {
        const key = `${cell.z},${cell.r},${cell.c}`;
        if (!seen.has(key)) { seen.add(key); uniqueAffected.push(cell); }
    }
    if (uniqueAffected.length > 0) {
        undoStack.push({ type: 'auto_draft_clear', digit, cells: uniqueAffected });
        uniqueAffected.forEach(({z: az, r: ar, c: ac}) => drafts[az][ar][ac].delete(digit));
    }
}

function fillCell(z, row, col, digitStr) {
  if (isGameComplete || clueSet.has(`${z},${row},${col}`)) return;
  const el = getCell(z, row, col); if (!el) return;
  const digit = digitStr ? Number(digitStr) : 0;
  const beforeVal = state[z][row][col];
  const beforeDrafts = new Set(drafts[z][row][col]);

  if (digitStr === '') {
      undoStack.push({ type: 'clear', z, row, col, beforeVal, beforeDrafts });
      state[z][row][col] = 0; drafts[z][row][col].clear();
      hideMessage(); updateDepletion(); saveGame(); renderState(); return;
  }

  if (pencilMode) {
      if (state[z][row][col] !== 0) return; 
      undoStack.push({ type: 'draft', z, row, col, before: beforeDrafts });
      if (drafts[z][row][col].has(digit)) drafts[z][row][col].delete(digit); else drafts[z][row][col].add(digit);
      saveGame(); renderState(); return;
  }

  if (beforeVal === digit) return;

  undoStack.push({ type: 'value', z, row, col, before: beforeVal, beforeDrafts: beforeDrafts });
  state[z][row][col] = digit;
  
  if (digit > 0) {
      drafts[z][row][col].clear();
      removeDraftFromPeers(z, row, col, digit);
      flashConflicts(z, row, col, digit);
  }

  hideMessage(); updateDepletion(); saveGame(); renderState(); checkAutoComplete();
}

function updateDepletion() {
  const counts = Array(10).fill(0);
  for (let z = 0; z < 3; z++) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const val = state[z][r][c]; if (val > 0) counts[val]++;
  }

  let activeWasDepleted = false;
  document.querySelectorAll('.key-btn').forEach(btn => {
    const valStr = btn.dataset.val;
    if (!valStr || ['erase', 'undo', 'pencil'].includes(valStr)) {
       if (btn) { btn.style.opacity = '1'; btn.style.textDecoration = 'none'; btn.classList.remove('depleted'); }
       return; 
    }
    const val = Number(valStr);
    if (counts[val] >= 3) {
      btn.style.opacity = '0.3'; btn.style.textDecoration = 'line-through'; btn.classList.add('depleted', 'active'); btn.classList.remove('active');
      if (activeNumber === String(val)) activeWasDepleted = true;
    } else {
      btn.style.opacity = '1'; btn.style.textDecoration = 'none'; btn.classList.remove('depleted');
    }
  });

  if (activeWasDepleted) {
    activeNumber = null; updateKeyboardUI(); clearSelection();
    if (document.activeElement && document.activeElement.classList.contains('cell')) document.activeElement.blur();
    updateNumberHighlights();
  }
}

function checkAutoComplete() {
  let emptyCount = 0;
  for (let z = 0; z < 3; z++) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (state[z][r][c] === 0) emptyCount++;
  if (emptyCount === 0) checkSolution(); 
}

function flashConflicts(z, row, col, value) {
  if (!value) return;
  const clashEls = [];
  for (let c = 0; c < 3; c++) if (c !== col && state[z][row][c] === value) clashEls.push(getCell(z, row, c));
  for (let r = 0; r < 3; r++) if (r !== row && state[z][r][col] === value) clashEls.push(getCell(z, r, col));
  for (let oz = 0; oz < 3; oz++) if (oz !== z && state[oz][row][col] === value) clashEls.push(getCell(oz, row, col));
  
  if (currentVariant === 'killer' && cageMap && cageMap[z][row][col]) {
      for (const c of cageMap[z][row][col].cells) {
          if (c.z !== z || c.y !== row || c.x !== col) {
              if (state[c.z][c.y][c.x] === value) clashEls.push(getCell(c.z, c.y, c.x));
          }
      }
  }

  clashEls.forEach(el => {
    if(!el) return;
    el.classList.remove('flash-conflict'); void el.offsetWidth; el.classList.add('flash-conflict');
    setTimeout(() => el.classList.remove('flash-conflict'), 1000);
  });
}

function onCellFocus(e) {
  const el = e.currentTarget; const z = Number(el.dataset.z), row = Number(el.dataset.row), col = Number(el.dataset.col);
  if (clueSet.has(`${z},${row},${col}`)) { el.blur(); return; }
  if (activeNumber === null && !selected && inspectedNumber === null) selectCell(z, row, col);
}

function onCellPointerDown(e) {
  e.preventDefault(); 
  const el = e.currentTarget; const z = Number(el.dataset.z), row = Number(el.dataset.row), col = Number(el.dataset.col);
  
  if (inspectedNumber !== null) { inspectedNumber = null; clearHighlights(); }

  if (clueSet.has(`${z},${row},${col}`)) {
    inspectedNumber = String(state[z][row][col]); activeNumber = null; 
    updateKeyboardUI(); updateNumberHighlights(); clearHighlights(); applyCrosshair(z, row, col); selected = null; return;
  }

  if (activeNumber !== null) {
    if (activeNumber === 'erase') fillCell(z, row, col, ''); else fillCell(z, row, col, activeNumber);
    if (!stickyKeysEnabled && !pencilMode) { activeNumber = null; clearSelection(); } else selectCell(z, row, col);
    updateKeyboardUI(); updateNumberHighlights();
  } else { selectCell(z, row, col); el.focus(); }
}

function onCellKeydown(e) {
  const el = e.currentTarget; const z = Number(el.dataset.z), row = Number(el.dataset.row), col = Number(el.dataset.col);

  if (e.key === 'Backspace' || e.key === 'Delete') {
    if (!clueSet.has(`${z},${row},${col}`)) { e.preventDefault(); fillCell(z, row, col, ''); } return;
  }
  if (/^[1-9]$/.test(e.key)) {
    if (!clueSet.has(`${z},${row},${col}`)) { e.preventDefault(); fillCell(z, row, col, e.key); if (!stickyKeysEnabled && !pencilMode) clearSelection(); } return;
  }
  if (e.key.toLowerCase() === 'p') { e.preventDefault(); pencilMode = !pencilMode; updateKeyboardUI(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoLastAction(); return; }
  if (e.key === 'Escape') { clearSelection(); el.blur(); return; }

  const moves = { ArrowRight: [z, row, (col + 1) % 3], ArrowLeft:  [z, row, (col + 2) % 3], ArrowDown:  [z, (row + 1) % 3, col], ArrowUp:    [z, (row + 2) % 3, col] };
  if (moves[e.key]) { e.preventDefault(); const [nz, nr, nc] = moves[e.key]; getCell(nz, nr, nc)?.focus(); selectCell(nz, nr, nc); }
}

function handleKeyboardTap(valStr) {
  if (!valStr) return; 
  if (valStr === 'undo') { undoLastAction(); return; }
  clearHighlights(); inspectedNumber = null;
  if (valStr !== 'erase' && valStr !== 'pencil') {
    const btn = document.querySelector(`.key-btn[data-val="${valStr}"]`);
    if (btn && btn.classList.contains('depleted')) return;
  }

  if (selected !== null) {
    const { z, row, col } = selected;
    if (valStr === 'pencil') { pencilMode = !pencilMode; updateKeyboardUI(); selectCell(z, row, col); return; }
    if (valStr === 'erase') { if (!clueSet.has(`${z},${row},${col}`)) fillCell(z, row, col, ''); } else fillCell(z, row, col, valStr);
    
    const btn = document.querySelector(`.key-btn[data-val="${valStr}"]`);
    if (btn && btn.classList.contains('depleted')) { activeNumber = null; clearSelection(); }
    else if (!stickyKeysEnabled) { if (!pencilMode) { activeNumber = null; clearSelection(); } else selectCell(z, row, col); }
    else selectCell(z, row, col); 
    
    updateKeyboardUI(); updateNumberHighlights();
  } else {
    if (valStr === 'pencil') pencilMode = !pencilMode; else if (activeNumber === valStr) activeNumber = null; else activeNumber = valStr;
    updateKeyboardUI(); updateNumberHighlights();
  }
}

async function newGame() {
  setLoading(true); hideMessage(); stopTimer(); clearSave(); clearSelection(); isGameComplete = false; 
  pencilMode = false; activeNumber = null;
  
  document.querySelectorAll('.key-btn').forEach(btn => btn.classList.remove('control-disabled'));
  updateKeyboardUI(); drafts = emptyDrafts();

  try {
    const { clues, solvedGrid: solved, cages } = await generateGame();
    
    state = emptyGrid(); drafts = emptyDrafts(); initialGrid = emptyGrid(); clueSet = new Set();
    undoStack = []; timerSeconds = 0; solvedGrid = solved; currentCages = cages;

    renderState(); updateDepletion(); startTimer(); saveGame(); 
    
    const greetings = [
      "Stay sharp.",
      "Focus.",
      "Trust the math.",
      "Don't let the cages break you.",
      "Every digit counts.",
      "Think outside the slice.",
      "Watch your Z-axis.",
      "Cross-plane logic required.",
      "Good luck!",
      "👀",
      "😱"
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    showMessage(randomGreeting, "info");
    
  } catch (err) {
    showMessage(`Failed to load puzzle: ${err.message}`, 'error');
  } finally { setLoading(false); }
}

async function checkSolution() {
  if (isGameComplete) return; 
  hideMessage(); document.querySelectorAll('.cell.conflict').forEach(c => c.classList.remove('conflict')); setLoading(true);
  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    const data = check3SSC(state, 3, currentVariant);
    if (data.valid) {
      isGameComplete = true; document.querySelectorAll('.key-btn').forEach(btn => btn.classList.add('control-disabled')); 
      stopTimer(); showMessage(data.message, 'success'); clearSelection(); clearSave(); 
      
      const diff = currentDifficulty;
      stats[diff].wins++; stats[diff].totalTime += timerSeconds; stats[diff].lastTime = timerSeconds;
      if (stats[diff].bestTime === null || timerSeconds < stats[diff].bestTime) stats[diff].bestTime = timerSeconds;
      saveStats();
    } else {
      showMessage(data.message, 'error');
      if (!solvedGrid) solvedGrid = computeSolutionGrid();
      if (Array.isArray(data.conflicts)) {
        data.conflicts.forEach(([z, row, col]) => {
          if (!clueSet.has(`${z},${row},${col}`) && state[z][row][col] !== solvedGrid[z][row][col]) { getCell(z, row, col)?.classList.add('conflict'); }
        });
      }
    }
  } catch (err) { showMessage(`Could not check solution: ${err.message}`, 'error'); } finally { setLoading(false); }
}

function repairDOM() {
    const pencilBtn = document.getElementById('btn-pencil');
    if (pencilBtn) {
        pencilBtn.removeAttribute('disabled'); pencilBtn.title = "Toggle Pencil Mode"; pencilBtn.className = 'key-btn';
        pencilBtn.dataset.val = 'pencil'; pencilBtn.style.setProperty('pointer-events', 'auto', 'important');
        pencilBtn.style.setProperty('cursor', 'pointer', 'important'); pencilBtn.style.setProperty('opacity', '1', 'important');
        pencilBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
    }
    document.querySelectorAll('.key-btn').forEach(btn => { btn.classList.remove('control-disabled', 'depleted'); btn.removeAttribute('disabled'); });
}

function init() {
  repairDOM(); buildGrids(); loadPreferences(); loadStats();
  
  const btnNew = document.getElementById('btn-new-game'); if (btnNew) btnNew.addEventListener('click', newGame);
  const btnMenu = document.getElementById('btn-menu'); if (btnMenu) btnMenu.addEventListener('click', toggleMenu);
  const btnRestart = document.getElementById('btn-restart');
  if (btnRestart) btnRestart.addEventListener('click', () => {
      if (confirm("Are you sure you want to restart this puzzle from the beginning?")) {
          for (let z = 0; z < 3; z++) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) state[z][y][x] = initialGrid[z][y][x];
          undoStack = []; drafts = emptyDrafts(); isGameComplete = false; pencilMode = false; activeNumber = null;
          document.querySelectorAll('.key-btn').forEach(btn => btn.classList.remove('control-disabled'));
          updateKeyboardUI(); timerSeconds = 0; renderState(); updateDepletion(); startTimer(); saveGame(); showMessage("Puzzle restarted.", "info");
      }
  });

  const btnZen = document.getElementById('btn-zen'); if (btnZen) btnZen.addEventListener('click', toggleZen);
  const btnSettingsReset = document.getElementById('btn-settings-reset-stats'); if (btnSettingsReset) btnSettingsReset.addEventListener('click', (e) => { e.stopPropagation(); resetStats(); });
  const themeSelect = document.getElementById('theme-select'); if (themeSelect) themeSelect.addEventListener('change', (e) => { currentTheme = e.target.value; document.body.setAttribute('data-theme', currentTheme); updateNumberHighlights(); savePreferences(); });
  const diffSelect = document.getElementById('difficulty-select'); if (diffSelect) diffSelect.addEventListener('change', (e) => { currentDifficulty = e.target.value; updateStatsUI(); savePreferences(); });
  const toggleSticky = document.getElementById('toggle-sticky-keys'); if (toggleSticky) toggleSticky.addEventListener('change', (e) => { stickyKeysEnabled = e.target.checked; savePreferences(); });

  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoLastAction(); } });
  document.querySelectorAll('.key-btn').forEach(btn => btn.addEventListener('click', (e) => handleKeyboardTap(e.currentTarget.dataset.val)));
  document.addEventListener('click', (e) => {
    const settingsPanel = document.getElementById('settings-panel'); const btnM = document.getElementById('btn-menu');
    if (settingsPanel && settingsPanel.style.display === 'flex') if (!settingsPanel.contains(e.target) && !btnM.contains(e.target)) settingsPanel.style.display = 'none';
  });

  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.slices-container') && !e.target.closest('.keyboard-container') && !e.target.closest('.top-action-bar') && !e.target.closest('.settings-panel') && !e.target.closest('.modal-overlay')) {
      activeNumber = null; updateKeyboardUI(); clearSelection();
      if (document.activeElement && document.activeElement.classList.contains('cell')) document.activeElement.blur();
    }
  });

  if (!loadGame()) newGame();
}

document.addEventListener('DOMContentLoaded', () => init());