/**
 * Duck Derby - Retro Pixel Racing Game
 */

// --- State ---
let state = {
    balance: 1000,
    duckCount: 4,
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
const MAX_BETTING_DUCKS = 3;
const SPRITE_URL = './pixel_duck.svg';

const PERSONALITIES = [
    { name: "FLASH YELLOW", weight: 1.5, multiplier: 1.8, desc: "＋に進みやすい快速タイプ" },
    { name: "STEADY TURTLE", weight: 0.8, multiplier: 2.5, desc: "着実に進む安定タイプ" },
    { name: "CHAOS DICE", weight: 0.5, multiplier: 3.5, desc: "＋3か−3が出やすいギャンブラー" },
    { name: "SLEEPY DUCK", weight: 0.2, multiplier: 5.0, desc: "0（停留）が多くマイペース" },
    { name: "BACKWARD KING", weight: -0.5, multiplier: 15.0, desc: "マイナスが出やすい。勝てば伝説" },
    { name: "STANDARD BIRD", weight: 0.4, multiplier: 2.8, desc: "バランスの取れた標準型" },
    { name: "HOT FIGHTER", weight: 1.2, multiplier: 2.0, desc: "前向きな熱血タイプ" },
    { name: "DRUNK DUCK", weight: 0.1, multiplier: 4.5, desc: "フラフラして予測不能" }
];


// --- Selectors ---
const balanceEl = document.getElementById('coin-balance');
const totalBetEl = document.getElementById('total-bet-display');
const duckCountDisplay = document.getElementById('duck-count-display');
const duckMinusBtn = document.getElementById('duck-minus');
const duckPlusBtn = document.getElementById('duck-plus');
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

// --- Initialization ---
function init() {
    updateUI();

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

    prepareRaceBtn.onclick = prepareBetting;
    startRaceBtn.onclick = startRace;
    backToSetupBtn.onclick = resetBets;
    newRaceBtn.onclick = () => switchSection(resultSection, setupSection);
}

function updateUI() {
    balanceEl.textContent = state.balance;
    totalBetEl.textContent = state.totalBet;
}

function switchSection(from, to) {
    from.classList.add('hidden');
    to.classList.remove('hidden');
}

function prepareBetting() {
    state.bettingDucks = {};
    state.totalBet = 0;
    updateUI();
    startRaceBtn.disabled = true;

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
                <div class="bet-btn-group">
                    <button class="mini-btn minus" onclick="event.stopPropagation(); changeBet(${i}, -50)">-</button>
                    <button class="mini-btn plus" onclick="event.stopPropagation(); changeBet(${i}, 50)">+</button>
                </div>
                <span class="bet-val">0</span>
            </div>
        `;

        item.onclick = () => changeBet(i, 50);
        duckListEl.appendChild(item);
    }

    switchSection(setupSection, bettingSection);
}

window.changeBet = function (id, amount) {
    const isAlreadyBetting = state.bettingDucks[id] !== undefined;
    const currentBettingCount = Object.keys(state.bettingDucks).length;

    if (amount > 0) {
        // Increment
        if (!isAlreadyBetting && currentBettingCount >= MAX_BETTING_DUCKS) return;
        if (state.balance < amount) return;

        if (!state.bettingDucks[id]) state.bettingDucks[id] = 0;
        state.bettingDucks[id] += amount;
        state.totalBet += amount;
        state.balance -= amount;
    } else {
        // Decrement
        if (!isAlreadyBetting || state.bettingDucks[id] <= 0) return;

        state.bettingDucks[id] += amount; // amount is negative
        state.totalBet += amount;
        state.balance -= amount;

        if (state.bettingDucks[id] <= 0) {
            delete state.bettingDucks[id];
        }
    }

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
        } else if (currentBettingCount >= MAX_BETTING_DUCKS) {
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
    switchSection(bettingSection, raceSection);
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

    // Check all bets
    let totalPayout = 0;
    if (state.bettingDucks[winnerId]) {
        const amount = state.bettingDucks[winnerId];
        totalPayout = Math.floor(amount * winnerDuck.multiplier);
    }

    state.balance += totalPayout;
    updateUI();

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
