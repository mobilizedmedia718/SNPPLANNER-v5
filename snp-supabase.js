/* SNP Planner Supabase connection */

const SNP_SUPABASE_URL = "https://mmstqostdqouxaiyrxtv.supabase.co";
const SNP_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6bxNaNPgezRwqyTrLtnUpA_zmXNoIsC";

const SNPDatabase = {
    client: null,

    init() {
        if (!window.supabase || typeof window.supabase.createClient !== "function") {
            console.error("Supabase client library did not load.");
            return false;
        }

        this.client = window.supabase.createClient(
            SNP_SUPABASE_URL,
            SNP_SUPABASE_PUBLISHABLE_KEY
        );

        console.log("SNP Planner connected to Supabase client.");
        return true;
    }
};

SNPDatabase.init();
