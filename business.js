const Business = {

    data: {
        name: "",
        owner: "",
        logo: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        phone: "",
        email: "",
        website: "",
        taxRate: 0,
        notes: ""
    },

    load() {
        this.data = Utils.load("business", this.data);
    },

    save() {
        Utils.save("business", this.data);
    },

    update(field, value) {
        if (field in this.data) {
            this.data[field] = value;
            this.save();
        }
    },

    reset() {
        this.data = {
            name: "",
            owner: "",
            logo: "",
            address: "",
            city: "",
            state: "",
            zip: "",
            phone: "",
            email: "",
            website: "",
            taxRate: 0,
            notes: ""
        };

        this.save();
    }

};

Business.load();
