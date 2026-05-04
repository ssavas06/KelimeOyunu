// State Management
const state = {
    user: null,
    gameMode: null,
    currentQuestion: null,
    score: { correct: 0, wrong: 0 },
    questionCount: 0,
    isAnswering: false
};

// UI Elements
const views = {
    auth: document.getElementById('auth-view'),
    main: document.getElementById('main-view'),
};

const screens = {
    menu: document.getElementById('menu-screen'),
    game: document.getElementById('game-screen'),
    result: document.getElementById('result-screen'),
    settings: document.getElementById('settings-screen')
};

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    loadTheme();
    await checkAuth();
    
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
});

// Auth Functions
async function checkAuth() {
    try {
        const response = await fetch('/api/me');
        if (response.ok) {
            state.user = await response.json();
            showView('main');
            updateUI();
            await loadStats();
        } else {
            showView('auth');
        }
    } catch (err) {
        showView('auth');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');
    
    errorEl.classList.add('hidden');
    showLoading(true);

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            state.user = data;
            showView('main');
            updateUI();
            await loadStats();
        } else {
            errorEl.textContent = data.error;
            errorEl.classList.remove('hidden');
        }
    } catch (err) {
        errorEl.textContent = 'Bir hata oluştu.';
        errorEl.classList.remove('hidden');
    } finally {
        showLoading(false);
    }
}

async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    state.user = null;
    showView('auth');
}

async function updateUserLevel(level) {
    try {
        const response = await fetch('/api/user/level', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: parseInt(level) })
        });
        
        if (response.ok) {
            state.user.level = parseInt(level);
            updateUI();
            await loadStats();
        }
    } catch (err) {
        console.error('Level güncelleme hatası:', err);
    }
}

async function resetProgress() {
    console.log('Reset button clicked');
    if (!confirm('Tüm ilerlemeniz silinecektir. Emin misiniz?')) return;
    
    showLoading(true);
    try {
        console.log('Sending reset request...');
        const response = await fetch('/api/user/reset', { method: 'POST' });
        console.log('Response status:', response.status);
        if (response.ok) {
            alert('İlerlemeniz sıfırlandı.');
            await loadStats();
            goToMenu(); // Return to menu to see the changes
        } else {
            const error = await response.json();
            console.error('Reset failed:', error);
            alert('Sıfırlama başarısız oldu.');
        }
    } catch (err) {
        console.error('Sıfırlama hatası:', err);
        alert('Bir hata oluştu.');
    } finally {
        showLoading(false);
    }
}

function toggleTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    toggleTheme(savedTheme);
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = savedTheme;
}

// Game Logic
async function startGame(mode) {
    state.gameMode = mode;
    state.score = { correct: 0, wrong: 0 };
    state.questionCount = 0;
    
    showScreen('game');
    updateGameUI();
    await nextQuestion();
}

function goToSettings() {
    showScreen('settings');
}

async function nextQuestion() {
    if (state.questionCount >= 20) {
        showScreen('result');
        showResults();
        return;
    }

    showLoading(true);
    try {
        const response = await fetch(`/api/question?mode=${state.gameMode}`);
        const data = await response.json();

        if (data.allCompleted) {
            alert('Tebrikler, tüm kelimeleri tamamladınız!');
            goToMenu();
            return;
        }

        if (data.levelUp) {
            alert(`Tebrikler! Seviye ${data.nextLevel}'e yükseldiniz.`);
            state.user.level = data.nextLevel;
            updateUI();
            await nextQuestion();
            return;
        }

        if (data.noWords) {
            alert('Bu seviyede öğrenilecek yeni kelime kalmadı!');
            goToMenu();
            return;
        }

        state.currentQuestion = data;
        state.questionCount++;
        state.isAnswering = false;
        
        renderQuestion();
    } catch (err) {
        console.error(err);
    } finally {
        showLoading(false);
    }
}

function renderQuestion() {
    const q = state.currentQuestion;
    document.getElementById('question-word').textContent = q.question;
    document.getElementById('current-question-num').textContent = state.questionCount;
    
    const container = document.getElementById('choices-container');
    container.innerHTML = '';
    
    q.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice;
        btn.onclick = () => handleAnswer(choice, btn);
        container.appendChild(btn);
    });

    document.getElementById('feedback-container').classList.add('hidden');
}

async function handleAnswer(choice, btn) {
    if (state.isAnswering) return;
    state.isAnswering = true;

    const isCorrect = choice === state.currentQuestion.correctAnswer;
    const feedbackEl = document.getElementById('feedback-container');
    const feedbackMsg = document.getElementById('feedback-msg');

    // Disable all buttons
    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach(b => b.disabled = true);

    if (isCorrect) {
        state.score.correct++;
        btn.classList.add('correct');
        feedbackMsg.textContent = 'Tebrikler! Doğru cevap.';
        feedbackEl.className = 'feedback-container color-success';
        // Play correct sound if available
    } else {
        state.score.wrong++;
        btn.classList.add('wrong');
        feedbackMsg.textContent = `Yanlış cevap! Doğru cevap: ${state.currentQuestion.correctAnswer}`;
        feedbackEl.className = 'feedback-container color-danger';
        // Highlight correct one
        buttons.forEach(b => {
            if (b.textContent === state.currentQuestion.correctAnswer) b.classList.add('correct');
        });
    }

    feedbackEl.classList.remove('hidden');
    updateGameUI();

    // Submit answer to backend
    await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            wordId: state.currentQuestion.wordId, 
            correct: isCorrect,
            mode: state.gameMode
        })
    });

    setTimeout(nextQuestion, 1500);
}

// UI Helpers
function showView(viewId) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewId].classList.remove('hidden');
}

function showScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenId].classList.remove('hidden');
}

function updateUI() {
    if (!state.user) return;
    document.getElementById('display-username').textContent = state.user.username;
    document.getElementById('display-level').textContent = state.user.level;
    document.getElementById('welcome-name').textContent = state.user.username;
    
    const levelSelect = document.getElementById('level-select');
    if (levelSelect) levelSelect.value = state.user.level;
    
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = localStorage.getItem('theme') || 'dark';
}

function updateGameUI() {
    document.getElementById('score-correct').textContent = state.score.correct;
    document.getElementById('score-wrong').textContent = state.score.wrong;
}

async function loadStats() {
    try {
        const [resEn, resTr] = await Promise.all([
            fetch('/api/stats?mode=en-tr'),
            fetch('/api/stats?mode=tr-en')
        ]);
        
        const dataEn = await resEn.json();
        const dataTr = await resTr.json();
        
        document.getElementById('stats-learned-en').textContent = dataEn.learnedCount;
        document.getElementById('stats-learned-tr').textContent = dataTr.learnedCount;
        
        // Update EN Progress
        const percentEn = Math.round((dataEn.learnedCount / dataEn.totalCount) * 100) || 0;
        document.getElementById('progress-fill-en').style.width = `${percentEn}%`;
        document.getElementById('progress-text-en').textContent = `%${percentEn} (${dataEn.learnedCount}/${dataEn.totalCount})`;
        
        // Update TR Progress
        const percentTr = Math.round((dataTr.learnedCount / dataTr.totalCount) * 100) || 0;
        document.getElementById('progress-fill-tr').style.width = `${percentTr}%`;
        document.getElementById('progress-text-tr').textContent = `%${percentTr} (${dataTr.learnedCount}/${dataTr.totalCount})`;
        
    } catch (err) {
        console.error('Stats loading error:', err);
    }
}

function showResults() {
    showScreen('result');
    document.getElementById('result-correct').textContent = state.score.correct;
    document.getElementById('result-wrong').textContent = state.score.wrong;
    
    const percentage = Math.round((state.score.correct / 20) * 100);
    document.getElementById('result-percentage').textContent = `%${percentage}`;
    document.getElementById('result-chart').setAttribute('stroke-dasharray', `${percentage}, 100`);
}

function restartGame() {
    startGame(state.gameMode);
}

function goToMenu() {
    showScreen('menu');
    loadStats();
    updateUI();
}

function showLoading(show) {
    document.getElementById('loading-overlay').classList.toggle('hidden', !show);
}
