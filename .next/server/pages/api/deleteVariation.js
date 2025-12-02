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
exports.id = "pages/api/deleteVariation";
exports.ids = ["pages/api/deleteVariation"];
exports.modules = {

/***/ "@supabase/supabase-js":
/*!****************************************!*\
  !*** external "@supabase/supabase-js" ***!
  \****************************************/
/***/ ((module) => {

module.exports = require("@supabase/supabase-js");

/***/ }),

/***/ "(api)/./pages/api/deleteVariation.js":
/*!**************************************!*\
  !*** ./pages/api/deleteVariation.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ handler)\n/* harmony export */ });\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/supabase-js */ \"@supabase/supabase-js\");\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__);\n// pages/api/deleteVariation.js\n\nconst supabaseAdmin = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__.createClient)(\"https://gtccctajvobfvhlonaot.supabase.co\", \"***REMOVED***\" // safer than hardcoding\n);\nasync function handler(req, res) {\n    if (req.method !== \"DELETE\") {\n        return res.status(405).json({\n            error: \"Method not allowed\"\n        });\n    }\n    const { path, variationId } = req.body || {};\n    if (!path || !variationId) {\n        return res.status(400).json({\n            error: \"Missing path or variationId\"\n        });\n    }\n    try {\n        // 1) Try to delete the storage object\n        const { error: storageError } = await supabaseAdmin.storage.from(\"post-variations\").remove([\n            path\n        ]); // path like \"artist_id/post_id/filename.ext\"\n        // If the file wasn't found (404) we can still continue to delete the row\n        if (storageError && storageError.statusCode !== \"404\" && storageError.message !== \"Object not found\") {\n            return res.status(500).json({\n                error: `Storage delete failed: ${storageError.message}`\n            });\n        }\n        // 2) Delete the DB row\n        const { error: dbError } = await supabaseAdmin.from(\"postvariations\").delete().eq(\"id\", variationId);\n        if (dbError) {\n            return res.status(500).json({\n                error: `DB delete failed: ${dbError.message}`\n            });\n        }\n        return res.status(200).json({\n            success: true\n        });\n    } catch (err) {\n        return res.status(500).json({\n            error: err.message || \"Unknown error\"\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwaSkvLi9wYWdlcy9hcGkvZGVsZXRlVmFyaWF0aW9uLmpzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLCtCQUErQjtBQUNzQjtBQUVyRCxNQUFNQyxnQkFBZ0JELG1FQUFZQSxDQUM5Qiw0Q0FDQSw4TkFBOE4sd0JBQXdCOztBQUczTyxlQUFlRSxRQUFRQyxHQUFHLEVBQUVDLEdBQUc7SUFDNUMsSUFBSUQsSUFBSUUsTUFBTSxLQUFLLFVBQVU7UUFDM0IsT0FBT0QsSUFBSUUsTUFBTSxDQUFDLEtBQUtDLElBQUksQ0FBQztZQUFFQyxPQUFPO1FBQXFCO0lBQzVEO0lBRUEsTUFBTSxFQUFFQyxJQUFJLEVBQUVDLFdBQVcsRUFBRSxHQUFHUCxJQUFJUSxJQUFJLElBQUksQ0FBQztJQUMzQyxJQUFJLENBQUNGLFFBQVEsQ0FBQ0MsYUFBYTtRQUN6QixPQUFPTixJQUFJRSxNQUFNLENBQUMsS0FBS0MsSUFBSSxDQUFDO1lBQUVDLE9BQU87UUFBOEI7SUFDckU7SUFFQSxJQUFJO1FBQ0Ysc0NBQXNDO1FBQ3RDLE1BQU0sRUFBRUEsT0FBT0ksWUFBWSxFQUFFLEdBQUcsTUFBTVgsY0FDbkNZLE9BQU8sQ0FDUEMsSUFBSSxDQUFDLG1CQUNMQyxNQUFNLENBQUM7WUFBQ047U0FBSyxHQUFHLDZDQUE2QztRQUVoRSx5RUFBeUU7UUFDekUsSUFBSUcsZ0JBQWdCQSxhQUFhSSxVQUFVLEtBQUssU0FBU0osYUFBYUssT0FBTyxLQUFLLG9CQUFvQjtZQUNwRyxPQUFPYixJQUFJRSxNQUFNLENBQUMsS0FBS0MsSUFBSSxDQUFDO2dCQUFFQyxPQUFPLENBQUMsdUJBQXVCLEVBQUVJLGFBQWFLLE9BQU8sQ0FBQyxDQUFDO1lBQUM7UUFDeEY7UUFFQSx1QkFBdUI7UUFDdkIsTUFBTSxFQUFFVCxPQUFPVSxPQUFPLEVBQUUsR0FBRyxNQUFNakIsY0FDOUJhLElBQUksQ0FBQyxrQkFDTEssTUFBTSxHQUNOQyxFQUFFLENBQUMsTUFBTVY7UUFFWixJQUFJUSxTQUFTO1lBQ1gsT0FBT2QsSUFBSUUsTUFBTSxDQUFDLEtBQUtDLElBQUksQ0FBQztnQkFBRUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFVSxRQUFRRCxPQUFPLENBQUMsQ0FBQztZQUFDO1FBQzlFO1FBRUEsT0FBT2IsSUFBSUUsTUFBTSxDQUFDLEtBQUtDLElBQUksQ0FBQztZQUFFYyxTQUFTO1FBQUs7SUFDOUMsRUFBRSxPQUFPQyxLQUFLO1FBQ1osT0FBT2xCLElBQUlFLE1BQU0sQ0FBQyxLQUFLQyxJQUFJLENBQUM7WUFBRUMsT0FBT2MsSUFBSUwsT0FBTyxJQUFJO1FBQWdCO0lBQ3RFO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9sYXNfYWd1YXNfZGFzaGJvYXJkLy4vcGFnZXMvYXBpL2RlbGV0ZVZhcmlhdGlvbi5qcz9lMmNjIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIHBhZ2VzL2FwaS9kZWxldGVWYXJpYXRpb24uanNcbmltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyc7XG5cbmNvbnN0IHN1cGFiYXNlQWRtaW4gPSBjcmVhdGVDbGllbnQoXG4gICAgJ2h0dHBzOi8vZ3RjY2N0YWp2b2Jmdmhsb25hb3Quc3VwYWJhc2UuY28nLCAvLyA8LS0gY29tbWEgaGVyZVxuICAgICdleUpoYkdjaU9pSklVekkxTmlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKcGMzTWlPaUp6ZFhCaFltRnpaU0lzSW5KbFppSTZJbWQwWTJOamRHRnFkbTlpWm5ab2JHOXVZVzkwSWl3aWNtOXNaU0k2SW5ObGNuWnBZMlZmY205c1pTSXNJbWxoZENJNk1UYzFORGs1TWpjM01Dd2laWGh3SWpveU1EY3dOVFk0Tnpjd2ZRLlp0eDFiRmF3ZTVDdkJlSE9sRGFFMDNOM01zT1FGNVNBTEZnRzN0SHU0czAnIC8vIHNhZmVyIHRoYW4gaGFyZGNvZGluZ1xuICApO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKHJlcSwgcmVzKSB7XG4gIGlmIChyZXEubWV0aG9kICE9PSAnREVMRVRFJykge1xuICAgIHJldHVybiByZXMuc3RhdHVzKDQwNSkuanNvbih7IGVycm9yOiAnTWV0aG9kIG5vdCBhbGxvd2VkJyB9KTtcbiAgfVxuXG4gIGNvbnN0IHsgcGF0aCwgdmFyaWF0aW9uSWQgfSA9IHJlcS5ib2R5IHx8IHt9O1xuICBpZiAoIXBhdGggfHwgIXZhcmlhdGlvbklkKSB7XG4gICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgZXJyb3I6ICdNaXNzaW5nIHBhdGggb3IgdmFyaWF0aW9uSWQnIH0pO1xuICB9XG5cbiAgdHJ5IHtcbiAgICAvLyAxKSBUcnkgdG8gZGVsZXRlIHRoZSBzdG9yYWdlIG9iamVjdFxuICAgIGNvbnN0IHsgZXJyb3I6IHN0b3JhZ2VFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VBZG1pblxuICAgICAgLnN0b3JhZ2VcbiAgICAgIC5mcm9tKCdwb3N0LXZhcmlhdGlvbnMnKVxuICAgICAgLnJlbW92ZShbcGF0aF0pOyAvLyBwYXRoIGxpa2UgXCJhcnRpc3RfaWQvcG9zdF9pZC9maWxlbmFtZS5leHRcIlxuXG4gICAgLy8gSWYgdGhlIGZpbGUgd2Fzbid0IGZvdW5kICg0MDQpIHdlIGNhbiBzdGlsbCBjb250aW51ZSB0byBkZWxldGUgdGhlIHJvd1xuICAgIGlmIChzdG9yYWdlRXJyb3IgJiYgc3RvcmFnZUVycm9yLnN0YXR1c0NvZGUgIT09ICc0MDQnICYmIHN0b3JhZ2VFcnJvci5tZXNzYWdlICE9PSAnT2JqZWN0IG5vdCBmb3VuZCcpIHtcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiBgU3RvcmFnZSBkZWxldGUgZmFpbGVkOiAke3N0b3JhZ2VFcnJvci5tZXNzYWdlfWAgfSk7XG4gICAgfVxuXG4gICAgLy8gMikgRGVsZXRlIHRoZSBEQiByb3dcbiAgICBjb25zdCB7IGVycm9yOiBkYkVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluXG4gICAgICAuZnJvbSgncG9zdHZhcmlhdGlvbnMnKVxuICAgICAgLmRlbGV0ZSgpXG4gICAgICAuZXEoJ2lkJywgdmFyaWF0aW9uSWQpO1xuXG4gICAgaWYgKGRiRXJyb3IpIHtcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiBgREIgZGVsZXRlIGZhaWxlZDogJHtkYkVycm9yLm1lc3NhZ2V9YCB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzLnN0YXR1cygyMDApLmpzb24oeyBzdWNjZXNzOiB0cnVlIH0pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogZXJyLm1lc3NhZ2UgfHwgJ1Vua25vd24gZXJyb3InIH0pO1xuICB9XG59XG4iXSwibmFtZXMiOlsiY3JlYXRlQ2xpZW50Iiwic3VwYWJhc2VBZG1pbiIsImhhbmRsZXIiLCJyZXEiLCJyZXMiLCJtZXRob2QiLCJzdGF0dXMiLCJqc29uIiwiZXJyb3IiLCJwYXRoIiwidmFyaWF0aW9uSWQiLCJib2R5Iiwic3RvcmFnZUVycm9yIiwic3RvcmFnZSIsImZyb20iLCJyZW1vdmUiLCJzdGF0dXNDb2RlIiwibWVzc2FnZSIsImRiRXJyb3IiLCJkZWxldGUiLCJlcSIsInN1Y2Nlc3MiLCJlcnIiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(api)/./pages/api/deleteVariation.js\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(api)/./pages/api/deleteVariation.js"));
module.exports = __webpack_exports__;

})();