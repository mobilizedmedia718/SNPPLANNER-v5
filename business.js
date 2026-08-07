const Business = {

    data: {
        name: "",
        owner: "",
        ownerTitle: "",

        logo: "",

        phone: "",
        alternatePhone: "",
        email: "",

        website: "",
        instagram: "",
        facebook: "",

        address: "",
        address2: "",
        city: "",
        state: "",
        zip: "",
        country: "",

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
            this.data.address2,
            this.data.city,
            this.data.state,
            this.data.zip,
            this.data.country
        ]
        .filter(Boolean)
        .join(", ");
    },

    reset() {

        this.data = {
            name: "",
            owner: "",
            ownerTitle: "",

            logo: "",

            phone: "",
            alternatePhone: "",
            email: "",

            website: "",
            instagram: "",
            facebook: "",

            address: "",
            address2: "",
            city: "",
            state: "",
            zip: "",
            country: "",

            taxRate: 0,
            taxId: "",

            notes: ""
        };

        this.save();
    }

};

Business.load();
