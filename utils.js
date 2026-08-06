const Utils = {

    id() {
        return crypto.randomUUID();
    },

    money(value) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD"
        }).format(Number(value || 0));
    },

    date() {
        return new Date().toISOString();
    },

    save(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    load(key, fallback = null) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : fallback;
    }

};
