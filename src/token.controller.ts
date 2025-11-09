import {
    Body,
    Controller,
    Post,
} from '@nestjs/common';
import { BenzosService } from './benzos.service';


@Controller('token')
export class TokenController {
    constructor(private readonly benzosService: BenzosService) {}

    @Post('verify-token')
    async verifyToken(@Body() body: { token: string }) {
        const valid = await this.benzosService.verifyToken(body.token);
        return { valid };
    }
}
