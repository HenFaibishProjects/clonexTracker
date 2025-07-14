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
exports.BenzosService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const benzos_entity_1 = require("./benzos.entity");
const user_entity_1 = require("./auth/user.entity");
let BenzosService = class BenzosService {
    constructor(benzosEntryRepository, userRepo) {
        this.benzosEntryRepository = benzosEntryRepository;
        this.userRepo = userRepo;
    }
    async changeName(newName, userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new Error('User not found');
        user.userName = newName;
        return this.userRepo.save(user);
    }
    async addEntry(data, userId) {
        if (data.takenAt) {
            data.takenAt = new Date(data.takenAt);
        }
        const entry = this.benzosEntryRepository.create(Object.assign(Object.assign({}, data), { user: { id: userId } }));
        return this.benzosEntryRepository.save(entry);
    }
    async getAllEntries(userId) {
        return this.benzosEntryRepository.find({
            where: { user: { id: userId } },
            order: { takenAt: 'DESC' },
        });
    }
    async getBetweenDates(from, to, userId) {
        return this.benzosEntryRepository
            .createQueryBuilder('entry')
            .where('entry.takenAt BETWEEN :from AND :to', { from, to })
            .andWhere('entry.userId = :userId', { userId })
            .orderBy('entry.takenAt', 'DESC')
            .getMany();
    }
    async deleteOne(id, userId) {
        await this.benzosEntryRepository.delete({ id, user: { id: userId } });
    }
    async deleteMany(ids, userId) {
        await this.benzosEntryRepository
            .createQueryBuilder()
            .delete()
            .from(benzos_entity_1.BenzosEntry)
            .whereInIds(ids)
            .andWhere('userId = :userId', { userId })
            .execute();
    }
    async updateOne(id, data, userId) {
        await this.benzosEntryRepository.update({ id, user: { id: userId } }, data);
    }
    async changeBenzosType(newBenzosType, userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new Error('User not found');
        user.benzosType = newBenzosType;
        return this.userRepo.save(user);
    }
};
exports.BenzosService = BenzosService;
exports.BenzosService = BenzosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(benzos_entity_1.BenzosEntry)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], BenzosService);
//# sourceMappingURL=benzos.service.js.map