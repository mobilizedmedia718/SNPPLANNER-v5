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
        instagram: "",
        facebook: "",
        taxRate: 0,
        taxId: "",
        notes: ""
    },

    load() {

        const saved = Utils.load("business", {});

        this.data = {
            ...this.data,
            ...saved
        };
    },

    save() {
        Utils.save("business", this.data);
    },

    update(field, value) {

        if (!(field in this.data)) return;

        this.data[field] = value;
        this.save();
    },

    fullAddress() {

        return [
            this.data.address,
            this.data.city,
            this.data.state,
            this.data.zip
        ]
        .filter(Boolean)
        .join(", ");
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
            instagram: "",
            facebook: "",
            taxRate: 0,
            taxId: "",
            notes: ""
        };

        this.save();
    }

};

Business.load();
