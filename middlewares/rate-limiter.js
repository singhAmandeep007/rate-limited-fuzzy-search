/**
 * Rate limiter middleware function.
 * @param {Object} options - The options for rate limiting.
 * @param {number} options.windowMs - The time window in milliseconds for rate limiting. Default is 1 minute.
 * @param {number} options.maxRequests - The maximum number of requests allowed within the time window. Default is 5.
 * @param {Array<string>} options.whiteListedRoutes - An array of routes that are exempt from rate limiting.
 * @param {Array<string>} options.blackListedRoutes - An array of routes on which rate limiting is applied.
 * @returns {Function} - The rate limiter middleware function.
 */
let matchRoutePattern = require("../utils/route");

module.exports = function ({
  windowMs = 1 * 60 * 1000,
  maxRequests = 5,
  whiteListedRoutes = [],
  blackListedRoutes = [],
}) {
  let rateLimits = {};

  return (req, res, next) => {
    let isMatched = false;

    blackListedRoutes.forEach((route) => {
      if (matchRoutePattern(route, req.url)) {
        isMatched = true;
      }
    });

    whiteListedRoutes.forEach((route) => {
      if (matchRoutePattern(route, req.url)) {
        isMatched = false;
      }
    });

    if (isMatched) {
      const currentTime = Date.now();
      const clientIp = req.ip;
      // check if ip is not registered, if not, set a key and value as initial limit and start time
      if (!rateLimits[clientIp]) {
        rateLimits[clientIp] = { limit: maxRequests, startTime: currentTime };
        return next();
      }

      const { startTime, limit } = rateLimits[clientIp];
      // check if req has arrived within the window
      let isWithinWindow = currentTime < startTime + windowMs;
      // check if limit has been exceeded
      let isLimitExceeded = limit === 1;
      // if within window and limit has not been exceeded
      if (isWithinWindow && !isLimitExceeded) {
        rateLimits[clientIp].limit -= 1;
        rateLimits[clientIp].startTime = currentTime; // ?
        return next();
      }
      // if within window and limit is exceeded
      if (isWithinWindow && isLimitExceeded) {
        let timeElapsed = currentTime - rateLimits[clientIp].startTime;

        return res.status(429).json({
          message: `Limit exceeded, try again after ${Math.round((windowMs - timeElapsed) / 1000)} sec`,
        });
      }

      rateLimits[clientIp] = { limit: maxRequests, startTime: currentTime };
    }

    return next();
  };
};
