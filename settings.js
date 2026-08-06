const Settings = {

    data: {
        theme: "light",
        currency: "USD",
        language: "en",
        autosave: true,
        notifications: true,
        compactMode: false
    },

    load() {
        this.data = Utils.load("settings", this.data);

        if (this.data.theme === "dark") {
            document.body.classList.add("dark");
        } else {
            document.body.classList.remove("dark");
        }
    },

    save() {
        Utils.save("settings", this.data);
    },

    update(key, value) {

        if (!(key in this.data)) return;

        this.data[key] = value;

        this.save();

        if (key === "theme") {

            if (value === "dark") {
                document.body.classList.add("dark");
            } else {
                document.body.classList.remove("dark");
            }

        }

    },

    reset() {

        this.data = {
            theme: "light",
            currency: "USD",
            language: "en",
            autosave: true,
            notifications: true,
            compactMode: false
        };

        this.save();
    }

};

Settings.load();
