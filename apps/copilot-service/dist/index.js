"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const cors_1 = require("./middleware/cors");
const errorHandler_1 = require("./middleware/errorHandler");
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use(cors_1.corsMiddleware);
// Routes
app.use('/', routes_1.default);
// Error handler (must be last)
app.use(errorHandler_1.errorHandler);
// Start server
const PORT = env_1.config.port;
app.listen(PORT, () => {
    logger_1.logger.info({ port: PORT }, 'Copilot service started');
});
exports.default = app;
//# sourceMappingURL=index.js.map