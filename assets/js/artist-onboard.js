(function() {
    const currentScript = document.currentScript;
    const randomId = "lecable_" + Math.random().toString(36).slice(2, 12);

    // --- GESTION DES TRADUCTIONS PERSONNALISÉES ---
    const defaultT = {
        fr: {
            success: "Demande de branchement reçue.\nOn vous tient informé bientôt !",
            error: "Erreur lors de la demande de branchement.\nVeuillez réessayer.",
            timeout: "Le délai de branchement est dépassé.\nVeuillez réessayer.",
            loading: "Demande de branchement\nen cours...",
            retry: "Réessayer",
            submit: "S'inscrire",
            placeholders: { email: "votre@email.com", name: "Nom ou Pseudonyme", desc: "Parlez-nous de vous...", url: "Lien (site, portfolio, etc.)" }
        },
        en: {
            success: "Connection request received.\nWe'll be in touch soon!",
            error: "Error during connection request.\nPlease try again.",
            timeout: "Connection timed out.\nPlease try again.",
            loading: "Connection request\nin progress...",
            retry: "Retry",
            submit: "Join Now",
            placeholders: { email: "your@email.com", name: "Name or Pseudonym", desc: "Tell us more about you...", url: "Link (website, portfolio, etc.)" }
        }
    };

    let userT = {};
    try {
        const attr = currentScript.getAttribute('data-i18n');
        if (attr) userT = JSON.parse(attr);
    } catch (e) { console.error("LeCable: Erreur format JSON dans data-i18n"); }

    const CONFIG = {
        authEndpoint: "https://lecable.de/api/auth/token",
        onboardEndpoint: "https://lecable.de/api/artist/onboard",
        apiKey: currentScript.getAttribute('data-token') || '',
        uuid: currentScript.getAttribute('data-uuid') || '',
        container: currentScript.getAttribute('data-container') || 'body',
        locale: (navigator.language || 'en').startsWith('fr') ? 'fr' : 'en',
        timeoutMs: 30000
    };

    const t = {
        ...defaultT[CONFIG.locale],
        ...(userT[CONFIG.locale] || {})
    };

    const emit = (name, detail = {}) => {
        document.dispatchEvent(new CustomEvent(`lecable:${name}`, { detail: { ...detail, formId: randomId } }));
    };

    const injectStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            #${randomId} { max-width: 450px; margin: 20px auto; font-family: sans-serif; position: relative; min-height: 400px; display: flex; flex-direction: column; }
            #${randomId} .form-content { display: flex; flex-direction: column; gap: 12px; flex-grow: 1; }
            #${randomId} input, #${randomId} textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 14px; transition: border-color 0.3s; }
            #${randomId} .desc-container { position: relative; }
            #${randomId} .char-count { position: absolute; bottom: 9px; right: 8px; font-size: 10px; color: #999; pointer-events: none; background: rgba(255,255,255,0.8); padding: 0 2px; }
            #${randomId} textarea { min-height: 100px; resize: none; padding-bottom: 25px; }
            #${randomId} input.invalid, #${randomId} textarea.invalid { border-color: #e74c3c !important; }
            #${randomId} .overlay { position: absolute; top:0; left:0; right:0; bottom:0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: white; z-index: 10; }
            #${randomId} .status-msg { font-size: 14px; padding: 15px; margin-bottom: 15px; white-space: pre-line; }
            #${randomId} .status-error { color: #e74c3c; }
            #${randomId} .status-success { color: #27ae60; font-weight: bold; }
            #${randomId} button { padding: 12px; border: none; border-radius: 4px; background: #333; color: #fff; cursor: pointer; font-weight: bold; }
            #${randomId} .hidden { display: none !important; }
            #${randomId} .cable-loader { position: relative; width: 60px; height: 30px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
            #${randomId} .cable-plug { width: 20px; height: 10px; background: #333; border-radius: 2px; position: relative; }
            #${randomId} .cable-plug::after { content: ''; position: absolute; right: -5px; top: 2px; width: 5px; height: 6px; background: #666; }
            #${randomId} .cable-left { animation: plug-in-left 1s ease-in-out infinite alternate; }
            #${randomId} .cable-right { animation: plug-in-right 1s ease-in-out infinite alternate; }
            @keyframes plug-in-left { from { transform: translateX(-10px); } to { transform: translateX(5px); } }
            @keyframes plug-in-right { from { transform: translateX(10px); } to { transform: translateX(-5px); } }
            @keyframes lecable-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
            .shake { animation: lecable-shake 0.4s ease-in-out; }
        `;
        document.head.appendChild(style);
    };

    const buildForm = () => {
        injectStyles();
        const form = document.createElement('form');
        form.id = randomId;
        form.innerHTML = `
            <div id="${randomId}_fields" class="form-content">
                <input type="email" name="email" placeholder="${t.placeholders.email}" required maxlength="100">
                <input type="text" name="name" placeholder="${t.placeholders.name}" required maxlength="75">
                <div class="desc-container">
                    <textarea name="desc" id="${randomId}_textarea" placeholder="${t.placeholders.desc}" required maxlength="250"></textarea>
                    <span id="${randomId}_count" class="char-count">0 / 250</span>
                </div>
                <input type="url" name="url" placeholder="${t.placeholders.url}" required maxlength="200">
                <input type="text" name="company" style="display:none !important" tabindex="-1" autocomplete="off">
                <button type="submit">${t.submit}</button>
            </div>
            <div id="${randomId}_overlay" class="overlay hidden">
                <div id="${randomId}_anim" class="cable-loader">
                    <div class="cable-plug cable-left"></div>
                    <div class="cable-plug cable-right"></div>
                </div>
                <div id="${randomId}_status" class="status-msg"></div>
                <button id="${randomId}_retry" type="button" class="hidden">${t.retry}</button>
            </div>
        `;

        const target = document.querySelector(CONFIG.container) || document.body;
        target.appendChild(form);

        const fields = document.getElementById(`${randomId}_fields`);
        const overlay = document.getElementById(`${randomId}_overlay`);
        const anim = document.getElementById(`${randomId}_anim`);
        const statusDiv = document.getElementById(`${randomId}_status`);
        const retryBtn = document.getElementById(`${randomId}_retry`);
        const textarea = document.getElementById(`${randomId}_textarea`);
        const charCount = document.getElementById(`${randomId}_count`);

        textarea.addEventListener("input", () => { charCount.textContent = `${textarea.value.length} / 250`; });

        const showForm = () => {
            fields.classList.remove("hidden");
            overlay.classList.add("hidden");
            retryBtn.classList.add("hidden");
            statusDiv.className = "status-msg";
        };

        retryBtn.addEventListener("click", showForm);

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (form.company.value !== "") return;

            const inputs = [form.email, form.name, textarea, form.url];
            inputs.forEach(i => i.classList.remove("invalid"));

            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            const nameRegex = /^[a-zA-Z0-9._\-\s]{1,75}$/;
            const urlRegex = /^https?:\/\/[^\s$.?#].[^\s]*$/i;

            let isInvalid = false;
            if (!emailRegex.test(form.email.value.trim())) { form.email.classList.add("invalid"); isInvalid = true; }
            if (!nameRegex.test(form.name.value.trim())) { form.name.classList.add("invalid"); isInvalid = true; }
            if (!urlRegex.test(form.url.value.trim())) { form.url.classList.add("invalid"); isInvalid = true; }
            if (textarea.value.trim().length === 0) { textarea.classList.add("invalid"); isInvalid = true; }

            if (isInvalid) {
                form.classList.add("shake");
                setTimeout(() => form.classList.remove("shake"), 500);
                return;
            }

            fields.classList.add("hidden");
            overlay.classList.remove("hidden");
            anim.classList.remove("hidden");
            statusDiv.textContent = t.loading;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

            try {
                // Étape 1 : Récupération du short token
                const authResponse = await fetch(`${CONFIG.authEndpoint}?scope=artist/onboard`, {
                    method: 'GET',
                    headers: { 'X-Api-Key': CONFIG.apiKey },
                    signal: controller.signal
                });

                if (!authResponse.ok) throw new Error("Auth failed");
                const authData = await authResponse.json();
                const shortToken = authData.token;

                // Étape 2 : Appel API Onboard avec le nouveau header X-Token
                const response = await fetch(CONFIG.onboardEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Token': shortToken
                    },
                    body: JSON.stringify({
                        email: form.email.value.trim(),
                        artist_name: form.name.value.trim(),
                        short_desc: textarea.value.trim().replace(/[<>]/g, ""),
                        url: form.url.value.trim(),
                        uuid: CONFIG.uuid
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                anim.classList.add("hidden");

                if (response.ok) {
                    statusDiv.textContent = t.success;
                    statusDiv.classList.add("status-success");
                    emit('success', { email: form.email.value.trim() });
                } else { throw new Error(); }
            } catch (err) {
                clearTimeout(timeoutId);
                anim.classList.add("hidden");
                statusDiv.classList.add("status-error");
                statusDiv.textContent = err.name === 'AbortError' ? t.timeout : t.error;
                retryBtn.classList.remove("hidden");
                emit('error', err);
            }
        });
    };

    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", buildForm); } else { buildForm(); }
})();
