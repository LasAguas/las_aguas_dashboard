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
exports.id = "pages/api/mark-ticket-downloaded";
exports.ids = ["pages/api/mark-ticket-downloaded"];
exports.modules = {

/***/ "@supabase/supabase-js":
/*!****************************************!*\
  !*** external "@supabase/supabase-js" ***!
  \****************************************/
/***/ ((module) => {

module.exports = require("@supabase/supabase-js");

/***/ }),

/***/ "(api)/./pages/api/mark-ticket-downloaded.js":
/*!*********************************************!*\
  !*** ./pages/api/mark-ticket-downloaded.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ handler)\n/* harmony export */ });\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/supabase-js */ \"@supabase/supabase-js\");\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__);\n// pages/api/mark-ticket-downloaded.js\n\nconst supabaseUrl = \"https://gtccctajvobfvhlonaot.supabase.co\";\nconst supabaseKey = \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0Y2NjdGFqdm9iZnZobG9uYW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTI3NzAsImV4cCI6MjA3MDU2ODc3MH0.vGctzI7K-VgvxpnFhSghP8JvF2pyQv8R_Duxsx77_Io\";\nconst supabase = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__.createClient)(supabaseUrl, supabaseKey);\nasync function handler(req, res) {\n    console.log(\"➡️ API hit: mark-ticket-downloaded\");\n    if (req.method !== \"POST\") {\n        console.log(\"❌ Wrong method:\", req.method);\n        return res.status(405).json({\n            error: \"Method not allowed\"\n        });\n    }\n    let code;\n    try {\n        const body = req.body;\n        console.log(\"\\uD83D\\uDCE5 Raw body received:\", body);\n        code = body?.code;\n    } catch (err) {\n        console.error(\"❌ Error parsing body:\", err);\n        return res.status(400).json({\n            error: \"Invalid JSON\"\n        });\n    }\n    if (!code) {\n        console.log(\"❌ Missing code in request body\");\n        return res.status(400).json({\n            error: \"Ticket code is required\"\n        });\n    }\n    console.log(\"\\uD83D\\uDD0E Updating ticket in Supabase for code:\", code);\n    const { error } = await supabase.from(\"tickets\").update({\n        downloaded: true\n    }).eq(\"code\", code);\n    if (error) {\n        console.error(\"❌ Supabase update error:\", error);\n        return res.status(500).json({\n            error: \"Failed to update ticket\"\n        });\n    }\n    console.log(\"✅ Ticket updated successfully:\", code);\n    return res.status(200).json({\n        ok: true\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwaSkvLi9wYWdlcy9hcGkvbWFyay10aWNrZXQtZG93bmxvYWRlZC5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxzQ0FBc0M7QUFDZTtBQUVyRCxNQUFNQyxjQUFjQywwQ0FBb0M7QUFDeEQsTUFBTUcsY0FBY0gsa05BQXlDO0FBRTdELE1BQU1LLFdBQVdQLG1FQUFZQSxDQUFDQyxhQUFhSTtBQUU1QixlQUFlRyxRQUFRQyxHQUFHLEVBQUVDLEdBQUc7SUFDNUNDLFFBQVFDLEdBQUcsQ0FBQztJQUVaLElBQUlILElBQUlJLE1BQU0sS0FBSyxRQUFRO1FBQ3pCRixRQUFRQyxHQUFHLENBQUMsbUJBQW1CSCxJQUFJSSxNQUFNO1FBQ3pDLE9BQU9ILElBQUlJLE1BQU0sQ0FBQyxLQUFLQyxJQUFJLENBQUM7WUFBRUMsT0FBTztRQUFxQjtJQUM1RDtJQUVBLElBQUlDO0lBQ0osSUFBSTtRQUNGLE1BQU1DLE9BQU9ULElBQUlTLElBQUk7UUFDckJQLFFBQVFDLEdBQUcsQ0FBQyxtQ0FBeUJNO1FBRXJDRCxPQUFPQyxNQUFNRDtJQUNmLEVBQUUsT0FBT0UsS0FBSztRQUNaUixRQUFRSyxLQUFLLENBQUMseUJBQXlCRztRQUN2QyxPQUFPVCxJQUFJSSxNQUFNLENBQUMsS0FBS0MsSUFBSSxDQUFDO1lBQUVDLE9BQU87UUFBZTtJQUN0RDtJQUVBLElBQUksQ0FBQ0MsTUFBTTtRQUNUTixRQUFRQyxHQUFHLENBQUM7UUFDWixPQUFPRixJQUFJSSxNQUFNLENBQUMsS0FBS0MsSUFBSSxDQUFDO1lBQUVDLE9BQU87UUFBMEI7SUFDakU7SUFFQUwsUUFBUUMsR0FBRyxDQUFDLHNEQUE0Q0s7SUFFeEQsTUFBTSxFQUFFRCxLQUFLLEVBQUUsR0FBRyxNQUFNVCxTQUNyQmEsSUFBSSxDQUFDLFdBQ0xDLE1BQU0sQ0FBQztRQUFFQyxZQUFZO0lBQUssR0FDMUJDLEVBQUUsQ0FBQyxRQUFRTjtJQUVkLElBQUlELE9BQU87UUFDVEwsUUFBUUssS0FBSyxDQUFDLDRCQUE0QkE7UUFDMUMsT0FBT04sSUFBSUksTUFBTSxDQUFDLEtBQUtDLElBQUksQ0FBQztZQUFFQyxPQUFPO1FBQTBCO0lBQ2pFO0lBRUFMLFFBQVFDLEdBQUcsQ0FBQyxrQ0FBa0NLO0lBQzlDLE9BQU9QLElBQUlJLE1BQU0sQ0FBQyxLQUFLQyxJQUFJLENBQUM7UUFBRVMsSUFBSTtJQUFLO0FBQ3pDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vbGFzX2FndWFzX2Rhc2hib2FyZC8uL3BhZ2VzL2FwaS9tYXJrLXRpY2tldC1kb3dubG9hZGVkLmpzPzMxZTUiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gcGFnZXMvYXBpL21hcmstdGlja2V0LWRvd25sb2FkZWQuanNcbmltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gXCJAc3VwYWJhc2Uvc3VwYWJhc2UtanNcIjtcblxuY29uc3Qgc3VwYWJhc2VVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkw7XG5jb25zdCBzdXBhYmFzZUtleSA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX0FOT05fS0VZO1xuXG5jb25zdCBzdXBhYmFzZSA9IGNyZWF0ZUNsaWVudChzdXBhYmFzZVVybCwgc3VwYWJhc2VLZXkpO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKHJlcSwgcmVzKSB7XG4gIGNvbnNvbGUubG9nKFwi4p6h77iPIEFQSSBoaXQ6IG1hcmstdGlja2V0LWRvd25sb2FkZWRcIik7XG5cbiAgaWYgKHJlcS5tZXRob2QgIT09IFwiUE9TVFwiKSB7XG4gICAgY29uc29sZS5sb2coXCLinYwgV3JvbmcgbWV0aG9kOlwiLCByZXEubWV0aG9kKTtcbiAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDUpLmpzb24oeyBlcnJvcjogXCJNZXRob2Qgbm90IGFsbG93ZWRcIiB9KTtcbiAgfVxuXG4gIGxldCBjb2RlO1xuICB0cnkge1xuICAgIGNvbnN0IGJvZHkgPSByZXEuYm9keTtcbiAgICBjb25zb2xlLmxvZyhcIvCfk6UgUmF3IGJvZHkgcmVjZWl2ZWQ6XCIsIGJvZHkpO1xuXG4gICAgY29kZSA9IGJvZHk/LmNvZGU7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCLinYwgRXJyb3IgcGFyc2luZyBib2R5OlwiLCBlcnIpO1xuICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7IGVycm9yOiBcIkludmFsaWQgSlNPTlwiIH0pO1xuICB9XG5cbiAgaWYgKCFjb2RlKSB7XG4gICAgY29uc29sZS5sb2coXCLinYwgTWlzc2luZyBjb2RlIGluIHJlcXVlc3QgYm9keVwiKTtcbiAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oeyBlcnJvcjogXCJUaWNrZXQgY29kZSBpcyByZXF1aXJlZFwiIH0pO1xuICB9XG5cbiAgY29uc29sZS5sb2coXCLwn5SOIFVwZGF0aW5nIHRpY2tldCBpbiBTdXBhYmFzZSBmb3IgY29kZTpcIiwgY29kZSk7XG5cbiAgY29uc3QgeyBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAuZnJvbShcInRpY2tldHNcIilcbiAgICAudXBkYXRlKHsgZG93bmxvYWRlZDogdHJ1ZSB9KVxuICAgIC5lcShcImNvZGVcIiwgY29kZSk7XG5cbiAgaWYgKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIuKdjCBTdXBhYmFzZSB1cGRhdGUgZXJyb3I6XCIsIGVycm9yKTtcbiAgICByZXR1cm4gcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogXCJGYWlsZWQgdG8gdXBkYXRlIHRpY2tldFwiIH0pO1xuICB9XG5cbiAgY29uc29sZS5sb2coXCLinIUgVGlja2V0IHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5OlwiLCBjb2RlKTtcbiAgcmV0dXJuIHJlcy5zdGF0dXMoMjAwKS5qc29uKHsgb2s6IHRydWUgfSk7XG59XG4iXSwibmFtZXMiOlsiY3JlYXRlQ2xpZW50Iiwic3VwYWJhc2VVcmwiLCJwcm9jZXNzIiwiZW52IiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMIiwic3VwYWJhc2VLZXkiLCJORVhUX1BVQkxJQ19TVVBBQkFTRV9BTk9OX0tFWSIsInN1cGFiYXNlIiwiaGFuZGxlciIsInJlcSIsInJlcyIsImNvbnNvbGUiLCJsb2ciLCJtZXRob2QiLCJzdGF0dXMiLCJqc29uIiwiZXJyb3IiLCJjb2RlIiwiYm9keSIsImVyciIsImZyb20iLCJ1cGRhdGUiLCJkb3dubG9hZGVkIiwiZXEiLCJvayJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(api)/./pages/api/mark-ticket-downloaded.js\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(api)/./pages/api/mark-ticket-downloaded.js"));
module.exports = __webpack_exports__;

})();