"use strict";
/**
 * Agents index - exports all CopilotKit agents/actions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPatientDataAction = exports.getPatientData = exports.searchMedicalCodes = void 0;
// Medical Coding Agent
var medicalCodingAgent_1 = require("./medicalCodingAgent");
Object.defineProperty(exports, "searchMedicalCodes", { enumerable: true, get: function () { return medicalCodingAgent_1.searchMedicalCodes; } });
// Patient Data Agent
var patientDataAgent_1 = require("./patientDataAgent");
Object.defineProperty(exports, "getPatientData", { enumerable: true, get: function () { return patientDataAgent_1.getPatientData; } });
Object.defineProperty(exports, "getPatientDataAction", { enumerable: true, get: function () { return patientDataAgent_1.getPatientDataAction; } });
//# sourceMappingURL=index.js.map