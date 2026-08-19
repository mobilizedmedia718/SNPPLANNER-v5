/* SNP Planner Supabase connection + authentication (REST based) */

const SNP_SUPABASE_URL = "https://mmstqostdqouxaiyrxtv.supabase.co";
const SNP_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6bxNaNPgezRwqyTrLtnUpA_zmXNoIsC";
const SNP_SESSION_KEY = "snpplanner_supabase_session";
const SNP_PENDING_EMAIL_KEY = "snpplanner_pending_email";
const SNP_APP_URL = "https://paintthetownevents.com/planner.html";

const SNPDatabase = {
    client: {},
    session: null,

    init() {
        return true;
    },

    headers(accessToken = "") {
        const headers = {
            "apikey": SNP_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json"
        };
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
        return headers;
    },

    saveSession(session) {
        this.session = session || null;
        if (this.session) {
            localStorage.setItem(SNP_SESSION_KEY, JSON.stringify(this.session));
        } else {
            localStorage.removeItem(SNP_SESSION_KEY);
        }
    },

    async getSession(allowRefresh = true) {
        let stored = null;
        try {
            stored = JSON.parse(localStorage.getItem(SNP_SESSION_KEY) || "null");
        } catch (_) {
            stored = null;
        }

        if (!stored?.access_token) {
            this.session = null;
            return null;
        }

        try {
            const response = await fetch(`${SNP_SUPABASE_URL}/auth/v1/user`, {
                headers: this.headers(stored.access_token)
            });

            if (!response.ok && allowRefresh && stored.refresh_token) {
                const refreshed = await this.refreshSession(stored.refresh_token);
                if (refreshed?.access_token) return this.getSession(false);
            }

            if (!response.ok) {
                this.saveSession(null);
                return null;
            }

            const user = await response.json();
            this.session = { ...stored, user };
            return this.session;
        } catch (error) {
            console.error("Unable to verify Supabase session:", error);
            return null;
        }
    },

    async refreshSession(refreshToken = this.session?.refresh_token) {
        if (!refreshToken) return null;
        try {
            const response = await fetch(`${SNP_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                method: "POST",
                headers: this.headers(),
                body: JSON.stringify({ refresh_token: refreshToken })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data?.access_token) return null;
            this.saveSession(data);
            return data;
        } catch (_) {
            return null;
        }
    },

    user() {
        return this.session?.user || null;
    },

    async saveStorage(storageKey, storageValue) {
        const user = this.user();
        const token = this.session?.access_token;
        if (!user?.id || !token) return false;

        const response = await fetch(
            `${SNP_SUPABASE_URL}/rest/v1/app_storage?on_conflict=user_id,storage_key`,
            {
                method: "POST",
                headers: {
                    ...this.headers(token),
                    "Prefer": "resolution=merge-duplicates,return=minimal"
                },
                body: JSON.stringify({
                    user_id: user.id,
                    storage_key: storageKey,
                    storage_value: storageValue,
                    updated_at: new Date().toISOString()
                })
            }
        );

        if (!response.ok) {
            const detail = await response.text();
            throw new Error(`Cloud save failed for ${storageKey}: ${detail}`);
        }
        return true;
    },

    async removeStorage(storageKey) {
        const token = this.session?.access_token;
        if (!token) return false;

        const response = await fetch(
            `${SNP_SUPABASE_URL}/rest/v1/app_storage?storage_key=eq.${encodeURIComponent(storageKey)}`,
            { method: "DELETE", headers: this.headers(token) }
        );

        if (!response.ok) throw new Error(`Cloud delete failed for ${storageKey}.`);
        return true;
    },

    async getAllStorage() {
        const token = this.session?.access_token;
        if (!token) return [];

        const response = await fetch(
            `${SNP_SUPABASE_URL}/rest/v1/app_storage?select=storage_key,storage_value,updated_at`,
            { headers: this.headers(token) }
        );

        if (!response.ok) {
            const detail = await response.text();
            throw new Error(`Unable to load cloud data: ${detail}`);
        }
        return await response.json();
    },

    async syncCloudToLocal() {
        const rows = await this.getAllStorage();

        if (rows.length) {
            rows.forEach(row => {
                localStorage.setItem(`snpplanner_${row.storage_key}`, JSON.stringify(row.storage_value));
            });
            return { source: "cloud", count: rows.length };
        }

        const localRows = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const fullKey = localStorage.key(i);
            if (!fullKey || !fullKey.startsWith("snpplanner_") || fullKey === SNP_SESSION_KEY) continue;

            const storageKey = fullKey.slice("snpplanner_".length);
            try {
                localRows.push([storageKey, JSON.parse(localStorage.getItem(fullKey))]);
            } catch (_) {}
        }

        await Promise.all(localRows.map(([key, value]) => this.saveStorage(key, value)));
        return { source: "local", count: localRows.length };
    },

    cleanRedirectUrl() {
        const url = new URL(SNP_APP_URL);
        url.hash = "";
        return url.toString();
    },

    renderAuth(message = "", email = "") {
        const app = document.getElementById("app");
        if (!app) return;

        const rememberedEmail = email || sessionStorage.getItem(SNP_PENDING_EMAIL_KEY) || "";

        app.innerHTML = `
            <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Arial,sans-serif;background:#f5f6f8;">
                <div class="card" style="max-width:440px;width:100%;background:#fff;padding:24px;border-radius:12px;box-sizing:border-box;">
                    <h1 style="margin-top:0;">SNP Planner</h1>
                    <p>Sign in to access your planner data from any browser or device.</p>
                    <p id="authMessage" style="${message ? "padding:10px;background:#f3f4f6;border-radius:8px;" : ""}">${this.escape(message)}</p>
                    <label>Email</label>
                    <input id="authEmail" type="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" value="${this.escape(rememberedEmail)}" placeholder="you@example.com" style="width:100%;box-sizing:border-box;margin-bottom:12px;">
                    <label>Password</label>
                    <input id="authPassword" type="password" minlength="8" autocomplete="current-password" value="" placeholder="Password" style="width:100%;box-sizing:border-box;margin-bottom:10px;">
                    <label style="display:flex;gap:8px;align-items:center;margin:0 0 16px;"><input id="authShowPassword" type="checkbox" style="width:auto;" onchange="SNPDatabase.togglePassword()"> Show password</label>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button type="button" onclick="SNPDatabase.signIn()">Sign In</button>
                        <button type="button" onclick="SNPDatabase.signUp()">Create Account</button>
                    </div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
                        <button type="button" onclick="SNPDatabase.forgotPassword()">Forgot Password</button>
                        <button type="button" onclick="SNPDatabase.resendConfirmation()">Resend Confirmation</button>
                    </div>
                    <p style="margin-top:14px;"><small>New accounts confirm their email once. Existing confirmed accounts should sign in or reset their password; they will not receive another signup confirmation.</small></p>
                </div>
            </div>
        `;

        setTimeout(() => {
            const password = document.getElementById("authPassword");
            if (password) password.value = "";
        }, 150);
    },

    togglePassword() {
        const password = document.getElementById("authPassword");
        if (password) password.type = document.getElementById("authShowPassword")?.checked ? "text" : "password";
    },

    setAuthMessage(message) {
        const box = document.getElementById("authMessage");
        if (box) box.textContent = message;
    },

    async signIn() {
        const email = document.getElementById("authEmail")?.value.trim().toLowerCase();
        const password = document.getElementById("authPassword")?.value || "";
        if (!email || !password) return this.setAuthMessage("Enter your email and password.");

        this.setAuthMessage("Signing in...");
        try {
            const response = await fetch(`${SNP_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: "POST",
                headers: this.headers(),
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                this.setAuthMessage(data?.msg || data?.error_description || data?.message || "Unable to sign in.");
                return;
            }
            this.saveSession(data);
            sessionStorage.removeItem(SNP_PENDING_EMAIL_KEY);
            await SNPPlanner.startApplication();
        } catch (error) {
            this.setAuthMessage("Unable to reach Supabase. Check your connection and try again.");
            console.error(error);
        }
    },

    async signUp() {
        const email = document.getElementById("authEmail")?.value.trim().toLowerCase();
        const password = document.getElementById("authPassword")?.value || "";
        if (!email || !password) return this.setAuthMessage("Enter an email and password first.");
        if (password.length < 8) return this.setAuthMessage("Use a password with at least 8 characters.");

        this.setAuthMessage("Creating account...");
        try {
            const signupUrl = `${SNP_SUPABASE_URL}/auth/v1/signup?redirect_to=${encodeURIComponent(this.cleanRedirectUrl())}`;
            const response = await fetch(signupUrl, {
                method: "POST",
                headers: this.headers(),
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                this.setAuthMessage(data?.msg || data?.message || data?.error_description || "Unable to create account.");
                return;
            }
            if (data.access_token) {
                this.saveSession(data);
                sessionStorage.removeItem(SNP_PENDING_EMAIL_KEY);
                await SNPPlanner.startApplication();
                return;
            }
            if (Array.isArray(data.user?.identities) && data.user.identities.length === 0) {
                return this.renderAuth("No new account was created because this email may already be registered. Use Sign In with the existing password, or choose Forgot Password. An already-confirmed account will not receive another signup confirmation email.", email);
            }
            sessionStorage.setItem(SNP_PENDING_EMAIL_KEY, email);
            this.renderAuth("Account created. Check this email for the confirmation link, including Spam or Promotions. The link will return directly to SNP Planner.", email);
        } catch (error) {
            this.setAuthMessage("Unable to reach Supabase. Check your connection and try again.");
            console.error(error);
        }
    },

    async forgotPassword() {
        const email = document.getElementById("authEmail")?.value.trim().toLowerCase();
        if (!email) return this.renderAuth("Enter your email first, then choose Forgot Password.");
        try {
            const response = await fetch(`${SNP_SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(this.cleanRedirectUrl())}`, {
                method: "POST",
                headers: this.headers(),
                body: JSON.stringify({ email })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) return this.renderAuth(data?.msg || data?.message || data?.error_description || `Unable to send reset email (${response.status}).`, email);
            this.renderAuth("Password reset email requested. Open its link; it will return here so you can choose a new password.", email);
        } catch (_) {
            this.renderAuth("Unable to request a password reset. Check your connection and try again.", email);
        }
    },

    async resendConfirmation() {
        const email = document.getElementById("authEmail")?.value.trim().toLowerCase();
        if (!email) return this.renderAuth("Enter your email first, then choose Resend Confirmation.");
        try {
            const response = await fetch(`${SNP_SUPABASE_URL}/auth/v1/resend?redirect_to=${encodeURIComponent(this.cleanRedirectUrl())}`, {
                method: "POST",
                headers: this.headers(),
                body: JSON.stringify({ type: "signup", email })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) return this.renderAuth(data?.msg || data?.message || data?.error_description || `Unable to resend confirmation (${response.status}).`, email);
            sessionStorage.setItem(SNP_PENDING_EMAIL_KEY, email);
            this.renderAuth("If this is a new unconfirmed account, another confirmation email has been requested. Check Spam or Promotions too. If the account is already confirmed, use Sign In or Forgot Password instead.", email);
        } catch (_) {
            this.renderAuth("Unable to resend confirmation. Check your connection and try again.", email);
        }
    },

    async consumeAuthRedirect() {
        const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const error = hash.get("error_description");
        if (error) {
            history.replaceState({}, "", location.pathname);
            this.renderAuth(`Email link could not be completed: ${error}`);
            return { handled: true, error };
        }
        if (!accessToken) return { handled: false };
        const session = {
            access_token: accessToken,
            refresh_token: hash.get("refresh_token") || "",
            expires_in: Number(hash.get("expires_in") || 0),
            expires_at: Math.floor(Date.now() / 1000) + Number(hash.get("expires_in") || 0),
            token_type: hash.get("token_type") || "bearer"
        };
        try {
            const response = await fetch(`${SNP_SUPABASE_URL}/auth/v1/user`, { headers: this.headers(accessToken) });
            if (response.ok) session.user = await response.json();
        } catch (_) {}
        this.saveSession(session);
        sessionStorage.removeItem(SNP_PENDING_EMAIL_KEY);
        const type = hash.get("type") || "";
        history.replaceState({}, "", location.pathname + location.search);
        return { handled: true, type };
    },

    renderPasswordReset() {
        const app = document.getElementById("app");
        if (!app) return;
        app.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Arial,sans-serif;background:#f5f6f8;"><div class="card" style="max-width:440px;width:100%;background:#fff;padding:24px;border-radius:12px;box-sizing:border-box;"><h2>Choose a New SNP Planner Password</h2><p>Use at least 8 characters.</p><label>New Password</label><input id="authNewPassword" type="password" minlength="8" autocomplete="new-password"><label>Confirm New Password</label><input id="authConfirmPassword" type="password" minlength="8" autocomplete="new-password"><button type="button" style="margin-top:16px;" onclick="SNPDatabase.completePasswordReset()">Save New Password</button></div></div>`;
    },

    async completePasswordReset() {
        const password = document.getElementById("authNewPassword")?.value || "";
        const confirmPassword = document.getElementById("authConfirmPassword")?.value || "";
        if (password.length < 8) return alert("Use a password with at least 8 characters.");
        if (password !== confirmPassword) return alert("The passwords do not match.");
        const token = this.session?.access_token;
        if (!token) return this.renderAuth("The password-reset link expired. Request another reset email.");
        try {
            const response = await fetch(`${SNP_SUPABASE_URL}/auth/v1/user`, {
                method: "PUT",
                headers: this.headers(token),
                body: JSON.stringify({ password })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data?.msg || data?.message || data?.error || "Unable to update password.");
            alert("Password updated. SNP Planner will open now.");
            await SNPPlanner.startApplication();
        } catch (error) {
            alert(error?.message || "Unable to update password.");
        }
    },

    async signOut() {
        const token = this.session?.access_token;
        try {
            if (token) {
                await fetch(`${SNP_SUPABASE_URL}/auth/v1/logout`, {
                    method: "POST",
                    headers: this.headers(token)
                });
            }
        } catch (_) {}
        this.saveSession(null);
        this.renderAuth("Signed out.");
    },

    escape(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
};

window.SNPDatabase = SNPDatabase;
SNPDatabase.init();
