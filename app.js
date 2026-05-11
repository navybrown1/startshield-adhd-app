let timer = null;
let timeLeft = 25 * 60;
let totalTime = 25 * 60;
let isBreak = false;
let sessionCount = parseInt(localStorage.getItem('sessionCount') || '0');

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
// Removed durationInput variable
// Removed apply duration since we moved entirely to presets for a cleaner UI
const presetBtns = document.querySelectorAll('.preset-btn');
const sessionCountDisplay = document.getElementById('session-count');

// Initialize Session Count
sessionCountDisplay.textContent = sessionCount;

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

function switchMode() {
    isBreak = !isBreak;
    resetTimer();
    
    // Update UI
    timerDisplay.classList.toggle('break-mode', isBreak);
    document.querySelector('.timer-wrapper').classList.toggle('break-mode', isBreak);
    modeLabel.parentElement.classList.toggle('break-mode', isBreak);
    
    modeLabel.textContent = isBreak ? 'Break Mode' : 'Focus Mode';
    modeToggle.textContent = isBreak ? 'Switch to Focus' : 'Switch to Break';
    
    if (isBreak) {
        // Automatically set a 5 minute break or 15 minute break (if 4 sessions complete)
        let breakMinutes = (sessionCount > 0 && sessionCount % 4 === 0) ? 15 : 5;
        timeLeft = breakMinutes * 60;
        totalTime = breakMinutes * 60;
    } else {
        // Return to last active preset or default 25
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
    // Request notification permission on first start
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
                    switchMode(); // Auto-switch back to focus
                } else {
                    sendDesktopNotification('Focus Complete!', 'Great job! Time for a break.');
                    // Increment session count
                    sessionCount++;
                    localStorage.setItem('sessionCount', sessionCount);
                    sessionCountDisplay.textContent = sessionCount;
                    switchMode(); // Auto-switch to break
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
        // Remove active class from all
        presetBtns.forEach(b => b.classList.remove('active'));
        // Add to clicked
        e.target.classList.add('active');
        
        // Force to focus mode if setting preset
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
// Removed listener

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

// Listen for actions from Electron main process
if (window.electronAPI) {
    window.electronAPI.onTimerUpdate((event, action) => {
        if (action === 'toggle') {
            startTimer();
        } else if (action === 'reset') {
            reset();
        } else if (action === 'switch') {
            switchMode();
        }
    });
}

// Initial display
updateDisplay();