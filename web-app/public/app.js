// StartShield Web App - Main JavaScript
// Adapted from Electron version for web deployment

let timer = null;
let timeLeft = 25 * 60;
let totalTime = 25 * 60;
let isBreak = false;
let sessionCount = parseInt(localStorage.getItem('sessionCount') || '0');
let currentStreak = parseInt(localStorage.getItem('currentStreak') || '0');
let xpPoints = parseInt(localStorage.getItem('xpPoints') || '0');
let userLevel = parseInt(localStorage.getItem('userLevel') || '1');
let badges = JSON.parse(localStorage.getItem('badges') || '[]');
let ambientAudio = null;

const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const taskInput = document.getElementById('task-input');
const setTaskBtn = document.getElementById('set-task-btn');
const activeTaskDisplay = document.getElementById('active-task-display');
const progressRing = document.getElementById('progress-ring');
const progressCircle = progressRing.querySelector('.progress-circle');
const modeToggle = document.getElementById('mode-toggle');
const modeLabel = document.getElementById('mode-label');
const presetBtns = document.querySelectorAll('.preset-btn');
const sessionCountDisplay = document.getElementById('session-count');
const quickStreak = document.getElementById('quick-streak');
const quickLevel = document.getElementById('quick-level');

// Initialize displays
sessionCountDisplay.textContent = sessionCount;
updateQuickStats();
loadTheme();
loadAmbientSound();

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    updateProgress();
}

function updateProgress() {
    const percent = ((totalTime - timeLeft) / totalTime) * 100;
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percent / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
}

function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch(e) {
        console.log("Audio not supported or blocked", e);
    }
}

function sendDesktopNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, { body: body });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, { body: body });
            }
        });
    }
}

function addXP(amount) {
    xpPoints += amount;
    const xpForNextLevel = userLevel * 500;
    
    if (xpPoints >= xpForNextLevel) {
        userLevel++;
        xpPoints -= xpForNextLevel;
        showLevelUpNotification(userLevel);
    }
    
    localStorage.setItem('xpPoints', xpPoints);
    localStorage.setItem('userLevel', userLevel);
    updateStatsDisplay();
    updateQuickStats();
}

function checkBadges() {
    const newBadges = [];
    
    // First Session Badge
    if (sessionCount >= 1 && !badges.includes('first-session')) {
        newBadges.push({ id: 'first-session', name: 'First Steps', icon: '🎯' });
    }
    
    // 10 Sessions Badge
    if (sessionCount >= 10 && !badges.includes('ten-sessions')) {
        newBadges.push({ id: 'ten-sessions', name: 'Getting Serious', icon: '🔥' });
    }
    
    // 50 Sessions Badge
    if (sessionCount >= 50 && !badges.includes('fifty-sessions')) {
        newBadges.push({ id: 'fifty-sessions', name: 'Focus Master', icon: '⭐' });
    }
    
    // 7-Day Streak Badge
    if (currentStreak >= 7 && !badges.includes('week-warrior')) {
        newBadges.push({ id: 'week-warrior', name: 'Week Warrior', icon: '💪' });
    }
    
    // 30-Day Streak Badge
    if (currentStreak >= 30 && !badges.includes('month-master')) {
        newBadges.push({ id: 'month-master', name: 'Month Master', icon: '🏆' });
    }
    
    if (newBadges.length > 0) {
        badges.push(...newBadges.map(b => b.id));
        localStorage.setItem('badges', JSON.stringify(badges));
        showBadgeNotification(newBadges[0]);
        updateStatsDisplay();
    }
}

function showBadgeNotification(badge) {
    const notification = document.getElementById('badge-notification');
    const badgeName = document.getElementById('badge-name');
    badgeName.textContent = `${badge.icon} ${badge.name}`;
    notification.classList.remove('hidden');
    setTimeout(() => notification.classList.add('hidden'), 4000);
}

function showLevelUpNotification(level) {
    alert(`🎉 Level Up! You're now level ${level}!`);
}

function updateStatsDisplay() {
    document.getElementById('streak-display').textContent = currentStreak;
    document.getElementById('level-display').textContent = userLevel;
    document.getElementById('xp-display').textContent = xpPoints;
    document.getElementById('total-sessions-display').textContent = sessionCount;
    
    const xpForNextLevel = userLevel * 500;
    const progress = (xpPoints / xpForNextLevel) * 100;
    document.getElementById('level-progress').style.width = `${progress}%`;
    document.getElementById('level-progress-text').textContent = `${xpPoints}/${xpForNextLevel} XP to next level`;
    
    // Update badges display
    const badgesContainer = document.getElementById('badges-container');
    if (badges.length > 0) {
        const allBadges = [
            { id: 'first-session', name: 'First Steps', icon: '🎯' },
            { id: 'ten-sessions', name: 'Getting Serious', icon: '🔥' },
            { id: 'fifty-sessions', name: 'Focus Master', icon: '⭐' },
            { id: 'week-warrior', name: 'Week Warrior', icon: '💪' },
            { id: 'month-master', name: 'Month Master', icon: '🏆' }
        ];
        
        badgesContainer.innerHTML = '<div class="badges-grid">' + 
            allBadges.filter(b => badges.includes(b.id)).map(b => 
                `<div class="badge-item" title="${b.name}">${b.icon}</div>`
            ).join('') +
            '</div>';
    }
}

function updateQuickStats() {
    quickStreak.textContent = currentStreak;
    quickLevel.textContent = userLevel;
}

function switchMode() {
    isBreak = !isBreak;
    resetTimer();
    
    timerDisplay.classList.toggle('break-mode', isBreak);
    document.querySelector('.timer-wrapper').classList.toggle('break-mode', isBreak);
    modeLabel.parentElement.classList.toggle('break-mode', isBreak);
    
    modeLabel.textContent = isBreak ? 'Break Mode' : 'Focus Mode';
    modeToggle.textContent = isBreak ? 'Switch to Focus' : 'Switch to Break';
    
    if (isBreak) {
        let breakMinutes = (sessionCount > 0 && sessionCount % 4 === 0) ? 15 : 5;
        timeLeft = breakMinutes * 60;
        totalTime = breakMinutes * 60;
    } else {
        const activePreset = document.querySelector('.preset-btn.active');
        const focusMinutes = activePreset ? parseInt(activePreset.dataset.minutes) : 25;
        timeLeft = focusMinutes * 60;
        totalTime = focusMinutes * 60;
    }
    updateDisplay();
}

function resetTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    startBtn.textContent = 'Start';
}

function startTimer() {
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }

    if (timer) {
        clearInterval(timer);
        timer = null;
        startBtn.textContent = 'Start';
    } else {
        timer = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateDisplay();
            } else {
                clearInterval(timer);
                timer = null;
                startBtn.textContent = 'Start';
                
                playNotificationSound();
                
                if (isBreak) {
                    sendDesktopNotification('Break Over!', 'Time to get back to focus.');
                    switchMode();
                } else {
                    sendDesktopNotification('Focus Complete!', 'Great job! Time for a break.');
                    sessionCount++;
                    
                    // Update streak
                    const lastSession = localStorage.getItem('lastSessionDate');
                    const today = new Date().toDateString();
                    if (lastSession !== today) {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        if (lastSession === yesterday.toDateString()) {
                            currentStreak++;
                        } else if (lastSession) {
                            currentStreak = 1;
                        } else {
                            currentStreak = 1;
                        }
                        localStorage.setItem('currentStreak', currentStreak);
                        localStorage.setItem('lastSessionDate', today);
                    }
                    
                    localStorage.setItem('sessionCount', sessionCount);
                    sessionCountDisplay.textContent = sessionCount;
                    
                    // Add XP and check badges
                    addXP(50);
                    checkBadges();
                    
                    updateQuickStats();
                    switchMode();
                }
            }
        }, 1000);
        startBtn.textContent = 'Pause';
    }
}

function reset() {
    resetTimer();
    if (isBreak) {
        let breakMinutes = (sessionCount > 0 && sessionCount % 4 === 0) ? 15 : 5;
        timeLeft = breakMinutes * 60;
    } else {
        const activePreset = document.querySelector('.preset-btn.active');
        const focusMinutes = activePreset ? parseInt(activePreset.dataset.minutes) : 25;
        timeLeft = focusMinutes * 60;
    }
    totalTime = timeLeft;
    updateDisplay();
}

// Preset Buttons Logic
presetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        presetBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        if (isBreak) switchMode();
        
        const minutes = parseInt(e.target.dataset.minutes);
        resetTimer();
        timeLeft = minutes * 60;
        totalTime = timeLeft;
        updateDisplay();
    });
});

startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', reset);
modeToggle.addEventListener('click', switchMode);

setTaskBtn.addEventListener('click', () => {
    const task = taskInput.value.trim();
    if (task) {
        activeTaskDisplay.textContent = `Current Focus: ${task}`;
        taskInput.value = '';
        localStorage.setItem('currentTask', task);
    }
});

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        setTaskBtn.click();
    }
});

const savedTask = localStorage.getItem('currentTask');
if (savedTask) {
    activeTaskDisplay.textContent = `Current Focus: ${savedTask}`;
}

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
    if (modalId === 'stats-modal') {
        updateStatsDisplay();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Theme Functions
function changeTheme(theme) {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('theme', theme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.className = `theme-${savedTheme}`;
    document.getElementById('theme-select').value = savedTheme;
}

// Ambient Sound Functions
function changeAmbientSound(sound) {
    if (ambientAudio) {
        ambientAudio.pause();
        ambientAudio = null;
    }
    
    if (sound !== 'none') {
        const soundFiles = {
            'rain': 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf09a.mp3',
            'cafe': 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3',
            'white-noise': 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_c610232532.mp3',
            'forest': 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_07d7e50e9e.mp3'
        };
        
        ambientAudio = new Audio(soundFiles[sound]);
        ambientAudio.loop = true;
        ambientAudio.volume = document.getElementById('ambient-volume').value / 100;
        ambientAudio.play().catch(e => console.log('Audio autoplay blocked:', e));
    }
    
    localStorage.setItem('ambientSound', sound);
}

function changeVolume(value) {
    document.getElementById('volume-display').textContent = `${value}%`;
    if (ambientAudio) {
        ambientAudio.volume = value / 100;
    }
    localStorage.setItem('ambientVolume', value);
}

function loadAmbientSound() {
    const savedSound = localStorage.getItem('ambientSound') || 'none';
    const savedVolume = localStorage.getItem('ambientVolume') || '50';
    document.getElementById('ambient-sound').value = savedSound;
    document.getElementById('ambient-volume').value = savedVolume;
    document.getElementById('volume-display').textContent = `${savedVolume}%`;
    
    if (savedSound !== 'none') {
        changeAmbientSound(savedSound);
    }
}

// AI Chat Functions
let chatHistory = [];

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat('user', message);
    input.value = '';
    
    // Show loading state
    const loadingId = addMessageToChat('ai', 'Thinking...', true);
    
    try {
        const currentTask = localStorage.getItem('currentTask') || '';
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                context: {
                    task: currentTask,
                    sessionCount: sessionCount,
                    streak: currentStreak
                }
            })
        });
        
        // Remove loading message
        removeMessageFromChat(loadingId);
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        addMessageToChat('ai', data.response);
        
    } catch (error) {
        removeMessageFromChat(loadingId);
        addMessageToChat('ai', 'Sorry, I encountered an error. Please make sure the API key is configured in Vercel environment variables.');
        console.error('Chat error:', error);
    }
}

function addMessageToChat(role, content, isLoading = false) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageId = 'msg-' + Date.now();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message${isLoading ? ' loading' : ''}`;
    messageDiv.id = messageId;
    messageDiv.innerHTML = `<p>${content}</p>`;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageId;
}

function removeMessageFromChat(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
        message.remove();
    }
}

function handleChatKey(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

// AI Suggestion Function
async function getAiSuggestion() {
    const suggestionBox = document.getElementById('ai-suggestion');
    const originalContent = suggestionBox.innerHTML;
    
    suggestionBox.innerHTML = '<p>Getting personalized suggestion...</p>';
    
    try {
        const currentTask = localStorage.getItem('currentTask') || '';
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        
        const response = await fetch('/api/suggestion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                context: {
                    task: currentTask,
                    timeOfDay: timeOfDay
                }
            })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        suggestionBox.innerHTML = `<p>${data.suggestion}</p><button class="ask-ai-btn" onclick="getAiSuggestion()">Ask AI Coach</button>`;
        
    } catch (error) {
        suggestionBox.innerHTML = originalContent;
        alert('Failed to get AI suggestion. Please check your API configuration.');
        console.error('Suggestion error:', error);
    }
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Space to start/pause
    if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        startTimer();
    }
    
    // Ctrl/Cmd + R to reset
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyR') {
        e.preventDefault();
        reset();
    }
    
    // Ctrl/Cmd + Shift + A for AI Coach
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyA') {
        e.preventDefault();
        openModal('ai-coach-modal');
    }
    
    // Escape to close modals
    if (e.code === 'Escape') {
        document.querySelectorAll('.modal.hidden').forEach(modal => {
            // Close visible modals
        });
        document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
            modal.classList.add('hidden');
        });
    }
});

// Initial display
updateDisplay();
