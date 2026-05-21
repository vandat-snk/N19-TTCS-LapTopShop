class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };

    // Các field không dùng để lọc
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Map query trên URL sang đúng field trong MongoDB
    // Ví dụ: ?ram=16GB -> specs.ram
    const specsFieldMap = {
      ram: "specs.ram",
      color: "specs.color",
      cpu: "specs.cpu",
      os: "specs.os",
      weight: "specs.weight",
      screen: "specs.screen",
      graphicCard: "specs.graphicCard",
      storage: "specs.storage",
      battery: "specs.battery",
      demand: "specs.demand",
    };

    Object.keys(queryObj).forEach((key) => {
      // Tìm kiếm text
      if (key === "keyword") {
        queryObj["$text"] = { $search: queryObj[key] };
        delete queryObj[key];
        return;
      }

      // Nếu là field thuộc specs thì đổi key
      if (specsFieldMap[key]) {
        queryObj[specsFieldMap[key]] = {
          $in: queryObj[key].split(","),
        };
        delete queryObj[key];
        return;
      }

      // Các field dạng khoảng giá: price, promotion
      // Giữ nguyên để xử lý gte, lte, gt, lt ở dưới
      if (key === "price" || key === "promotion") {
        return;
      }

      // Các field lọc bình thường như brand, category
      queryObj[key] = {
        $in: queryObj[key].split(","),
      };
    });

    // Advanced filtering: price[gte], price[lte], promotion[lt]...
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt)\b/g,
      (match) => `$${match}`
    );

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-_id");
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}
module.exports = APIFeatures;
