"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_1 = __importDefault(require("./health"));
const router = (0, express_1.Router)();
router.use('/', health_1.default);
// TODO: Add copilot routes in Phase 2
exports.default = router;
//# sourceMappingURL=index.js.map