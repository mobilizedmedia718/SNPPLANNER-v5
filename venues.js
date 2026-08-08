const Venues = {

    list: [],

    load() {
        this.list = Utils.load("venues", []);
    },

    save() {
        Utils.save("venues", this.list);
    },

    create(data = {}) {

        const venue = {
            id: Utils.id(),

            name: "",
            offerings: [],
            contactPerson: "",
            jobTitle: "",

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

            capacity: 0,
            rentalCost: 0,
            deposit: 0,
            depositRefundable: true,

            parking: "",
            indoorOutdoor: "Indoor",

            alcoholAllowed: false,
            foodAllowed: true,
            outsideVendorsAllowed: true,

            setupTime: "",
            breakdownTime: "",

            taxId: "",
            notes: "",

            active: true,
            created: Utils.date(),

            ...data
        };

        this.list.push(venue);
        this.save();

        return venue;
    },

    update(id, updates) {

        const venue = this.list.find(v => v.id === id);

        if (!venue) return;

        Object.assign(venue, updates);
        this.save();
    },

    remove(id) {

        this.list = this.list.filter(v => v.id !== id);
        this.save();
    },

    get(id) {
        return this.list.find(v => v.id === id);
    },

    all() {
        return this.list;
    },

    active() {
        return this.list.filter(v => v.active !== false);
    },

    fullAddress(venue) {

        if (!venue) return "";

        return [
            venue.address,
            venue.address2,
            venue.city,
            venue.state,
            venue.zip,
            venue.country
        ]
        .filter(Boolean)
        .join(", ");
    },

    totalRentalCost() {
        return this.list.reduce(
            (sum, v) =>
                sum + Number(v.rentalCost || 0),
            0
        );
    },
    addOffering(venueId) {

    const venue = this.get(venueId);

    if (!venue) return;

    if (!Array.isArray(venue.offerings)) {
        venue.offerings = [];
    }

    venue.offerings.push({
        id: Utils.id(),
        name: "",
        description: "",
        quantity: 1,
        unit: "Each",
        price: 0,
        notes: ""
    });

    this.save();
},

updateOffering(venueId, offeringId, updates) {

    const venue = this.get(venueId);

    if (!venue || !Array.isArray(venue.offerings)) return;

    const offering = venue.offerings.find(
        item => item.id === offeringId
    );

    if (!offering) return;

    Object.assign(offering, updates);

    this.save();
},

removeOffering(venueId, offeringId) {

    const venue = this.get(venueId);

    if (!venue || !Array.isArray(venue.offerings)) return;

    venue.offerings = venue.offerings.filter(
        item => item.id !== offeringId
    );

    this.save();
},
    offeringNames() {

    return [
        ...new Set(
            this.list
                .flatMap(venue =>
                    Array.isArray(venue.offerings)
                        ? venue.offerings
                        : []
                )
                .map(item => String(item.name || "").trim())
                .filter(Boolean)
        )
    ].sort();
},

};

Venues.load();
