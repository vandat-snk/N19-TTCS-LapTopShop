class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };

    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

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

    const colorAliases = {
      den: ["Black", "Đen", "Den"],
      "đen": ["Black", "Đen", "Den"],
      black: ["Black", "Đen", "Den"],

      vang: ["Gold", "Yellow", "Vàng", "Vang"],
      "vàng": ["Gold", "Yellow", "Vàng", "Vang"],
      gold: ["Gold", "Yellow", "Vàng", "Vang"],
      yellow: ["Gold", "Yellow", "Vàng", "Vang"],

      trang: ["White", "Trắng", "Trang"],
      "trắng": ["White", "Trắng", "Trang"],
      white: ["White", "Trắng", "Trang"],

      bac: ["Silver", "Bạc", "Bac"],
      "bạc": ["Silver", "Bạc", "Bac"],
      silver: ["Silver", "Bạc", "Bac"],

      xam: ["Gray", "Grey", "Xám", "Xam"],
      "xám": ["Gray", "Grey", "Xám", "Xam"],
      gray: ["Gray", "Grey", "Xám", "Xam"],
      grey: ["Gray", "Grey", "Xám", "Xam"],
    };

    const mongoQuery = {};
    const andConditions = [];

    const escapeRegex = (value) => {
      return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    const toArray = (value) => {
      if (Array.isArray(value)) return value;

      return String(value)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    };

    const normalizeRam = (value) => {
      let v = String(value).trim().toUpperCase().replace(/\s+/g, "");

      // Frontend đang gửi 4, 8, 16, 32
      // DB lại lưu 4GB, 8GB, 16GB, 32GB
      if (/^\d+$/.test(v)) {
        v = `${v}GB`;
      }

      return v;
    };

    const normalizeColorToAliases = (value) => {
      const key = String(value).trim().toLowerCase();
      return colorAliases[key] || [String(value).trim()];
    };

    Object.keys(queryObj).forEach((key) => {
      const value = queryObj[key];

      if (
        value === undefined ||
        value === null ||
        value === "" ||
        value === "undefined"
      ) {
        return;
      }

      // keyword search
      if (key === "keyword") {
        mongoQuery.$text = { $search: value };
        return;
      }

      // Hỗ trợ dạng frontend đang gửi:
      // promotion_gte, promotion_lte, price_gte, price_lte
      const rangeMatch = key.match(/^(price|promotion)_(gte|gt|lte|lt)$/);
      if (rangeMatch) {
        const field = rangeMatch[1];
        const operator = rangeMatch[2];

        mongoQuery[field] = mongoQuery[field] || {};
        mongoQuery[field][`$${operator}`] = Number(value);
        return;
      }

      // Hỗ trợ thêm dạng chuẩn Express:
      // promotion[gte], promotion[lte]
      if (key === "price" || key === "promotion") {
        if (typeof value === "object" && !Array.isArray(value)) {
          mongoQuery[key] = {};
          Object.keys(value).forEach((operator) => {
            mongoQuery[key][`$${operator}`] = Number(value[operator]);
          });
        } else {
          mongoQuery[key] = Number(value);
        }
        return;
      }

      // Cho phép frontend gửi specs.ram hoặc specs.color nếu sau này có đổi
      if (key.startsWith("specs.")) {
        const values = toArray(value);

        andConditions.push({
          $or: values.map((v) => ({
            [key]: { $regex: escapeRegex(v), $options: "i" },
          })),
        });

        return;
      }

      // Lọc các field nằm trong specs
      if (specsFieldMap[key]) {
        const field = specsFieldMap[key];
        let values = toArray(value);

        if (key === "ram") {
          values = values.map(normalizeRam);
        }

        if (key === "color") {
          values = values.flatMap(normalizeColorToAliases);
        }

        andConditions.push({
          $or: values.map((v) => ({
            [field]: { $regex: escapeRegex(v), $options: "i" },
          })),
        });

        return;
      }

      // Lọc bình thường: brand, category...
      mongoQuery[key] = {
        $in: toArray(value),
      };
    });

    if (andConditions.length > 0) {
      mongoQuery.$and = andConditions;
    }

    console.log("REQ QUERY:", this.queryString);
    console.log("MONGO FILTER:", JSON.stringify(mongoQuery, null, 2));

    this.query = this.query.find(mongoQuery);

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