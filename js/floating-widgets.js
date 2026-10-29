// js/floating-widgets.js
document.addEventListener('DOMContentLoaded', () => {
    
    // Agar page par pehle se contact form mojood hai, toh naya mat banao
    if (document.getElementById('floatingContactBtn')) return;

    // 1. Inject HTML for Floating Elements
    const floatingHTML = `
        <!-- FLOATING CONTACT FORM -->
        <div id="floatingContactBtn" class="floating-contact-btn" onclick="toggleContactForm()">
            <span>Contact Us</span>
        </div>

        <div id="contactFormPanel" class="contact-form-panel">
            <div class="contact-form-header">
                <h3>Contact Us</h3>
                <button class="close-contact-form" onclick="toggleContactForm()">&times;</button>
            </div>
            <div class="contact-form-body">
                <form id="floatingContactForm" action="https://api.web3forms.com/submit" method="POST">
                    <input type="hidden" name="access_key" value="59aca094-d044-44c9-b57e-5b19c9572270">
                    <input type="hidden" name="subject" value="New Message from PrimePickHub Floating Contact">
                    <input type="hidden" name="from_name" value="PrimePickHub Website">
                    
                    <div class="form-group">
                        <label>Your Name</label>
                        <input type="text" name="name" required>
                    </div>
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label>Message</label>
                        <textarea name="message" required></textarea>
                    </div>
                    <button type="submit" id="contactSubmitBtn">Send Message</button>
                </form>
                <p id="contactFormMsg" style="text-align: center; margin-top: 10px; font-size: 0.85rem;"></p>
            </div>
        </div>

        <!-- FLOATING APP SIDE BUTTON -->
        <button id="floatingAppIcon" class="floating-app-side-btn" onclick="toggleAppPopup()" style="display: none;">
            <img src="/assets/icon-192.png?v=4" alt="App">
            <span>App</span>
        </button>

        <!-- APP POPUP MODAL -->
        <div id="appPopupOverlay" class="app-popup-overlay" onclick="toggleAppPopup()" style="display: none;"></div>
        <div id="appDownloadPopup" class="app-popup" style="display: none;">
            <div class="app-popup-content">
                <span class="close-popup" onclick="toggleAppPopup()">&times;</span>
                <div class="app-icon"><img src="/assets/icon-192.png?v=4" alt="App Icon"></div>
                <h3>Install PrimePickHub App</h3>
                <p>Better experience, exclusive deals & faster checkout!</p>
                <div id="desktopAppContent" style="display: none; text-align: center;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://primepickhub.vercel.app/" alt="Scan QR Code" style="border-radius: 10px; border: 2px solid #E2E8F0; padding: 5px; margin-bottom: 10px;">
                    <p style="font-size: 0.85rem; color: #64748B;">Scan with your phone to Install</p>
                </div>
                <div id="mobileAppContent" style="display: none;">
                    <button class="btn-app-download" id="pwaInstallBtn" onclick="triggerPWAInstall()" style="background: var(--accent);">Install App</button>
                    <p style="font-size: 0.75rem; color: #64748B; margin-top: 10px;">Note: For iOS, use "Share > Add to Home Screen" in Safari.</p>
                </div>
            </div>
        </div>
    `;

    // Append to body
    document.body.insertAdjacentHTML('beforeend', floatingHTML);

    // 2. Logic for Contact Form
    window.toggleContactForm = function() {
        const panel = document.getElementById('contactFormPanel');
        if(panel) panel.classList.toggle('open');
    }

    const contactForm = document.getElementById('floatingContactForm');
    if(contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = document.getElementById('contactSubmitBtn');
            const msg = document.getElementById('contactFormMsg');
            const originalText = btn.innerText;

            btn.innerText = "Sending...";
            btn.disabled = true;
            msg.innerText = "";

            const formData = new FormData(contactForm);
            const object = Object.fromEntries(formData);
            const json = JSON.stringify(object);

            try {
                const res = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: json
                });

                const data = await res.json();

                if (data.success) {
                    msg.style.color = "#16a34a";
                    msg.innerText = "Message sent successfully!";
                    contactForm.reset();
                    setTimeout(() => {
                        window.toggleContactForm(); // Auto close
                        msg.innerText = ""; 
                    }, 2000);
                } else {
                    msg.style.color = "#EF4444";
                    msg.innerText = data.message || "Something went wrong.";
                }
            } catch (error) {
                msg.style.color = "#EF4444";
                msg.innerText = "Failed to send. Please try again.";
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    // 3. Logic for App Popup (if not already defined in app.js)
    if(typeof window.toggleAppPopup === 'undefined') {
        window.toggleAppPopup = function() {
            const popup = document.getElementById('appDownloadPopup');
            const overlay = document.getElementById('appPopupOverlay');
            const desktopContent = document.getElementById('desktopAppContent');
            const mobileContent = document.getElementById('mobileAppContent');
            
            if (!popup || !overlay) return;

            if (popup.style.display === 'none' || popup.style.display === '') {
                const userAgent = navigator.userAgent || navigator.vendor || window.opera;
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

                if (isMobile) {
                    if(mobileContent) mobileContent.style.display = 'block';
                    if(desktopContent) desktopContent.style.display = 'none';
                } else {
                    if(desktopContent) desktopContent.style.display = 'block';
                    if(mobileContent) mobileContent.style.display = 'none';
                }

                popup.style.display = 'block';
                overlay.style.display = 'block';
            } else {
                popup.style.display = 'none';
                overlay.style.display = 'none';
            }
        }
    }
});
