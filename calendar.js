const Calendar = {

    reminders: [],

    load() {
        this.reminders = Utils.load("calendar", []);
    },

    save() {
        Utils.save("calendar", this.reminders);
    },

    create(data = {}) {

        const reminder = {
            id: Utils.id(),
            title: "",
            description: "",
            eventId: "",
            date: "",
            time: "",
            category: "General",
            priority: "Normal",
            completed: false,
            recurring: false,
            recurrence: "None",
            created: Utils.date(),
            ...data
        };

        this.reminders.push(reminder);
        this.save();

        return reminder;
    },

    update(id, updates) {

        const reminder = this.reminders.find(r => r.id === id);

        if (!reminder) return;

        Object.assign(reminder, updates);
        this.save();
    },

    remove(id) {

        this.reminders = this.reminders.filter(r => r.id !== id);
        this.save();
    },

    get(id) {
        return this.reminders.find(r => r.id === id);
    },

    all() {
        return this.reminders;
    },

    upcoming() {

        const today = new Date().toISOString().slice(0,10);

        return this.reminders
            .filter(r =>
                !r.completed &&
                r.date &&
                r.date >= today
            )
            .sort((a,b) =>
                `${a.date} ${a.time}`.localeCompare(
                    `${b.date} ${b.time}`
                )
            );
    },

    overdue() {

        const today = new Date().toISOString().slice(0,10);

        return this.reminders.filter(r =>
            !r.completed &&
            r.date &&
            r.date < today
        );
    },

    completed() {
        return this.reminders.filter(r => r.completed);
    },

    byEvent(eventId) {
        return this.reminders.filter(r => r.eventId === eventId);
    }

};

Calendar.load();
