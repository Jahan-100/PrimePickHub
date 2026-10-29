// js/floating-widgets.js
document.addEventListener('DOMContentLoaded', () => {
    
    // Agar page par pehle se contact form mojood hai (jaise index.html mein), toh naya mat banao
    if (document.getElementById('floatingContactBtn')) return;

    // 1. Inject HTML for Floating Contact Form
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

        <!-- FLOATING APP BUTTON (Styled in index.html/head) -->
        <button id="floatingAppIcon" onclick="toggleAppPopup()" style="display: none;">
            <img src="/assets/icon-192.png?v=4" alt="App">
            <span>App</span>
        </button>
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
});
