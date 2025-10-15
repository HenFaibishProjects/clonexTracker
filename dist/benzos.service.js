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
    async setTaperingGoal(goalData, userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new Error('User not found');
        user.taperStartDosage = goalData.startDosage;
        user.taperTargetDosage = goalData.targetDosage;
        user.taperStartDate = goalData.startDate;
        user.taperTargetDate = goalData.targetDate;
        user.taperNotes = goalData.notes || null;
        user.taperGoalActive = true;
        return this.userRepo.save(user);
    }
    async getTaperingGoal(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new Error('User not found');
        return {
            startDosage: user.taperStartDosage,
            targetDosage: user.taperTargetDosage,
            startDate: user.taperStartDate,
            targetDate: user.taperTargetDate,
            notes: user.taperNotes,
            isActive: user.taperGoalActive
        };
    }
    async updateTaperingGoal(goalData, userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new Error('User not found');
        if (goalData.startDosage !== undefined)
            user.taperStartDosage = goalData.startDosage;
        if (goalData.targetDosage !== undefined)
            user.taperTargetDosage = goalData.targetDosage;
        if (goalData.startDate !== undefined)
            user.taperStartDate = goalData.startDate;
        if (goalData.targetDate !== undefined)
            user.taperTargetDate = goalData.targetDate;
        if (goalData.notes !== undefined)
            user.taperNotes = goalData.notes;
        return this.userRepo.save(user);
    }
    async deactivateTaperingGoal(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new Error('User not found');
        user.taperGoalActive = false;
        return this.userRepo.save(user);
    }
    async getTaperingProgress(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new Error('User not found');
        if (!user.taperGoalActive || !user.taperStartDosage || !user.taperTargetDosage) {
            return { hasGoal: false };
        }
        const recentEntries = await this.benzosEntryRepository
            .createQueryBuilder('entry')
            .where('entry.userId = :userId', { userId })
            .orderBy('entry.takenAt', 'DESC')
            .limit(14)
            .getMany();
        let currentAvgDosage = 0;
        if (recentEntries.length > 0) {
            const totalDosage = recentEntries.reduce((sum, entry) => sum + (entry.dosageMg || 0), 0);
            currentAvgDosage = totalDosage / recentEntries.length;
        }
        const totalReduction = user.taperStartDosage - user.taperTargetDosage;
        const currentReduction = user.taperStartDosage - currentAvgDosage;
        const progressPercentage = totalReduction > 0 ? (currentReduction / totalReduction) * 100 : 0;
        const now = new Date();
        const startTime = new Date(user.taperStartDate).getTime();
        const endTime = new Date(user.taperTargetDate).getTime();
        const currentTime = now.getTime();
        const timeProgress = ((currentTime - startTime) / (endTime - startTime)) * 100;
        return {
            hasGoal: true,
            startDosage: user.taperStartDosage,
            targetDosage: user.taperTargetDosage,
            currentAvgDosage: parseFloat(currentAvgDosage.toFixed(3)),
            progressPercentage: Math.max(0, Math.min(100, parseFloat(progressPercentage.toFixed(1)))),
            timeProgress: Math.max(0, Math.min(100, parseFloat(timeProgress.toFixed(1)))),
            daysElapsed: Math.floor((currentTime - startTime) / (1000 * 60 * 60 * 24)),
            daysTotal: Math.floor((endTime - startTime) / (1000 * 60 * 60 * 24)),
            daysRemaining: Math.max(0, Math.floor((endTime - currentTime) / (1000 * 60 * 60 * 24))),
            startDate: user.taperStartDate,
            targetDate: user.taperTargetDate,
            notes: user.taperNotes,
            onTrack: progressPercentage >= timeProgress - 10
        };
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