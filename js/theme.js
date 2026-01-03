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
});

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
