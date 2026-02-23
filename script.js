/**
 * Duck Derby - Retro Pixel Racing Game
 */

// --- State ---
let state = {
    currentPlayer: null,
    profiles: {}, // { name: { balance: 1000 } }
    balance: 1000,
    initialBalance: 1000,
    duckCount: 4,
    allInActive: false,
    betUnit: 50,
    ducks: [],
    bettingDucks: {}, // { id: amount }
    totalBet: 0,
    raceActive: false,
    winners: []
};

// --- Config ---
const GOAL_SCORE = 20;
const TICK_INTERVAL = 250;
const BET_INCREMENT = 50;
let maxBettingDucks = 3;
const SPRITE_URL = './pixel_duck.svg';

const PERSONALITIES = [
    { name: "SPEED DEMON", weight: 1.8, multiplier: 1.1, desc: "目にも留まらぬ超高速アヒル" },
    { name: "FLASH YELLOW", weight: 1.5, multiplier: 1.4, desc: "＋に進みやすい快速タイプ" },
    { name: "HOT FIGHTER", weight: 1.2, multiplier: 1.8, desc: "前向きな熱血タイプ" },
    { name: "STEADY TURTLE", weight: 0.8, multiplier: 2.2, desc: "着実に進む安定タイプ" },
    { name: "STANDARD BIRD", weight: 0.4, multiplier: 2.8, desc: "バランスの取れた標準型" },
    { name: "CHAOS DICE", weight: 0.5, multiplier: 3.5, desc: "＋3か−3が出やすいギャンブラー" },
    { name: "DRUNK DUCK", weight: 0.1, multiplier: 4.5, desc: "フラフラして予測不能" },
    { name: "SLEEPY DUCK", weight: 0.2, multiplier: 5.5, desc: "0（停留）が多くマイペース" },
    { name: "SLOW STICKER", weight: -0.3, multiplier: 6.2, desc: "とにかくのんびり屋" },
    { name: "BACKWARD KING", weight: -0.5, multiplier: 7.0, desc: "マイナスが出やすい。勝てば伝説" },
    { name: "DARK HORSE", weight: 0.1, multiplier: 7.5, desc: "勝てば7.5倍、負ければ賭け金×1.5を失う魔のアヒル" }
];


// --- Selectors ---
const balanceEl = document.getElementById('coin-balance');
const playerNameEl = document.getElementById('player-name');
const totalBetEl = document.getElementById('total-bet-display');
const duckCountDisplay = document.getElementById('duck-count-display');
const duckMinusBtn = document.getElementById('duck-minus');
const duckPlusBtn = document.getElementById('duck-plus');
const unitMinusBtn = document.getElementById('unit-minus');
const unitPlusBtn = document.getElementById('unit-plus');
const unitDisplay = document.getElementById('unit-display');
const prepareRaceBtn = document.getElementById('prepare-race');
const startRaceBtn = document.getElementById('start-race');
const backToSetupBtn = document.getElementById('back-to-setup');
const newRaceBtn = document.getElementById('new-race');

const setupSection = document.getElementById('setup-section');
const bettingSection = document.getElementById('betting-section');
const raceSection = document.getElementById('race-section');
const resultSection = document.getElementById('result-section');

const duckListEl = document.getElementById('duck-list');
const raceTrackEl = document.getElementById('race-track');
const raceStatusEl = document.getElementById('race-status');

const allInRaceSection = document.getElementById('all-in-race-section');
const allInDuckListEl = document.getElementById('all-in-duck-list');
const allInStartBtn = document.getElementById('all-in-start-btn');
const crownIconEl = document.getElementById('crown-icon');

const loginOverlay = document.getElementById('login-overlay');
const profileListEl = document.getElementById('profile-list');
const createProfileBox = document.getElementById('create-profile-box');
const pinEntryBox = document.getElementById('pin-entry-box');
const newPlayerInput = document.getElementById('new-player-input');
const newPinInput = document.getElementById('new-pin-input');
const loginPinInput = document.getElementById('login-pin-input');
const createProfileBtn = document.getElementById('create-profile');
const loginSubmitBtn = document.getElementById('login-submit');
const loginCancelBtn = document.getElementById('login-cancel');

let loginPendingName = null;

// --- Initialization ---
async function init() {
    await loadGlobalData();
    showLogin();

    duckMinusBtn.onclick = () => {
        if (state.duckCount > 3) {
            state.duckCount--;
            duckCountDisplay.textContent = state.duckCount;
        }
    };

    duckPlusBtn.onclick = () => {
        if (state.duckCount < 8) {
            state.duckCount++;
            duckCountDisplay.textContent = state.duckCount;
        }
    };

    unitMinusBtn.onclick = () => {
        if (state.betUnit > 50) {
            state.betUnit -= 50;
            unitDisplay.textContent = state.betUnit;
        }
    };

    unitPlusBtn.onclick = () => {
        const cap = Math.min(1000, Math.floor(state.balance / 50) * 50);
        if (state.betUnit < cap) {
            state.betUnit += 50;
        } else {
            state.betUnit = Math.max(50, cap);
        }
        unitDisplay.textContent = state.betUnit;
    };

    prepareRaceBtn.onclick = prepareBetting;
    allInStartBtn.onclick = () => {
        state.totalBet = state.balance;
        state.balance = 0;
        updateUI();
        startRace();
    };
    startRaceBtn.onclick = startRace;
    backToSetupBtn.onclick = resetBets;
    newRaceBtn.onclick = () => switchSection(resultSection, setupSection);

    createProfileBtn.onclick = createNewProfile;
    loginSubmitBtn.onclick = verifyPin;
    loginCancelBtn.onclick = cancelPinEntry;
}

const API_URL = '/api';

// --- Persistence ---
async function loadGlobalData() {
    try {
        const res = await fetch(`${API_URL}/profiles`);
        state.profiles = await res.json();
    } catch (e) {
        console.error("Failed to load from backend, trying localStorage as fallback", e);
        const data = localStorage.getItem('duck_derby_v1');
        if (data) state.profiles = JSON.parse(data);
    }
}

async function saveGlobalData() {
    if (!state.currentPlayer) return;

    const profileData = {
        name: state.currentPlayer,
        balance: state.balance
    };

    // Include PIN and Crown status
    if (state.profiles[state.currentPlayer]) {
        profileData.pin = state.profiles[state.currentPlayer].pin;
        profileData.hasCrown = state.profiles[state.currentPlayer].hasCrown || false;
    }

    // Save to localStorage as quick cache
    state.profiles[state.currentPlayer] = { ...state.profiles[state.currentPlayer], balance: state.balance, hasCrown: profileData.hasCrown };
    localStorage.setItem('duck_derby_v1', JSON.stringify(state.profiles));

    try {
        const response = await fetch(`${API_URL}/profiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });
        if (!response.ok) throw new Error("API Save Failed");
    } catch (e) {
        console.error("Failed to save to backend", e);
    }
}

function showLogin() {
    loginOverlay.classList.remove('hidden');
    renderProfileList();
}

function renderProfileList() {
    profileListEl.innerHTML = '';
    createProfileBox.classList.remove('hidden');
    pinEntryBox.classList.add('hidden');

    Object.keys(state.profiles).forEach(name => {
        const item = document.createElement('div');
        item.className = 'profile-item';
        const hasCrown = state.profiles[name].hasCrown ? '<span class="crown">👑</span>' : '';
        item.innerHTML = `<span>${name}${hasCrown}</span><span>${state.profiles[name].balance} C</span>`;
        item.onclick = () => promptPin(name);
        profileListEl.appendChild(item);
    });
}

function promptPin(name) {
    loginPendingName = name;
    createProfileBox.classList.add('hidden');
    pinEntryBox.classList.remove('hidden');
    loginPinInput.value = '';
    loginPinInput.focus();
}

function verifyPin() {
    const enteredPin = loginPinInput.value;
    const actualPin = state.profiles[loginPendingName].pin;

    if (enteredPin === actualPin) {
        selectProfile(loginPendingName);
    } else {
        alert("INVALID PIN!");
        loginPinInput.value = '';
    }
}

function cancelPinEntry() {
    loginPendingName = null;
    pinEntryBox.classList.add('hidden');
    createProfileBox.classList.remove('hidden');
}

async function createNewProfile() {
    const name = newPlayerInput.value.trim().toUpperCase();
    const pin = newPinInput.value.trim();

    if (!name || pin.length !== 4) {
        alert("NAME AND 4-DIGIT PIN REQUIRED!");
        return;
    }
    if (state.profiles[name]) {
        alert("NAME ALREADY EXISTS!");
        return;
    }
    state.profiles[name] = { balance: 1000, pin: pin };
    state.balance = 1000;
    state.currentPlayer = name;
    await saveGlobalData();
    selectProfile(name);
    newPlayerInput.value = '';
    newPinInput.value = '';
}

function selectProfile(name) {
    state.currentPlayer = name;
    state.balance = state.profiles[name].balance;
    loginOverlay.classList.add('hidden');
    playerNameEl.textContent = name;

    if (state.profiles[name].hasCrown) {
        crownIconEl.classList.remove('hidden');
    } else {
        crownIconEl.classList.add('hidden');
    }

    loginPinInput.value = '';
    updateUI();
}

function updateUI() {
    balanceEl.textContent = state.balance;
    totalBetEl.textContent = state.totalBet;
    saveGlobalData(); // Save on every UI update
}

function switchSection(from, to) {
    from.classList.add('hidden');
    to.classList.remove('hidden');
}

function prepareAllInRace() {
    state.allInActive = true;
    state.bettingDucks = {};
    state.duckCount = 8;
    state.totalBet = 0;
    allInStartBtn.disabled = true;

    // Generate 8 Ducks
    state.ducks = [];
    const shuffled = [...PERSONALITIES].sort(() => Math.random() - 0.5);

    allInDuckListEl.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const duck = {
            id: i,
            ...shuffled[i % shuffled.length],
            score: 0
        };
        state.ducks.push(duck);

        const item = document.createElement('div');
        item.className = 'duck-item';
        item.dataset.id = i;
        item.innerHTML = `
            <img src="${SPRITE_URL}" class="duck-icon" style="filter: hue-rotate(${i * 45}deg)">
            <div class="duck-info">
                <span class="name">${duck.name}</span>
                <span class="odds">WIN -> CROWN / LOSS -> RESET</span>
                <span class="desc">${duck.desc}</span>
            </div>
            <div class="duck-item-bet">
                <span class="bet-val">0</span>
            </div>
        `;

        item.onclick = () => selectAllInDuck(i);
        allInDuckListEl.appendChild(item);
    }

    switchSection(setupSection, allInRaceSection);
}

function selectAllInDuck(id) {
    state.bettingDucks = { [id]: state.balance }; // Force all-in on exactly one

    const items = allInDuckListEl.querySelectorAll('.duck-item');
    items.forEach(item => {
        const itemId = parseInt(item.dataset.id);
        item.classList.toggle('selected', itemId === id);
        item.querySelector('.bet-val').textContent = (itemId === id) ? 'ALL IN' : '0';
    });

    allInStartBtn.disabled = false;
}

function prepareBetting() {
    // Check for ALL IN RACE Trigger (999,999,999 coins - Max 9s within 32-bit Integer)
    if (state.balance >= 999999999) {
        prepareAllInRace();
        return;
    }

    state.allInActive = false;
    state.bettingDucks = {};
    state.totalBet = 0;
    state.initialBalance = state.balance;
    updateUI();
    startRaceBtn.disabled = true;

    // Adjust bet unit if it exceeds current potential
    const unitCap = Math.min(1000, Math.floor(state.balance / 50) * 50);
    if (state.betUnit > unitCap) {
        state.betUnit = Math.max(50, unitCap);
        unitDisplay.textContent = state.betUnit;
    }

    // Dynamic Max Bets: 2 for 3 ducks, 3 for others
    maxBettingDucks = (state.duckCount === 3) ? 2 : 3;
    const subtitle = document.querySelector('.subtitle');
    if (subtitle) {
        subtitle.textContent = `MAX ${maxBettingDucks} DUCKS / +50 PER CLICK`;
    }

    // Generate Ducks
    state.ducks = [];
    const shuffled = [...PERSONALITIES].sort(() => Math.random() - 0.5);

    duckListEl.innerHTML = '';
    for (let i = 0; i < state.duckCount; i++) {
        const duck = {
            id: i,
            ...shuffled[i % shuffled.length],
            score: 0
        };
        state.ducks.push(duck);

        const item = document.createElement('div');
        item.className = 'duck-item';
        item.dataset.id = i;
        item.innerHTML = `
            <img src="${SPRITE_URL}" class="duck-icon" style="filter: hue-rotate(${i * 45}deg)">
            <div class="duck-info">
                <span class="name">${duck.name}</span>
                <span class="odds">x${duck.multiplier.toFixed(1)}</span>
                <span class="desc">${duck.desc}</span>
            </div>
            <div class="duck-item-bet">
                <div class="quick-btn-group">
                    <button class="nano-btn" onclick="event.stopPropagation(); quickBet(${i}, 'HALF')">HALF</button>
                    <button class="nano-btn" onclick="event.stopPropagation(); quickBet(${i}, 'ALL')">ALL</button>
                </div>
                <div class="bet-btn-group">
                    <button class="mini-btn minus" onclick="event.stopPropagation(); changeBet(${i}, -state.betUnit)">-</button>
                    <button class="mini-btn plus" onclick="event.stopPropagation(); changeBet(${i}, state.betUnit)">+</button>
                </div>
                <span class="bet-val">0</span>
            </div>
        `;

        item.onclick = () => changeBet(i, state.betUnit);
        duckListEl.appendChild(item);
    }

    switchSection(setupSection, bettingSection);
}

// --- Betting Actions ---
window.changeBet = function (id, amount) {
    const isAlreadyBetting = state.bettingDucks[id] !== undefined;
    const currentBettingCount = Object.keys(state.bettingDucks).length;

    if (amount > 0) {
        // Increment
        if (!isAlreadyBetting && currentBettingCount >= maxBettingDucks) return;
        if (state.balance < amount) return;

        if (!state.bettingDucks[id]) state.bettingDucks[id] = 0;
        state.bettingDucks[id] += amount;
        state.totalBet += amount;
        state.balance -= amount;
    } else {
        // Decrement
        if (!isAlreadyBetting || state.bettingDucks[id] <= 0) return;

        const actualDec = Math.min(state.bettingDucks[id], Math.abs(amount));
        state.bettingDucks[id] -= actualDec;
        state.totalBet -= actualDec;
        state.balance += actualDec;

        if (state.bettingDucks[id] <= 0) {
            delete state.bettingDucks[id];
        }
    }

    updateUI();
    updateBettingListUI();
    startRaceBtn.disabled = (state.totalBet <= 0);
};

window.quickBet = function (id, type) {
    const isAlreadyBetting = state.bettingDucks[id] !== undefined;
    const currentBettingCount = Object.keys(state.bettingDucks).length;

    if (!isAlreadyBetting && currentBettingCount >= maxBettingDucks) return;
    if (state.balance <= 0) return;

    let amount = 0;
    if (type === 'HALF') {
        amount = Math.floor(state.initialBalance / 2);
    } else if (type === 'ALL') {
        amount = state.balance;
    }

    if (amount <= 0 || state.balance < amount) return;

    if (!state.bettingDucks[id]) state.bettingDucks[id] = 0;
    state.bettingDucks[id] += amount;
    state.totalBet += amount;
    state.balance -= amount;

    updateUI();
    updateBettingListUI();
    startRaceBtn.disabled = (state.totalBet <= 0);
};


function updateBettingListUI() {
    const items = document.querySelectorAll('.duck-item');
    const currentBettingCount = Object.keys(state.bettingDucks).length;

    items.forEach(item => {
        const id = parseInt(item.dataset.id);
        const bet = state.bettingDucks[id] || 0;

        item.querySelector('.bet-val').textContent = bet;

        item.classList.remove('selected', 'locked');
        if (bet > 0) {
            item.classList.add('selected');
        } else if (currentBettingCount >= maxBettingDucks) {
            item.classList.add('locked');
        }
    });
}

function resetBets() {
    state.balance += state.totalBet;
    state.totalBet = 0;
    state.bettingDucks = {};
    updateUI();
    prepareBetting();
}

// --- Race ---

function startRace() {
    if (state.allInActive) {
        switchSection(allInRaceSection, raceSection);
    } else {
        switchSection(bettingSection, raceSection);
    }
    setupRaceTrack();

    state.raceActive = true;
    state.winners = [];
    raceStatusEl.textContent = "READY...";

    setTimeout(() => {
        raceStatusEl.textContent = "GO!!!";
        requestAnimationFrame(raceLoop);
    }, 1500);
}

function setupRaceTrack() {
    raceTrackEl.innerHTML = '<div class="finish-line"></div>';
    state.ducks.forEach(duck => {
        duck.score = 0;
        const betAmount = state.bettingDucks[duck.id] || 0;

        const lane = document.createElement('div');
        lane.className = 'lane' + (betAmount > 0 ? ' my-bet' : '');

        // 倍率表示 (左側)
        const oddsTag = document.createElement('div');
        oddsTag.className = 'bet-tag';
        oddsTag.style.left = '5px';
        oddsTag.style.right = 'auto';
        oddsTag.textContent = `x${duck.multiplier.toFixed(1)}`;
        lane.appendChild(oddsTag);

        // 賭け金表示 (右側)
        if (betAmount > 0) {
            const tag = document.createElement('div');
            tag.className = 'bet-tag';
            tag.textContent = `BET: ${betAmount}`;
            lane.appendChild(tag);
        }

        const sprite = document.createElement('img');
        sprite.src = SPRITE_URL;
        sprite.className = 'duck-sprite running';
        sprite.id = `sprite-${duck.id}`;
        sprite.style.left = '0%';
        sprite.style.filter = `hue-rotate(${duck.id * 45}deg)`;

        // Image error fallback
        sprite.onerror = () => {
            console.error("Image failed to load:", SPRITE_URL);
            sprite.style.background = "yellow"; // Fallback color block
        };

        lane.appendChild(sprite);
        raceTrackEl.appendChild(lane);
    });
}

function getWeightedMove(weight) {
    let move = Math.round(weight + (Math.random() * 6 - 3));
    return Math.max(-3, Math.min(3, move));
}

function raceLoop() {
    if (!state.raceActive) return;

    let raceFinished = false;

    state.ducks.forEach(duck => {
        const move = getWeightedMove(duck.weight);
        duck.score += move;
        if (duck.score < 0) duck.score = 0;

        const visualProgress = duck.score;
        // 85% is finish line. Calculate position to allow passing it.
        const percentage = (visualProgress / GOAL_SCORE) * 85;

        const sprite = document.getElementById(`sprite-${duck.id}`);
        if (sprite) {
            sprite.style.left = `${percentage}%`;
        }


        if (duck.score >= GOAL_SCORE) {
            if (!state.winners.includes(duck.id)) {
                state.winners.push(duck.id);
            }
            raceFinished = true;
        }
    });

    if (raceFinished) {
        finishRace();
    } else {
        setTimeout(() => {
            requestAnimationFrame(raceLoop);
        }, TICK_INTERVAL);
    }
}

function finishRace() {
    state.raceActive = false;
    raceStatusEl.textContent = "FINISH!";

    setTimeout(showResults, 1200);
}

function showResults() {
    const winnerId = state.winners[0];
    const winnerDuck = state.ducks.find(d => d.id === winnerId);

    // Calculate payouts
    let totalPayout = 0;
    let wonCrown = false;

    // 1. Regular win payout
    if (state.bettingDucks[winnerId]) {
        const amount = state.bettingDucks[winnerId];
        totalPayout = Math.floor(amount * winnerDuck.multiplier);

        if (state.allInActive) {
            wonCrown = true;
        }
    }

    // 2. Specialized Penalty for DARK HORSE
    // If you bet on DARK HORSE and it's NOT the winner, apply penalty
    if (!state.allInActive) {
        state.ducks.forEach(duck => {
            if (duck.name === "DARK HORSE" && state.bettingDucks[duck.id] && duck.id !== winnerId) {
                const betOnDarkHorse = state.bettingDucks[duck.id];
                // Penalty: lose 1.5x the bet.
                // Note: the 1.0x (original bet) is already deducted at changeBet.
                // So we subtract an additional 0.5x to make it 1.5x total loss.
                const extraLoss = Math.floor(betOnDarkHorse * 0.5);
                state.balance -= extraLoss;
                if (state.balance < 0) state.balance = 0;
            }
        });
    }

    // ALL IN RACE Logic
    if (state.allInActive) {
        if (wonCrown) {
            state.profiles[state.currentPlayer].hasCrown = true;
            crownIconEl.classList.remove('hidden');
            state.balance = 1000; // Reset to 1000 coins after getting the crown
            totalPayout = 0;
            alert("LEGENDARY! YOU GAINED THE CROWN! BALANCE RESET TO 1000.");
        } else {
            // LOST ALL IN RACE
            state.balance = 100; // Reset to 100 coins
            totalPayout = 0;
            alert("ALL IN RACE FAILED... BALANCE RESET TO 100.");
        }
    }

    state.balance += totalPayout;
    updateUI();
    saveGlobalData(); // Ensure crown/reset is synced


    const winnerDisplay = document.getElementById('winner-announcement');
    winnerDisplay.innerHTML = `
        <img src="${SPRITE_URL}" style="filter: hue-rotate(${winnerDuck.id * 45}deg); width: 64px; height: 64px;">
        <p style="margin-top:10px">${winnerDuck.name} WINS!</p>
    `;

    const payoutEl = document.getElementById('payout-result');
    payoutEl.textContent = `+${totalPayout}`;
    payoutEl.style.color = totalPayout > 0 ? 'var(--primary)' : 'red';

    const title = document.getElementById('result-title');
    title.textContent = totalPayout > 0 ? "BIG WINNER!" : "GAME OVER";

    switchSection(raceSection, resultSection);
}

init();
