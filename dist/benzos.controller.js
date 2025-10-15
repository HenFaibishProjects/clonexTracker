"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BenzosController = void 0;
const common_1 = require("@nestjs/common");
const benzos_service_1 = require("./benzos.service");
const common_2 = require("@nestjs/common");
const jwt_auth_guard_1 = require("./auth/jwt-auth.guard");
let BenzosController = class BenzosController {
    constructor(benzosService) {
        this.benzosService = benzosService;
    }
    async addEntry(req, data) {
        return this.benzosService.addEntry(data, req.user.id);
    }
    async changeName(body, req) {
        return this.benzosService.changeName(body.newName, req.user.id);
    }
    async changeBenzosType(body, req) {
        return this.benzosService.changeBenzosType(body.newBenzosType, req.user.id);
    }
    async getAllEntries(req) {
        return this.benzosService.getAllEntries(req.user.id);
    }
    async getBetween(req, from, to) {
        return this.benzosService.getBetweenDates(from, to, req.user.id);
    }
    async deleteOne(req, id) {
        return this.benzosService.deleteOne(id, req.user.id);
    }
    async deleteMany(req, body) {
        return this.benzosService.deleteMany(body.ids, req.user.id);
    }
    async updateOne(req, id, data) {
        return this.benzosService.updateOne(id, data, req.user.id);
    }
    async setTaperingGoal(req, goalData) {
        return this.benzosService.setTaperingGoal(goalData, req.user.id);
    }
    async getTaperingGoal(req) {
        return this.benzosService.getTaperingGoal(req.user.id);
    }
    async updateTaperingGoal(req, goalData) {
        return this.benzosService.updateTaperingGoal(goalData, req.user.id);
    }
    async deactivateTaperingGoal(req) {
        return this.benzosService.deactivateTaperingGoal(req.user.id);
    }
    async getTaperingProgress(req) {
        return this.benzosService.getTaperingProgress(req.user.id);
    }
};
exports.BenzosController = BenzosController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BenzosController.prototype, "addEntry", null);
__decorate([
    (0, common_1.Post)('/changeName'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BenzosController.prototype, "changeName", null);
__decorate([
    (0, common_1.Post)('/changeBenzosType'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BenzosController.prototype, "changeBenzosType", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BenzosController.prototype, "getAllEntries", null);
__decorate([
    (0, common_1.Get)('/between'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], BenzosController.prototype, "getBetween", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], BenzosController.prototype, "deleteOne", null);
__decorate([
    (0, common_1.Post)('/delete-many'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BenzosController.prototype, "deleteMany", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", Promise)
], BenzosController.prototype, "updateOne", null);
__decorate([
    (0, common_1.Post)('/tapering-goal'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BenzosController.prototype, "setTaperingGoal", null);
__decorate([
    (0, common_1.Get)('/tapering-goal'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BenzosController.prototype, "getTaperingGoal", null);
__decorate([
    (0, common_1.Patch)('/tapering-goal'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BenzosController.prototype, "updateTaperingGoal", null);
__decorate([
    (0, common_1.Delete)('/tapering-goal'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BenzosController.prototype, "deactivateTaperingGoal", null);
__decorate([
    (0, common_1.Get)('/tapering-progress'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BenzosController.prototype, "getTaperingProgress", null);
exports.BenzosController = BenzosController = __decorate([
    (0, common_1.Controller)('benzos'),
    (0, common_2.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [benzos_service_1.BenzosService])
], BenzosController);
//# sourceMappingURL=benzos.controller.js.map