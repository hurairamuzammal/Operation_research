// Theme Management - Clean localStorage-only approach
// Apply theme IMMEDIATELY on script load to prevent flash
(function () {
    let savedTheme = 'dark';
    try {
        savedTheme = localStorage.getItem('theme') || 'dark';
    } catch (e) {
        // For file:// protocol, try sessionStorage as fallback
        try {
            savedTheme = sessionStorage.getItem('theme') || 'dark';
        } catch (e2) { }
    }
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

function initTheme() {
    let savedTheme = 'dark';

    try {
        savedTheme = localStorage.getItem('theme') || 'dark';
    } catch (e) {
        // Fallback for file:// protocol
        try {
            savedTheme = sessionStorage.getItem('theme') || 'dark';
        } catch (e2) {
            console.warn('Unable to access storage:', e);
        }
    }

    document.documentElement.setAttribute('data-theme', savedTheme);
    updateLogoVisibility(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);

    // Save to both localStorage and sessionStorage for file:// compatibility
    try { localStorage.setItem('theme', newTheme); } catch (e) { }
    try { sessionStorage.setItem('theme', newTheme); } catch (e) { }

    updateLogoVisibility(newTheme);
}

function updateLogoVisibility(theme) {
    const logoDark = document.querySelector('.logo-dark');
    const logoLight = document.querySelector('.logo-light');

    if (logoDark && logoLight) {
        if (theme === 'light') {
            logoDark.style.display = 'none';
            logoLight.style.display = 'block';
        } else {
            logoDark.style.display = 'block';
            logoLight.style.display = 'none';
        }
    }
}

// Simple navigation helper
window.navigateTo = function (path) {
    window.location.href = path;
};

// Handle back/forward cache
window.addEventListener('pageshow', (event) => {
    if (event.persisted) initTheme();
});

document.addEventListener('DOMContentLoaded', function () {
    // Theme Toggles
    const toggleBtns = document.querySelectorAll('.theme-toggle, .header-theme-toggle');
    toggleBtns.forEach(btn => {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', toggleTheme);
    });

    // Handle Back Buttons automatically
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const href = backBtn.getAttribute('href');
            window.navigateTo(href);
        });
    }

    if (typeof initTabGlow === 'function') initTabGlow();
    initTheme();

    // Initialize cursor glow effect on all pages
    initCursorGlow();

    // Initialize audio feedback for tiles
    initAudioFeedback();
});

// =====================================================
// CURSOR GLOW EFFECT - Fast, Smooth & Responsive
// =====================================================
function initCursorGlow() {
    // Create cursor glow element if it doesn't exist
    let cursorGlow = document.querySelector('.cursor-glow');
    if (!cursorGlow) {
        cursorGlow = document.createElement('div');
        cursorGlow.className = 'cursor-glow';
        document.body.appendChild(cursorGlow);
    }

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;
    let isVisible = false;
    let animationId = null;

    // Lerp factor - higher = faster response (0.25 is very snappy)
    const lerpFactor = 0.25;

    function animate() {
        // Fast lerp for responsive feel
        glowX += (mouseX - glowX) * lerpFactor;
        glowY += (mouseY - glowY) * lerpFactor;

        // Use transform for GPU acceleration - center the 100px element
        cursorGlow.style.transform = `translate(${glowX - 50}px, ${glowY - 50}px) translateZ(0)`;

        animationId = requestAnimationFrame(animate);
    }

    function startAnimation() {
        if (!animationId) {
            animate();
        }
    }

    function stopAnimation() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    // Mouse move handler - update target position
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!isVisible) {
            isVisible = true;
            cursorGlow.classList.add('visible');
            startAnimation();
        }
    }, { passive: true });

    // Hide when mouse leaves the window
    document.addEventListener('mouseleave', () => {
        isVisible = false;
        cursorGlow.classList.remove('visible');
    });

    // Show when mouse enters
    document.addEventListener('mouseenter', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        glowX = mouseX;
        glowY = mouseY;
        isVisible = true;
        cursorGlow.classList.add('visible');
        startAnimation();
    });

    // Handle page visibility changes - pause when hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAnimation();
        } else if (isVisible) {
            startAnimation();
        }
    });

    // Start animation immediately
    startAnimation();
}

function initTabGlow() {
    const tabGroups = document.querySelectorAll('.mode-tabs');

    tabGroups.forEach(group => {
        // Create glow line if not exists
        if (!group.querySelector('.tab-glow-line')) {
            const line = document.createElement('div');
            line.className = 'tab-glow-line';
            group.appendChild(line);
        }

        const line = group.querySelector('.tab-glow-line');
        const buttons = group.querySelectorAll('.mode-tab-btn');

        function updateLine(targetBtn) {
            if (!targetBtn) return;
            const groupRect = group.getBoundingClientRect();
            const btnRect = targetBtn.getBoundingClientRect();

            const left = btnRect.left - groupRect.left;
            const width = btnRect.width;

            line.style.width = `${width}px`;
            line.style.transform = `translateX(${left}px)`;
            line.style.opacity = '1';
        }

        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all in this group
                buttons.forEach(b => b.classList.remove('active'));
                // Add to clicked
                e.currentTarget.classList.add('active');
                updateLine(e.currentTarget);
            });

            // Initialize position if active
            if (btn.classList.contains('active')) {
                // Small timeout to ensure layout is ready
                setTimeout(() => updateLine(btn), 50);
            }
        });

        // Window resize handler to adjust line
        window.addEventListener('resize', () => {
            const activeBtn = group.querySelector('.mode-tab-btn.active');
            if (activeBtn) updateLine(activeBtn);
        });
    });
}

// =====================================================
// AUDIO FEEDBACK - Gentle Hover & Click Sounds
// =====================================================
function initAudioFeedback() {
    // Create audio context lazily (for browser autoplay policy)
    let audioContext = null;
    let isAudioEnabled = false;

    function getAudioContext() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API not supported');
                return null;
            }
        }
        return audioContext;
    }

    // Enable audio and play click sound on first user interaction
    function enableAudioAndPlayClick() {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(() => {
                isAudioEnabled = true;
                // Play click sound immediately after enabling (force=true)
                playClickSound(true);
            });
        } else {
            isAudioEnabled = true;
            // Context already running, play sound immediately
            playClickSound(true);
        }
    }

    // Gentle hover sound - soft, high-pitched tick
    function playHoverSound() {
        const ctx = getAudioContext();
        if (!ctx || !isAudioEnabled) return;

        try {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Very soft, high-pitched tone
            oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
            oscillator.type = 'sine';

            // Subtle but audible
            gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.08);
        } catch (e) { /* Silently fail */ }
    }

    // Click sound - slightly deeper, satisfying click
    // force parameter allows first click to play before isAudioEnabled is set
    function playClickSound(force = false) {
        const ctx = getAudioContext();
        if (!ctx || (!isAudioEnabled && !force)) return;

        try {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Deeper, more satisfying tone for click
            oscillator.frequency.setValueAtTime(800, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
            oscillator.type = 'sine';

            // Moderate volume, satisfying decay
            gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.15);
        } catch (e) { /* Silently fail */ }
    }

    // Enable audio on first click/touch and play sound immediately
    document.addEventListener('click', enableAudioAndPlayClick, { once: true });
    document.addEventListener('touchstart', enableAudioAndPlayClick, { once: true });

    // Throttle hover sounds to prevent too many triggers
    let lastHoverTime = 0;
    const hoverThrottle = 100; // ms between hover sounds

    // Attach hover listeners to spotlight cards and algorithm cards
    const interactiveCards = document.querySelectorAll('.spotlight-card, .algorithm-card');

    interactiveCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            const now = Date.now();
            if (now - lastHoverTime > hoverThrottle) {
                lastHoverTime = now;
                playHoverSound();
            }
        });
    });

    // Attach click listeners to algorithm cards (solver navigation)
    const algorithmCards = document.querySelectorAll('.algorithm-card');

    algorithmCards.forEach(card => {
        card.addEventListener('click', () => {
            playClickSound();
        });
    });

    // === SOLVER PAGE BUTTONS ===
    // Target all interactive buttons on solver pages for professional feel
    const buttonSelectors = [
        '.back-btn',           // Back to home button
        '.btn',                // All general buttons (Solve, Random, Clear, etc.)
        '.mode-tab-btn',       // Mode/tab switching buttons
        '.header-theme-toggle', // Theme toggle
        'button'               // Any other buttons
    ];

    const allButtons = document.querySelectorAll(buttonSelectors.join(', '));

    allButtons.forEach(btn => {
        // Skip if already has click sound (algorithm cards)
        if (btn.classList.contains('algorithm-card')) return;

        // Add click sound
        btn.addEventListener('click', () => {
            playClickSound();
        });

        // Add hover sound for important buttons only (not too many)
        if (btn.classList.contains('back-btn') ||
            btn.classList.contains('mode-tab-btn') ||
            btn.classList.contains('large')) {
            btn.addEventListener('mouseenter', () => {
                const now = Date.now();
                if (now - lastHoverTime > hoverThrottle) {
                    lastHoverTime = now;
                    playHoverSound();
                }
            });
        }
    });
}
