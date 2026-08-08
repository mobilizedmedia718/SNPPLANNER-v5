/* SNP Planner Supabase connection + authentication (REST based) */

const SNP_SUPABASE_URL = "https://mmstqostdqouxaiyrxtv.supabase.co";
const SNP_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6bxNaNPgezRwqyTrLtnUpA_zmXNoIsC";
const SNP_SESSION_KEY = "snpplanner_supabase_session";

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

    async getSession() {
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

    user() {
        return this.session?.user || null;
    },

    renderAuth(message = "") {
        const app = document.getElementById("app");
        if (!app) return;

        app.innerHTML = `
            <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Arial,sans-serif;background:#f5f6f8;">
                <div class="card" style="max-width:440px;width:100%;background:#fff;padding:24px;border-radius:12px;box-sizing:border-box;">
                    <h1 style="margin-top:0;">SNP Planner</h1>
                    <p>Sign in to access your planner data from any browser or device.</p>
                    <p id="authMessage" style="${message ? "padding:10px;background:#f3f4f6;border-radius:8px;" : ""}">${this.escape(message)}</p>
                    <label>Email</label>
                    <input id="authEmail" type="email" autocomplete="email" placeholder="you@example.com" style="width:100%;box-sizing:border-box;margin-bottom:12px;">
                    <label>Password</label>
                    <input id="authPassword" type="password" autocomplete="current-password" placeholder="Password" style="width:100%;box-sizing:border-box;margin-bottom:16px;">
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button type="button" onclick="SNPDatabase.signIn()">Sign In</button>
                        <button type="button" onclick="SNPDatabase.signUp()">Create Account</button>
                    </div>
                </div>
            </div>
        `;
    },

    setAuthMessage(message) {
        const box = document.getElementById("authMessage");
        if (box) box.textContent = message;
    },

    async signIn() {
        const email = document.getElementById("authEmail")?.value.trim();
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
            await SNPPlanner.startApplication();
        } catch (error) {
            this.setAuthMessage("Unable to reach Supabase. Check your connection and try again.");
            console.error(error);
        }
    },

    async signUp() {
        const email = document.getElementById("authEmail")?.value.trim();
        const password = document.getElementById("authPassword")?.value || "";
        if (!email || !password) return this.setAuthMessage("Enter an email and password first.");
        if (password.length < 6) return this.setAuthMessage("Use a password with at least 6 characters.");

        this.setAuthMessage("Creating account...");
        try {
            const response = await fetch(`${SNP_SUPABASE_URL}/auth/v1/signup`, {
                method: "POST",
                headers: this.headers(),
                body: JSON.stringify({
                    email,
                    password,
                    options: { emailRedirectTo: "https://mobilizedmedia718.github.io/SNPPLANNER-v5/" }
                })
            });
            const data = await response.json();
            if (!response.ok) {
                this.setAuthMessage(data?.msg || data?.message || data?.error_description || "Unable to create account.");
                return;
            }
            if (data.access_token) {
                this.saveSession(data);
                await SNPPlanner.startApplication();
                return;
            }
            this.setAuthMessage("Account created. Check your email for the confirmation link, then return here and sign in.");
        } catch (error) {
            this.setAuthMessage("Unable to reach Supabase. Check your connection and try again.");
            console.error(error);
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
