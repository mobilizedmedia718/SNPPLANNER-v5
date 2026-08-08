/* SNP Planner Supabase connection + authentication */

const SNP_SUPABASE_URL = "https://mmstqostdqouxaiyrxtv.supabase.co";
const SNP_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6bxNaNPgezRwqyTrLtnUpA_zmXNoIsC";

const SNPDatabase = {
    client: null,
    session: null,

    init() {
        if (!window.supabase || typeof window.supabase.createClient !== "function") {
            console.error("Supabase client library did not load.");
            return false;
        }

        this.client = window.supabase.createClient(
            SNP_SUPABASE_URL,
            SNP_SUPABASE_PUBLISHABLE_KEY
        );

        return true;
    },

    async getSession() {
        if (!this.client) return null;
        const { data, error } = await this.client.auth.getSession();
        if (error) {
            console.error("Unable to read Supabase session:", error);
            return null;
        }
        this.session = data.session || null;
        return this.session;
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

                    ${message ? `<p id="authMessage" style="padding:10px;background:#f3f4f6;border-radius:8px;">${this.escape(message)}</p>` : `<p id="authMessage"></p>`}

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

        if (!email || !password) {
            this.setAuthMessage("Enter your email and password.");
            return;
        }

        this.setAuthMessage("Signing in...");

        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) {
            this.setAuthMessage(error.message);
            return;
        }

        this.session = data.session;
        await SNPPlanner.startApplication();
    },

    async signUp() {
        const email = document.getElementById("authEmail")?.value.trim();
        const password = document.getElementById("authPassword")?.value || "";

        if (!email || !password) {
            this.setAuthMessage("Enter an email and password first.");
            return;
        }

        if (password.length < 6) {
            this.setAuthMessage("Use a password with at least 6 characters.");
            return;
        }

        this.setAuthMessage("Creating account...");

        const { data, error } = await this.client.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: "https://mobilizedmedia718.github.io/SNPPLANNER-v5/"
            }
        });

        if (error) {
            this.setAuthMessage(error.message);
            return;
        }

        if (data.session) {
            this.session = data.session;
            await SNPPlanner.startApplication();
            return;
        }

        this.setAuthMessage("Account created. Check your email for the Supabase confirmation link, then return here and sign in.");
    },

    async signOut() {
        if (!this.client) return;
        await this.client.auth.signOut();
        this.session = null;
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

SNPDatabase.init();
