routerAdd("GET", "/api/intakely/foods", (e) => {
    const { normalizeFood, searchUrl } = require(__hooks + "/foods.js");
    const query = (e.request.url.query().get("query") || "").trim();
    if (query.length < 2 || query.length > 100) {
        throw new BadRequestError("Enter 2 to 100 characters to search foods.");
    }
    const apiKey = $os.getenv("USDA_API_KEY");
    if (!apiKey) throw new ApiError(503, "Food search is not configured yet.");

    let response;
    try {
        response = $http.send({ url: searchUrl(query, apiKey), method: "GET", timeout: 10 });
    } catch (error) {
        throw new ApiError(502, "Food search is unavailable. Try again later.");
    }
    if (response.statusCode === 429) {
        throw new ApiError(503, "Food search is busy. Try again in a few minutes.");
    }
    if (response.statusCode !== 200 || !response.json || !Array.isArray(response.json.foods)) {
        throw new ApiError(502, "Food search is unavailable. Try again later.");
    }
    const foods = response.json.foods.map(normalizeFood).filter((food) => food !== null);
    return e.json(200, { foods });
}, $apis.requireAuth("users"));
