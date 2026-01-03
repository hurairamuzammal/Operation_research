// Theme Management with URL Parameter Persistence
function getThemeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('theme');
}

function initTheme() {
    let savedTheme = 'dark';

    // Priority 1: URL Parameter (strongest signal)
    const urlTheme = getThemeFromUrl();
    if (urlTheme === 'light' || urlTheme === 'dark') {
        savedTheme = urlTheme;
        // Sync to localStorage if possible
        try { localStorage.setItem('theme', savedTheme); } catch (e) { }
    } else {
        // Priority 2: LocalStorage
        try {
            savedTheme = localStorage.getItem('theme') || 'dark';
        } catch (e) {
            console.warn('Unable to access localStorage:', e);
        }
    }

    document.documentElement.setAttribute('data-theme', savedTheme);
    updateLogoVisibility(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);

    // Update LocalStorage
    try { localStorage.setItem('theme', newTheme); } catch (e) { }

    // Update URL without reloading
    const url = new URL(window.location);
    url.searchParams.set('theme', newTheme);
    window.history.replaceState({}, '', url);

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

// Navigation helper to preserve theme
window.navigateTo = function (path) {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const separator = path.includes('?') ? '&' : '?';
    window.location.href = `${path}${separator}theme=${currentTheme}`;
};

// Initialize immediately
initTheme();

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

        // Use transform for GPU acceleration
        cursorGlow.style.transform = `translate(${glowX - 200}px, ${glowY - 200}px) translateZ(0)`;

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
