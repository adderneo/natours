class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        //Filtering
        // Create query object - ES6 Destructuring - We are storing it to the queryObj because we don't want to mutate the req.query object
        const queryObj = {
            // eslint-disable-next-line node/no-unsupported-features/es-syntax
            ...this.queryString
        };
        // Filter -1A Exclude other parameters from query object
        const excludeFields = [
            'page',
            'sort',
            'limit',
            'fields',
        ];
        //Loop through query object and delete all excludeFields
        excludeFields.forEach((el) => delete queryObj[el]);
        //Filter 1B - Advance filtering - using javascript stringify to convert the object
        let queryStr = JSON.stringify(queryObj);
        queryStr = JSON.parse(
            queryStr.replace(
                /\b(gte|gt|lte|lt)\b/g,
                (match) => `$${match}`
            )
        );
        //How query works in mongoose
        //1-First we build the query
        this.query = this.query.find(queryStr);

        return this;
    };

    sort() {
        //Feature - 1. Sorting (If any sorting then filter by param (param1,param2 etc) else default sort by date.
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-createdAt');
        }

        return this;
    };

    limitFields() {
        //Feature - 2. Fields limiting //It is also called projection //In else we don't want to send __v because mongo use it internally
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            // We can also exclude a field from the schema by setting the select property to false.
            this.query = this.query.select('-__v');
        }

        return this;
    };

    paginate() {
        //Feature - 3. Pagination //page field and limit i.e. page limit
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 10;
        const skip = (page - 1) * limit;
        this.query = this.query.skip(skip).limit(limit);

        return this;
    }

};

module.exports = APIFeatures;