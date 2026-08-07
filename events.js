const Events = {

    data: [],

    load() {
        this.data = Utils.load("events", []);
    },

    save() {
        Utils.save("events", this.data);
    },

    all() {
        return this.data;
    },

    add(event) {
        event.id = Utils.id();
        this.data.push(event);
        this.save();
    },

    remove(id) {
        this.data = this.data.filter(e => e.id !== id);
        this.save();
    }

};
