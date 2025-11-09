import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BenzosEntry } from './benzos.entity';
import {User} from "./auth/user.entity";
import {AccessToken} from "./access-token.entity";

@Injectable()
export class BenzosService {
    constructor(
        @InjectRepository(BenzosEntry)
        private benzosEntryRepository: Repository<BenzosEntry>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @InjectRepository(AccessToken)
        private tokenRepo: Repository<AccessToken>
    ) {}

    async verifyToken(token: string): Promise<boolean> {
        const record = await this.tokenRepo.findOne({ where: { token } });
        return !!record;
    }

    async changeName(newName: string, userId: number) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        user.userName = newName;
        return this.userRepo.save(user);
    }

    async addEntry(data: Partial<BenzosEntry>, userId: number): Promise<BenzosEntry> {
        if (data.takenAt) {
            data.takenAt = new Date(data.takenAt);
        }

        const entry = this.benzosEntryRepository.create({
            ...data,
            user: { id: userId },
        });

        return this.benzosEntryRepository.save(entry);
    }

    async getAllEntries(userId: number): Promise<BenzosEntry[]> {
        return this.benzosEntryRepository.find({
            where: { user: { id: userId } },
            order: { takenAt: 'DESC' },
        });
    }

    async getBetweenDates(from: string, to: string, userId: number): Promise<BenzosEntry[]> {
        return this.benzosEntryRepository
            .createQueryBuilder('entry')
            .where('entry.takenAt BETWEEN :from AND :to', { from, to })
            .andWhere('entry.userId = :userId', { userId })
            .orderBy('entry.takenAt', 'DESC')
            .getMany();
    }

    async deleteOne(id: number, userId: number): Promise<void> {
        await this.benzosEntryRepository.delete({ id, user: { id: userId } });
    }

    async deleteMany(ids: number[], userId: number): Promise<void> {
        await this.benzosEntryRepository
            .createQueryBuilder()
            .delete()
            .from(BenzosEntry)
            .whereInIds(ids)
            .andWhere('userId = :userId', { userId })
            .execute();
    }

    async updateOne(id: number, data: Partial<BenzosEntry>, userId: number): Promise<void> {
        await this.benzosEntryRepository.update({ id, user: { id: userId } }, data);
    }

    async changeBenzosType(newBenzosType: string, userId: number) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        user.benzosType = newBenzosType;
        return this.userRepo.save(user);
    }

    // Tapering Goal Methods
    async setTaperingGoal(goalData: {
        startDosage: number;
        targetDosage: number;
        startDate: Date;
        targetDate: Date;
        notes?: string;
    }, userId: number) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        user.taperStartDosage = goalData.startDosage;
        user.taperTargetDosage = goalData.targetDosage;
        user.taperStartDate = goalData.startDate;
        user.taperTargetDate = goalData.targetDate;
        user.taperNotes = goalData.notes || null;
        user.taperGoalActive = true;

        return this.userRepo.save(user);
    }

    async getTaperingGoal(userId: number) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        return {
            startDosage: user.taperStartDosage,
            targetDosage: user.taperTargetDosage,
            startDate: user.taperStartDate,
            targetDate: user.taperTargetDate,
            notes: user.taperNotes,
            isActive: user.taperGoalActive
        };
    }

    async updateTaperingGoal(goalData: Partial<{
        startDosage: number;
        targetDosage: number;
        startDate: Date;
        targetDate: Date;
        notes: string;
    }>, userId: number) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        if (goalData.startDosage !== undefined) user.taperStartDosage = goalData.startDosage;
        if (goalData.targetDosage !== undefined) user.taperTargetDosage = goalData.targetDosage;
        if (goalData.startDate !== undefined) user.taperStartDate = goalData.startDate;
        if (goalData.targetDate !== undefined) user.taperTargetDate = goalData.targetDate;
        if (goalData.notes !== undefined) user.taperNotes = goalData.notes;

        return this.userRepo.save(user);
    }

    async deactivateTaperingGoal(userId: number) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        user.taperGoalActive = false;
        
        // Clear all tapering goal data to prevent issues
        user.taperStartDosage = null;
        user.taperTargetDosage = null;
        user.taperStartDate = null;
        user.taperTargetDate = null;
        user.taperNotes = null;
        
        await this.userRepo.save(user);
        
        // Return a simple success response instead of the full user object
        return { success: true, message: 'Tapering goal deleted successfully' };
    }

    async getTaperingProgress(userId: number) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        if (!user.taperGoalActive || !user.taperStartDosage || !user.taperTargetDosage) {
            return { hasGoal: false };
        }

        // Get recent entries to calculate current average dosage
        const recentEntries = await this.benzosEntryRepository
            .createQueryBuilder('entry')
            .where('entry.userId = :userId', { userId })
            .orderBy('entry.takenAt', 'DESC')
            .limit(14) // Last 14 entries for average
            .getMany();

        let currentAvgDosage = 0;
        if (recentEntries.length > 0) {
            const totalDosage = recentEntries.reduce((sum, entry) => sum + (entry.dosageMg || 0), 0);
            currentAvgDosage = totalDosage / recentEntries.length;
        }

        const totalReduction = user.taperStartDosage - user.taperTargetDosage;
        const currentReduction = user.taperStartDosage - currentAvgDosage;
        const progressPercentage = totalReduction > 0 ? (currentReduction / totalReduction) * 100 : 0;

        // Calculate time progress
        const now = new Date();
        const startTime = new Date(user.taperStartDate!).getTime();
        const endTime = new Date(user.taperTargetDate!).getTime();
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
            onTrack: progressPercentage >= timeProgress - 10 // Within 10% tolerance
        };
    }

    async getEnhancedAnalytics(userId: number) {
        const entries = await this.getAllEntries(userId);

        if (entries.length === 0) {
            return { hasData: false };
        }

        // Helper function to get entries from N days ago
        const getEntriesFromDaysAgo = (days: number) => {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            return entries.filter(e => e.takenAt && new Date(e.takenAt).getTime() >= cutoffDate.getTime());
        };

        // Get time-period entries
        const thisWeek = getEntriesFromDaysAgo(7);
        const lastWeek = entries.filter(e => {
            if (!e.takenAt) return false;
            const date = new Date(e.takenAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            return date >= twoWeeksAgo && date < weekAgo;
        });

        const thisMonth = getEntriesFromDaysAgo(30);
        const lastMonth = entries.filter(e => {
            if (!e.takenAt) return false;
            const date = new Date(e.takenAt);
            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - 30);
            const twoMonthsAgo = new Date();
            twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
            return date >= twoMonthsAgo && date < monthAgo;
        });

        // Calculate averages
        const calcAvg = (arr: BenzosEntry[]) => 
            arr.length ? arr.reduce((sum, e) => sum + (e.dosageMg || 0), 0) / arr.length : 0;

        const thisWeekAvg = calcAvg(thisWeek);
        const lastWeekAvg = calcAvg(lastWeek);
        const thisMonthAvg = calcAvg(thisMonth);
        const lastMonthAvg = calcAvg(lastMonth);

        // Calculate trends
        const weekTrend = lastWeekAvg > 0 ? ((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100 : 0;
        const monthTrend = lastMonthAvg > 0 ? ((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100 : 0;

        // Consistency score (using coefficient of variation)
        const allDosages = entries.map(e => e.dosageMg || 0).filter(d => d > 0);
        const mean = calcAvg(entries);
        const variance = allDosages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / entries.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;
        const consistencyScore = Math.max(0, Math.min(100, 100 - coefficientOfVariation));

        // Time of day patterns
        const timePatterns = {
            morning: 0,    // 6-12
            afternoon: 0,  // 12-18
            evening: 0,    // 18-24
            night: 0       // 0-6
        };

        entries.forEach(e => {
            if (!e.takenAt) return;
            const hour = new Date(e.takenAt).getHours();
            if (hour >= 6 && hour < 12) timePatterns.morning++;
            else if (hour >= 12 && hour < 18) timePatterns.afternoon++;
            else if (hour >= 18 && hour < 24) timePatterns.evening++;
            else timePatterns.night++;
        });

        const total = entries.length;
        const timePercentages = {
            morning: ((timePatterns.morning / total) * 100).toFixed(0),
            afternoon: ((timePatterns.afternoon / total) * 100).toFixed(0),
            evening: ((timePatterns.evening / total) * 100).toFixed(0),
            night: ((timePatterns.night / total) * 100).toFixed(0)
        };

        // Find peak time
        const maxCount = Math.max(...Object.values(timePatterns));
        const peakTime = Object.keys(timePatterns).find(
            key => timePatterns[key as keyof typeof timePatterns] === maxCount
        );

        // Calculate longest streak without medication
        const sortedEntries = [...entries]
            .filter(e => e.takenAt)
            .sort((a, b) => 
                new Date(a.takenAt!).getTime() - new Date(b.takenAt!).getTime()
            );

        let longestGap = 0;
        for (let i = 1; i < sortedEntries.length; i++) {
            if (!sortedEntries[i].takenAt || !sortedEntries[i - 1].takenAt) continue;
            const gap = new Date(sortedEntries[i].takenAt!).getTime() - 
                       new Date(sortedEntries[i - 1].takenAt!).getTime();
            if (gap > longestGap) longestGap = gap;
        }

        // Current streak (time since last dose)
        const now = new Date();
        const lastEntry = sortedEntries[sortedEntries.length - 1];
        const lastDose = lastEntry && lastEntry.takenAt ? new Date(lastEntry.takenAt) : now;
        const currentStreak = now.getTime() - lastDose.getTime();

        // Dosage distribution (find most common dosages)
        const dosageFrequency: { [key: string]: number } = {};
        entries.forEach(e => {
            if (!e.dosageMg) return;
            const rounded = e.dosageMg.toFixed(2);
            dosageFrequency[rounded] = (dosageFrequency[rounded] || 0) + 1;
        });

        const sortedDosages = Object.entries(dosageFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([dosage, count]) => ({
                dosage: parseFloat(dosage),
                count,
                percentage: ((count / total) * 100).toFixed(0)
            }));

        // Calculate median
        const sortedDosageValues = [...allDosages].sort((a, b) => a - b);
        const median = sortedDosageValues.length % 2 === 0
            ? (sortedDosageValues[sortedDosageValues.length / 2 - 1] + 
               sortedDosageValues[sortedDosageValues.length / 2]) / 2
            : sortedDosageValues[Math.floor(sortedDosageValues.length / 2)];

        return {
            hasData: true,
            trends: {
                weekTrend: parseFloat(weekTrend.toFixed(1)),
                monthTrend: parseFloat(monthTrend.toFixed(1)),
                thisWeekAvg: parseFloat(thisWeekAvg.toFixed(3)),
                lastWeekAvg: parseFloat(lastWeekAvg.toFixed(3)),
                thisMonthAvg: parseFloat(thisMonthAvg.toFixed(3)),
                lastMonthAvg: parseFloat(lastMonthAvg.toFixed(3))
            },
            consistency: {
                score: parseFloat(consistencyScore.toFixed(0)),
                stdDev: parseFloat(stdDev.toFixed(3)),
                coefficientOfVariation: parseFloat(coefficientOfVariation.toFixed(1))
            },
            timePatterns: {
                percentages: timePercentages,
                counts: timePatterns,
                peakTime
            },
            streaks: {
                longestGapMs: longestGap,
                longestGapDays: parseFloat((longestGap / (1000 * 60 * 60 * 24)).toFixed(1)),
                longestGapHours: parseFloat((longestGap / (1000 * 60 * 60)).toFixed(1)),
                currentStreakMs: currentStreak,
                currentStreakDays: parseFloat((currentStreak / (1000 * 60 * 60 * 24)).toFixed(1)),
                currentStreakHours: parseFloat((currentStreak / (1000 * 60 * 60)).toFixed(1))
            },
            distribution: {
                mostCommon: sortedDosages,
                median: parseFloat(median.toFixed(3)),
                mean: parseFloat(mean.toFixed(3)),
                min: Math.min(...allDosages),
                max: Math.max(...allDosages)
            }
        };
    }
}
