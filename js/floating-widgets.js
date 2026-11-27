// js/floating-widgets.js — v10
(function() {
    'use strict';

    // ⭐ Contact Form Toggle
    window.toggleContactForm = function() {
        const panel = document.getElementById('contactFormPanel');
        if (!panel) return;
        panel.classList.toggle('open');
    };

    // ⭐ App Popup Toggle
    window.toggleAppPopup = function() {
        const popup = document.getElementById('appDownloadPopup');
        const overlay = document.getElementById('appPopupOverlay');
        if (!popup || !overlay) return;
        const isOpen = popup.style.display === 'block';
        popup.style.display = isOpen ? 'none' : 'block';
        overlay.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const desktopEl = document.getElementById('desktopAppContent');
            const mobileEl = document.getElementById('mobileAppContent');
            if (desktopEl) desktopEl.style.display = isMobile ? 'none' : 'block';
            if (mobileEl) mobileEl.style.display = isMobile ? 'block' : 'none';
        }
    };

    // ⭐ PWA Install
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const floatingBtn = document.getElementById('floatingAppIcon');
        if (floatingBtn) floatingBtn.style.display = 'flex';
    });

    window.triggerPWAInstall = async function() {
        if (!deferredPrompt) {
            alert('Install not available. Use browser menu → "Add to Home Screen".');
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (outcome === 'accepted') window.toggleAppPopup();
    };

    // ⭐ Cookie Banner
    window.acceptCookies = function() {
        localStorage.setItem('cookies_accepted', 'true');
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) banner.style.display = 'none';
    };

    // ⭐ Contact Form Submit (Web3Forms)
    document.addEventListener('DOMContentLoaded', () => {
        const cookieBanner = document.getElementById('cookie-consent-banner');
        if (cookieBanner && !localStorage.getItem('cookies_accepted')) {
            cookieBanner.style.display = 'flex';
        }

        const contactForm = document.getElementById('floatingContactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const btn = document.getElementById('contactSubmitBtn');
                const msg = document.getElementById('contactFormMsg');
                const originalText = btn.innerText;
                btn.innerText = 'Sending...'; btn.disabled = true;
                msg.style.display = 'none';
                try {
                    const formData = new FormData(this);
                    const res = await fetch('https://api.web3forms.com/submit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify(Object.fromEntries(formData))
                    });
                    const data = await res.json();
                    if (data.success) {
                        msg.style.color = '#16a34a';
                        msg.innerText = "Message sent successfully!";
                        msg.style.display = 'block';
                        this.reset();
                    } else {
                        msg.style.color = '#EF4444';
                        msg.innerText = data.message || "Something went wrong.";
                        msg.style.display = 'block';
                    }
                } catch (err) {
                    msg.style.color = '#EF4444';
                    msg.innerText = "Failed to send. Try again.";
                    msg.style.display = 'block';
                } finally {
                    btn.innerText = originalText; btn.disabled = false;
                }
            });
        }

        // ⭐ Auto-show floating app icon after 15s (was 8s — slower now)
        const showFloating = sessionStorage.getItem('floating_app_shown');
        if (!showFloating && 'serviceWorker' in navigator) {
            setTimeout(() => {
                const floatingBtn = document.getElementById('floatingAppIcon');
                if (floatingBtn && deferredPrompt) floatingBtn.style.display = 'flex';
            }, 15000);
            sessionStorage.setItem('floating_app_shown', 'true');
        }
    });

    // ⭐ Don't auto-request notification permission on load
    // (Audit recommendation — let user opt-in via UI)
})();
