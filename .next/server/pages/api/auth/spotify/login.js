"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/api/auth/spotify/login";
exports.ids = ["pages/api/auth/spotify/login"];
exports.modules = {

/***/ "(api)/./pages/api/auth/spotify/login.js":
/*!*****************************************!*\
  !*** ./pages/api/auth/spotify/login.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ handler)\n/* harmony export */ });\n// pages/api/auth/spotify/login.js\nfunction handler(req, res) {\n    const scopes = [\n        \"user-read-email\",\n        \"user-read-private\",\n        \"user-read-recently-played\",\n        \"user-top-read\",\n        \"playlist-read-private\"\n    ];\n    const query = new URLSearchParams({\n        client_id: process.env.SPOTIFY_CLIENT_ID,\n        response_type: \"code\",\n        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,\n        scope: scopes.join(\" \")\n    });\n    res.redirect(`https://accounts.spotify.com/authorize?${query.toString()}`);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwaSkvLi9wYWdlcy9hcGkvYXV0aC9zcG90aWZ5L2xvZ2luLmpzIiwibWFwcGluZ3MiOiI7Ozs7QUFBQSxrQ0FBa0M7QUFFbkIsU0FBU0EsUUFBUUMsR0FBRyxFQUFFQyxHQUFHO0lBQ3BDLE1BQU1DLFNBQVM7UUFDYjtRQUNBO1FBQ0E7UUFDQTtRQUNBO0tBQ0Q7SUFFRCxNQUFNQyxRQUFRLElBQUlDLGdCQUFnQjtRQUNoQ0MsV0FBV0MsUUFBUUMsR0FBRyxDQUFDQyxpQkFBaUI7UUFDeENDLGVBQWU7UUFDZkMsY0FBY0osUUFBUUMsR0FBRyxDQUFDSSxvQkFBb0I7UUFDOUNDLE9BQU9WLE9BQU9XLElBQUksQ0FBQztJQUNyQjtJQUVBWixJQUFJYSxRQUFRLENBQUMsQ0FBQyx1Q0FBdUMsRUFBRVgsTUFBTVksUUFBUSxHQUFHLENBQUM7QUFDM0UiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9sYXNfYWd1YXNfZGFzaGJvYXJkLy4vcGFnZXMvYXBpL2F1dGgvc3BvdGlmeS9sb2dpbi5qcz8wZjM0Il0sInNvdXJjZXNDb250ZW50IjpbIi8vIHBhZ2VzL2FwaS9hdXRoL3Nwb3RpZnkvbG9naW4uanNcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaGFuZGxlcihyZXEsIHJlcykge1xuICAgIGNvbnN0IHNjb3BlcyA9IFtcbiAgICAgIFwidXNlci1yZWFkLWVtYWlsXCIsXG4gICAgICBcInVzZXItcmVhZC1wcml2YXRlXCIsXG4gICAgICBcInVzZXItcmVhZC1yZWNlbnRseS1wbGF5ZWRcIixcbiAgICAgIFwidXNlci10b3AtcmVhZFwiLFxuICAgICAgXCJwbGF5bGlzdC1yZWFkLXByaXZhdGVcIixcbiAgICBdO1xuICBcbiAgICBjb25zdCBxdWVyeSA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoe1xuICAgICAgY2xpZW50X2lkOiBwcm9jZXNzLmVudi5TUE9USUZZX0NMSUVOVF9JRCxcbiAgICAgIHJlc3BvbnNlX3R5cGU6IFwiY29kZVwiLFxuICAgICAgcmVkaXJlY3RfdXJpOiBwcm9jZXNzLmVudi5TUE9USUZZX1JFRElSRUNUX1VSSSxcbiAgICAgIHNjb3BlOiBzY29wZXMuam9pbihcIiBcIiksXG4gICAgfSk7XG4gIFxuICAgIHJlcy5yZWRpcmVjdChgaHR0cHM6Ly9hY2NvdW50cy5zcG90aWZ5LmNvbS9hdXRob3JpemU/JHtxdWVyeS50b1N0cmluZygpfWApO1xuICB9XG4gICJdLCJuYW1lcyI6WyJoYW5kbGVyIiwicmVxIiwicmVzIiwic2NvcGVzIiwicXVlcnkiLCJVUkxTZWFyY2hQYXJhbXMiLCJjbGllbnRfaWQiLCJwcm9jZXNzIiwiZW52IiwiU1BPVElGWV9DTElFTlRfSUQiLCJyZXNwb25zZV90eXBlIiwicmVkaXJlY3RfdXJpIiwiU1BPVElGWV9SRURJUkVDVF9VUkkiLCJzY29wZSIsImpvaW4iLCJyZWRpcmVjdCIsInRvU3RyaW5nIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(api)/./pages/api/auth/spotify/login.js\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(api)/./pages/api/auth/spotify/login.js"));
module.exports = __webpack_exports__;

})();